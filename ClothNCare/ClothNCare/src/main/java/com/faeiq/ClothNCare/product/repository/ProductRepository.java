package com.faeiq.ClothNCare.product.repository;

import com.faeiq.ClothNCare.product.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, String> {

    List<Product> findAllByOrderByNameAsc();
}
