package com.faeiq.ClothNCare.customer.repository;

import com.faeiq.ClothNCare.customer.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer,String> {

    Customer findByPhone(String phone);

    Customer findByEmail(String email);

}
