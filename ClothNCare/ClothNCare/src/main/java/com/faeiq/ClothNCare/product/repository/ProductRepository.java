package com.faeiq.ClothNCare.product.repository;

import com.faeiq.ClothNCare.product.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, String> {

    List<Product> findAllByOrderByNameAsc();

    Optional<Product> findByNameIgnoreCase(String name);
}
