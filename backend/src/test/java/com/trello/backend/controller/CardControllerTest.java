package com.trello.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trello.backend.entity.CardEntity;
import com.trello.backend.entity.ListEntity;
import com.trello.backend.repository.CardRepository;
import com.trello.backend.repository.ListRepository;
import jakarta.persistence.EntityManager;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * docker-compose で起動した実PostgreSQLに対する統合テスト。
 * 各テストでDBに投入したデータは @Transactional によりテスト終了後にロールバックされる。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Transactional
class CardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ListRepository listRepository;

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void getCardsByList_returnsCardsOfThatListOrderedByDisplayOrder() throws Exception {
        ListEntity list = new ListEntity();
        list.setTitle("カードテスト用リスト");
        list.setDisplayOrder(listRepository.findMaxDisplayOrder() + 1);
        list = listRepository.save(list);

        CardEntity second = new CardEntity();
        second.setText("2番目のカード");
        second.setList(list);
        second.setDisplayOrder(1);
        cardRepository.save(second);

        CardEntity first = new CardEntity();
        first.setText("1番目のカード");
        first.setList(list);
        first.setDisplayOrder(0);
        cardRepository.save(first);

        Long listId = list.getId();
        // 永続化コンテキストをクリアし、GETがDBから新たに取得することを保証する
        entityManager.flush();
        entityManager.clear();

        String body = mockMvc.perform(get("/api/lists/{listId}/cards", listId))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        List<CardEntity> cards = objectMapper.readValue(body, new TypeReference<List<CardEntity>>() {});

        assertThat(cards).hasSize(2);
        assertThat(cards.get(0).getText()).isEqualTo("1番目のカード");
        assertThat(cards.get(1).getText()).isEqualTo("2番目のカード");
    }

    @Test
    void getCardsByList_returnsNotFoundForUnknownList() throws Exception {
        mockMvc.perform(get("/api/lists/{listId}/cards", Long.MAX_VALUE))
                .andExpect(status().isNotFound());
    }
}
