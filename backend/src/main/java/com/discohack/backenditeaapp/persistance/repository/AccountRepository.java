package com.discohack.backenditeaapp.persistance.repository;

import com.discohack.backenditeaapp.persistance.entities.AccountEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccountRepository extends JpaRepository<AccountEntity, String> {
    List<AccountEntity> findByProvider(String provider);
}
