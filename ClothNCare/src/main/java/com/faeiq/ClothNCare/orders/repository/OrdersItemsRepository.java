package com.faeiq.ClothNCare.orders.repository;

import com.faeiq.ClothNCare.orders.entity.OrdersItems;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrdersItemsRepository extends JpaRepository<OrdersItems,String> {
}
