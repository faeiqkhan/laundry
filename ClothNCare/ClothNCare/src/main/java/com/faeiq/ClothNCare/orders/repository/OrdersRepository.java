package com.faeiq.ClothNCare.orders.repository;

import com.faeiq.ClothNCare.orders.entity.Orders;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrdersRepository extends JpaRepository<Orders, String>, JpaSpecificationExecutor<Orders> {

    List<Orders> findByCustomerId(String customerId);

    @Query("SELECT o FROM Orders o WHERE o.invoice_number = :invoiceNumber")
    Optional<Orders> findByInvoice_number(@Param("invoiceNumber") String invoiceNumber);

    @Query("SELECT COUNT(o) FROM Orders o "
            + "WHERE o.status NOT IN (com.faeiq.ClothNCare.orders.entity.Status.DELIVERED, "
            + "com.faeiq.ClothNCare.orders.entity.Status.CANCELLED)")
    long countActive();

    @Query("SELECT COUNT(o) FROM Orders o "
            + "WHERE o.status <> com.faeiq.ClothNCare.orders.entity.Status.CANCELLED "
            + "AND COALESCE(o.total_price, 0) > COALESCE(o.paid_amount, 0)")
    long countWithOutstanding();
}