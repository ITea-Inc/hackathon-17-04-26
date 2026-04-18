package com.discohack.backenditeaapp.persistance.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "app_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppSettingsEntity {

    @Id
    @Column(name = "setting_key", length = 64)
    private String key;

    @Column(name = "setting_value", nullable = false)
    private String value;
}
