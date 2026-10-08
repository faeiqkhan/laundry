package com.faeiq.ClothNCare.customer.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.BatchSize;

import java.time.LocalDateTime;

@Entity
@Table(indexes = {
        @Index(name = "idx_customers_phone", columnList = "phone"),
        @Index(name = "idx_customers_email", columnList = "email")
})
@Data
@BatchSize(size = 100)
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;

    private String phone;

    private String email;

    private String address;

    private String notes;

    private LocalDateTime created_at;

}
