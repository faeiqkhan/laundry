package com.faeiq.ClothNCare.storage.repository;

import com.faeiq.ClothNCare.storage.entity.StorageBag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StorageBagRepository extends JpaRepository<StorageBag, String> {

    List<StorageBag> findAllByOrderByBagNumberAsc();

    Optional<StorageBag> findByBagNumberIgnoreCase(String bagNumber);
}
