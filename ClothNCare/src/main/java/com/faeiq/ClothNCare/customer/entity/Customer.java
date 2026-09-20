package com.faeiq.ClothNCare.customer.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;
import org.hibernate.annotations.BatchSize;

import java.time.LocalDateTime;

@Entity
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
