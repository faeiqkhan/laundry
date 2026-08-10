package com.faeiq.ClothNCare.orders.repository;

import com.faeiq.ClothNCare.orders.entity.Orders;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrdersRepository extends JpaRepository<Orders,String> {

    List<Orders> findByCustomerId(String customerId);
}
