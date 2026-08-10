package com.faeiq.ClothNCare.pricelist.repository;

import com.faeiq.ClothNCare.pricelist.entity.PriceListEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PriceListEntryRepository extends JpaRepository<PriceListEntry, String> {

    List<PriceListEntry> findAllByPriceListIdOrderByItemNameAsc(String priceListId);

    void deleteByPriceListId(String priceListId);
}
