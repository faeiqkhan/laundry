package com.faeiq.ClothNCare.expensehead.repository;

import com.faeiq.ClothNCare.expensehead.entity.ExpenseHead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExpenseHeadRepository extends JpaRepository<ExpenseHead, String> {

    List<ExpenseHead> findAllByOrderByNameAsc();
}
