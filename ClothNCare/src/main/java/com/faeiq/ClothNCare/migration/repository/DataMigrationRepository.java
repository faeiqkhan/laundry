package com.faeiq.ClothNCare.migration.repository;

import com.faeiq.ClothNCare.migration.entity.DataMigration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DataMigrationRepository extends JpaRepository<DataMigration, String> {

    Optional<DataMigration> findBySourceSystemAndSourceTypeAndSourceReference(
            String sourceSystem, String sourceType, String sourceReference);

    long countBySourceType(String sourceType);
}