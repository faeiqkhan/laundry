package com.faeiq.ClothNCare.customer.service;

import com.faeiq.ClothNCare.common.exception.ConflictException;
import com.faeiq.ClothNCare.customer.dto.CustomerDTO;
import com.faeiq.ClothNCare.customer.dto.CustomerResponseDTO;
import com.faeiq.ClothNCare.customer.dto.CustomerSummaryDTO;
import com.faeiq.ClothNCare.customer.entity.Customer;
import com.faeiq.ClothNCare.customer.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;

    @Transactional
    public CustomerResponseDTO createCustomer(CustomerDTO customerDTO) {
        Customer customer = customerRepository.findByPhone(customerDTO.getPhone());

        if (customer != null) {
            throw new ConflictException("Customer already exists");
        }

        Customer newCustomer = new Customer();
        newCustomer.setName(customerDTO.getName());
        newCustomer.setEmail(customerDTO.getEmail());
        newCustomer.setPhone(customerDTO.getPhone());
        newCustomer.setCreated_at(LocalDateTime.now());

        return toResponse(customerRepository.save(newCustomer));
    }

    @Transactional(readOnly = true)
    public List<CustomerResponseDTO> getAllCustomers() {
        return customerRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CustomerSummaryDTO> getCustomerSummaries() {
        return customerRepository.findAll().stream()
                .map(this::toSummary)
                .toList();
    }

    private CustomerResponseDTO toResponse(Customer customer) {
        return new CustomerResponseDTO(
                customer.getId(),
                customer.getName(),
                customer.getPhone(),
                customer.getEmail(),
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
