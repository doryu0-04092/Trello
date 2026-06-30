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
class ListControllerTest {

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
    void getAll_includesInsertedListWithItsCards() throws Exception {
        ListEntity list = new ListEntity();
        list.setTitle("テストリスト");
        list.setDisplayOrder(listRepository.findMaxDisplayOrder() + 1);
        list = listRepository.save(list);
        Long listId = list.getId();

        CardEntity card = new CardEntity();
        card.setText("テストカード");
        card.setList(list);
        card.setDisplayOrder(0);
        cardRepository.save(card);

        // 永続化コンテキストをクリアし、GETがDBから新たに取得することを保証する
        entityManager.flush();
        entityManager.clear();

        String body = mockMvc.perform(get("/api/lists"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        List<ListEntity> lists = objectMapper.readValue(body, new TypeReference<List<ListEntity>>() {});

        ListEntity found = lists.stream()
                .filter(l -> l.getId().equals(listId))
                .findFirst()
                .orElseThrow(() -> new AssertionError("投入したリストがレスポンスに含まれていない"));

        assertThat(found.getTitle()).isEqualTo("テストリスト");
        assertThat(found.getCards()).hasSize(1);
        assertThat(found.getCards().get(0).getText()).isEqualTo("テストカード");
    }

    @Test
    void getAll_includesListWithEmptyCardsWhenNoCardsAdded() throws Exception {
        ListEntity list = new ListEntity();
        list.setTitle("カードなしリスト");
        list.setDisplayOrder(listRepository.findMaxDisplayOrder() + 1);
        list = listRepository.save(list);
        Long listId = list.getId();

        entityManager.flush();
        entityManager.clear();

        String body = mockMvc.perform(get("/api/lists"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        List<ListEntity> lists = objectMapper.readValue(body, new TypeReference<List<ListEntity>>() {});

        ListEntity found = lists.stream()
                .filter(l -> l.getId().equals(listId))
                .findFirst()
                .orElseThrow(() -> new AssertionError("投入したリストがレスポンスに含まれていない"));

        assertThat(found.getCards()).isEmpty();
    }
}
