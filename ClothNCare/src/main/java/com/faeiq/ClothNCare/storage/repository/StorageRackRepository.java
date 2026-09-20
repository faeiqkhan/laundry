package com.faeiq.ClothNCare.storage.repository;

import com.faeiq.ClothNCare.storage.entity.StorageRack;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StorageRackRepository extends JpaRepository<StorageRack, String> {

    List<StorageRack> findAllByOrderByNameAsc();

    Optional<StorageRack> findByNameIgnoreCase(String name);
}
