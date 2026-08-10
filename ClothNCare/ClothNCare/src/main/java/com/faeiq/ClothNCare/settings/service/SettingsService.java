package com.faeiq.ClothNCare.settings.service;

import com.faeiq.ClothNCare.settings.dto.SettingsDTO;
import com.faeiq.ClothNCare.settings.entity.AppSettings;
import com.faeiq.ClothNCare.settings.repository.AppSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SettingsService {

    private final AppSettingsRepository settingsRepository;

    @Transactional
    public AppSettings getSettings() {
        return settingsRepository.findById(1L)
                .orElseGet(() -> settingsRepository.save(new AppSettings()));
    }

    @Transactional
    public AppSettings updateSettings(SettingsDTO dto) {
        AppSettings settings = getSettings();
        settings.setBusinessName(dto.getBusinessName() == null ? settings.getBusinessName() : dto.getBusinessName());
        settings.setTagline(dto.getTagline() == null ? settings.getTagline() : dto.getTagline());
        settings.setPhone(dto.getPhone() == null ? settings.getPhone() : dto.getPhone());
        settings.setEmail(dto.getEmail() == null ? settings.getEmail() : dto.getEmail());
        settings.setAddress(dto.getAddress() == null ? settings.getAddress() : dto.getAddress());
        settings.setCurrencySymbol(dto.getCurrencySymbol() == null ? settings.getCurrencySymbol() : dto.getCurrencySymbol());
        settings.setCurrencyCode(dto.getCurrencyCode() == null ? settings.getCurrencyCode() : dto.getCurrencyCode());
        settings.setTaxRate(dto.getTaxRate() == null ? settings.getTaxRate() : dto.getTaxRate());
        settings.setInvoiceFooter(dto.getInvoiceFooter() == null ? settings.getInvoiceFooter() : dto.getInvoiceFooter());
        settings.setTermsAndConditions(dto.getTermsAndConditions() == null
                ? settings.getTermsAndConditions() : dto.getTermsAndConditions());
        return settingsRepository.save(settings);
    }

    @Transactional
    public String nextInvoiceNumber() {
        AppSettings settings = getSettings();
        settings.setInvoiceCounter(settings.getInvoiceCounter() + 1);
        settingsRepository.save(settings);
        return String.format("INV-%d-%06d", java.time.LocalDate.now().getYear(), settings.getInvoiceCounter());
    }
}
