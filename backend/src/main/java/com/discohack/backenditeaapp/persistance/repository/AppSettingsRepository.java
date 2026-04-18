package com.discohack.backenditeaapp.persistance.repository;

import com.discohack.backenditeaapp.persistance.entities.AppSettingsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface AppSettingsRepository extends JpaRepository<AppSettingsEntity, String> {
}
