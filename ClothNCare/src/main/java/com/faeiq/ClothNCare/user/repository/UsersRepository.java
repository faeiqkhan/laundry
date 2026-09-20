package com.faeiq.ClothNCare.user.repository;

import com.faeiq.ClothNCare.user.entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsersRepository extends JpaRepository<Users,String> {
    public Users findByEmail(String email);
}
