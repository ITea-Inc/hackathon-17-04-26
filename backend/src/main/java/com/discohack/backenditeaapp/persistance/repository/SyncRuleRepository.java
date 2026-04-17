package com.discohack.backenditeaapp.persistance.repository;

import com.discohack.backenditeaapp.domain.SyncPolicy;
import com.discohack.backenditeaapp.persistance.entities.SyncRuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SyncRuleRepository extends JpaRepository<SyncRuleEntity, String> {

    /** Все правила для аккаунта, отсортированные по приоритету (наивысший первый). */
    List<SyncRuleEntity> findByAccountIdOrderByPriorityDesc(String accountId);

    /** Найти правило по аккаунту и точному пути. */
    Optional<SyncRuleEntity> findByAccountIdAndPathPattern(String accountId, String pathPattern);

    /** Удалить все правила аккаунта (при удалении аккаунта). */
    void deleteByAccountId(String accountId);

    /** Все правила с заданной политикой — используется планировщиком. */
    List<SyncRuleEntity> findByPolicy(SyncPolicy policy);
}
