package com.faeiq.ClothNCare.pricelist.repository;

import com.faeiq.ClothNCare.pricelist.entity.PriceList;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PriceListRepository extends JpaRepository<PriceList, String> {

    List<PriceList> findAllByOrderByCreatedAtDesc();

    Optional<PriceList> findByNameIgnoreCase(String name);

    List<PriceList> findByActiveTrue();
}
