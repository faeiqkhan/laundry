package com.faeiq.ClothNCare.LaundryService.repository;

import com.faeiq.ClothNCare.LaundryService.entity.LaundryService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LaundryServiceRepository extends JpaRepository<LaundryService, String> {

    Optional<LaundryService> findByNameAndProductType(String name, String productType);
}