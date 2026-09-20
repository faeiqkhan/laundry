package com.faeiq.ClothNCare.orders.entity;

import com.faeiq.ClothNCare.customer.entity.Customer;
import com.faeiq.ClothNCare.user.entity.Users;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Data
public class Orders {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @ManyToOne
    @JoinColumn(name = "created_by_user_id")
    private Users createdBy;

    @Enumerated(EnumType.STRING)
    private Status status= Status.RECEIVED;

    @OneToMany(mappedBy = "orders", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 100)
    private List<OrdersItems> items;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    @BatchSize(size = 100)
    private List<Payment> payments;

    private BigDecimal total_price;

    private BigDecimal discount = BigDecimal.ZERO;

    private BigDecimal additional_charges = BigDecimal.ZERO;

    private BigDecimal tax_amount = BigDecimal.ZERO;

    private BigDecimal paid_amount = BigDecimal.ZERO;

    private String invoice_number;

    private LocalDate expected_delivery_date;

    private LocalDateTime created_at;

    public BigDecimal getBalanceDue() {
        BigDecimal paid = paid_amount == null ? BigDecimal.ZERO : paid_amount;
        BigDecimal total = total_price == null ? BigDecimal.ZERO : total_price;
        return total.subtract(paid).max(BigDecimal.ZERO);
    }
}
