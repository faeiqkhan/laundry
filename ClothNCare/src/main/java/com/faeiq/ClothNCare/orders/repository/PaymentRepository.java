package com.faeiq.ClothNCare.orders.repository;

import com.faeiq.ClothNCare.orders.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, String> {

    List<Payment> findByPaidAtBetween(LocalDateTime from, LocalDateTime to);
}
