package com.faeiq.ClothNCare.settings.repository;

import com.faeiq.ClothNCare.settings.entity.AppSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppSettingsRepository extends JpaRepository<AppSettings, Long> {
}
