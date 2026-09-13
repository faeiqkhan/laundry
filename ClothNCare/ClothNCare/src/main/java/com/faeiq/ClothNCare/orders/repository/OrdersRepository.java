package com.faeiq.ClothNCare.orders.repository;

import com.faeiq.ClothNCare.orders.entity.Orders;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrdersRepository extends JpaRepository<Orders,String> {

    List<Orders> findByCustomerId(String customerId);

    @Query("SELECT o FROM Orders o WHERE o.invoice_number = :invoiceNumber")
    Optional<Orders> findByInvoice_number(@Param("invoiceNumber") String invoiceNumber);
}
