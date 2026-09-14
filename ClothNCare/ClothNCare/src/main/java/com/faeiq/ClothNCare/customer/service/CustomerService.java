package com.faeiq.ClothNCare.customer.service;

import com.faeiq.ClothNCare.common.exception.ConflictException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.customer.dto.CustomerDTO;
import com.faeiq.ClothNCare.customer.dto.CustomerDetailDTO;
import com.faeiq.ClothNCare.customer.dto.CustomerResponseDTO;
import com.faeiq.ClothNCare.customer.dto.CustomerSummaryDTO;
import com.faeiq.ClothNCare.customer.entity.Customer;
import com.faeiq.ClothNCare.customer.repository.CustomerRepository;
import com.faeiq.ClothNCare.messaging.whatsapp.WhatsAppNotifier;
import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.repository.OrdersRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final OrdersRepository ordersRepository;
    private final WhatsAppNotifier whatsAppNotifier;

    @Transactional
    public CustomerResponseDTO createCustomer(CustomerDTO customerDTO) {
        if (customerRepository.findByPhone(customerDTO.getPhone()) != null) {
            throw new ConflictException("Customer with this phone already exists");
        }

        Customer newCustomer = new Customer();
        apply(newCustomer, customerDTO);
        newCustomer.setCreated_at(LocalDateTime.now());

        CustomerResponseDTO response = toResponse(customerRepository.save(newCustomer));
        whatsAppNotifier.notifyCustomerCreated(newCustomer);
        return response;
    }

    @Transactional
    public CustomerResponseDTO updateCustomer(String id, CustomerDTO customerDTO) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        Customer existing = customerRepository.findByPhone(customerDTO.getPhone());
        if (existing != null && !existing.getId().equals(id)) {
            throw new ConflictException("Customer with this phone already exists");
        }

        apply(customer, customerDTO);
        return toResponse(customer);
    }

    @Transactional(readOnly = true)
    public List<CustomerResponseDTO> getAllCustomers() {
        return customerRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<CustomerResponseDTO> getCustomerPage(Pageable pageable, String q) {
        return customerRepository.findAll(buildCustomerFilter(q), pageable)
                .map(this::toResponse);
    }

    private Specification<Customer> buildCustomerFilter(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) {
                return cb.conjunction();
            }
            String term = "%" + q.trim().toLowerCase() + "%";
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.like(cb.lower(root.get("name")), term));
            predicates.add(cb.like(root.get("phone"), term));
            predicates.add(cb.like(cb.lower(root.get("email")), term));
            return cb.or(predicates.toArray(new Predicate[0]));
        };
    }

    @Transactional(readOnly = true)
    public List<CustomerSummaryDTO> getCustomerSummaries() {
        return customerRepository.findAll().stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public CustomerDetailDTO getCustomerDetail(String id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        List<Orders> orders = ordersRepository.findByCustomerId(id);
        BigDecimal totalSpent = orders.stream()
                .filter(o -> o.getTotal_price() != null)
                .map(Orders::getTotal_price)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CustomerDetailDTO(
                customer.getId(),
                customer.getName(),
                customer.getPhone(),
                customer.getEmail(),
                customer.getAddress(),
                customer.getNotes(),
                customer.getCreated_at(),
                orders.size(),
                totalSpent,
                List.of()
        );
    }

    private void apply(Customer customer, CustomerDTO dto) {
        customer.setName(dto.getName());
        customer.setPhone(dto.getPhone());
        customer.setEmail(dto.getEmail());
        customer.setAddress(dto.getAddress());
        customer.setNotes(dto.getNotes());
    }

    private CustomerResponseDTO toResponse(Customer customer) {
        return new CustomerResponseDTO(
                customer.getId(),
                customer.getName(),
                customer.getPhone(),
                customer.getEmail(),
                customer.getAddress(),
                customer.getNotes(),
                customer.getCreated_at()
        );
    }

    private CustomerSummaryDTO toSummary(Customer customer) {
        return new CustomerSummaryDTO(
                customer.getId(),
                customer.getName(),
                customer.getPhone()
        );
    }
}
