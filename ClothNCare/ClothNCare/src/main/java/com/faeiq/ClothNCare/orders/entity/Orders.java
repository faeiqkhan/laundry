package com.faeiq.ClothNCare.orders.entity;

import com.faeiq.ClothNCare.customer.entity.Customer;
import com.faeiq.ClothNCare.user.entity.Users;
import jakarta.persistence.*;
import lombok.Data;

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

    @OneToMany(mappedBy = "orders", cascade = CascadeType.ALL)
    private List<OrdersItems> items;

    private BigDecimal total_price;

    private LocalDate expected_delivery_date;

    private LocalDateTime created_at;

}
