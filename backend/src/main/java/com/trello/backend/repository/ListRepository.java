package com.trello.backend.repository;

import com.trello.backend.entity.ListEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ListRepository extends JpaRepository<ListEntity, Long> {

    @Query("select coalesce(max(l.displayOrder), -1) from ListEntity l")
    int findMaxDisplayOrder();
}
