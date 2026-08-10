package com.faeiq.ClothNCare.charge.repository;

import com.faeiq.ClothNCare.charge.entity.ChargeType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChargeTypeRepository extends JpaRepository<ChargeType, String> {

    List<ChargeType> findAllByOrderByNameAsc();
}
