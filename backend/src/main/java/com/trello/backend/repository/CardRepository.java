package com.trello.backend.repository;

import com.trello.backend.entity.CardEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CardRepository extends JpaRepository<CardEntity, Long> {

    @Query("select coalesce(max(c.displayOrder), -1) from CardEntity c where c.list.id = :listId")
    int findMaxDisplayOrderByListId(Long listId);
}
