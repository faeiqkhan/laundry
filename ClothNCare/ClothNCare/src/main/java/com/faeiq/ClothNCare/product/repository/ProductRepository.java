package com.faeiq.ClothNCare.product.repository;

import com.faeiq.ClothNCare.product.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, String> {

    List<Product> findAllByOrderByNameAsc();

    List<Product> findAllByActiveTrueOrderByPriorityAscNameAsc();

    List<Product> findAllByServiceAndActiveTrueOrderByPriorityAscNameAsc(String service);

    Optional<Product> findByNameIgnoreCaseAndServiceIgnoreCaseAndCategoryIgnoreCase(String name, String service, String category);

    Optional<Product> findByNameIgnoreCase(String name);

    @Query("SELECT DISTINCT p.service FROM Product p WHERE p.active = true AND p.service IS NOT NULL ORDER BY p.service")
    List<String> findDistinctActiveServices();
}
