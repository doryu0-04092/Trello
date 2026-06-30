package com.trello.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trello.backend.entity.CardEntity;
import com.trello.backend.entity.CommentEntity;
import com.trello.backend.entity.ListEntity;
import com.trello.backend.repository.CardRepository;
import com.trello.backend.repository.CommentRepository;
import com.trello.backend.repository.ListRepository;
import jakarta.persistence.EntityManager;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
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
class CommentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ListRepository listRepository;

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void getAll_returnsCommentsOfThatCardOrderedByCreatedAt() throws Exception {
        ListEntity list = new ListEntity();
        list.setTitle("コメントテスト用リスト");
        list.setDisplayOrder(listRepository.findMaxDisplayOrder() + 1);
        list = listRepository.save(list);

        CardEntity card = new CardEntity();
        card.setText("コメントテスト用カード");
        card.setList(list);
        card.setDisplayOrder(cardRepository.findMaxDisplayOrderByListId(list.getId()) + 1);
        card = cardRepository.save(card);

        LocalDateTime base = LocalDateTime.now();

        CommentEntity later = new CommentEntity();
        later.setText("後のコメント");
        later.setCreatedAt(base.plusMinutes(1));
        later.setCard(card);
        commentRepository.save(later);

        CommentEntity earlier = new CommentEntity();
        earlier.setText("先のコメント");
        earlier.setCreatedAt(base);
        earlier.setCard(card);
        commentRepository.save(earlier);

        Long cardId = card.getId();
        // 永続化コンテキストをクリアし、GETがDBから新たに取得することを保証する
        entityManager.flush();
        entityManager.clear();

        String body = mockMvc.perform(get("/api/cards/{cardId}/comments", cardId))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        List<CommentEntity> comments = objectMapper.readValue(body, new TypeReference<List<CommentEntity>>() {});

        assertThat(comments).hasSize(2);
        assertThat(comments.get(0).getText()).isEqualTo("先のコメント");
        assertThat(comments.get(1).getText()).isEqualTo("後のコメント");
    }

    @Test
    void getAll_returnsNotFoundForUnknownCard() throws Exception {
        mockMvc.perform(get("/api/cards/{cardId}/comments", Long.MAX_VALUE))
                .andExpect(status().isNotFound());
    }
}
