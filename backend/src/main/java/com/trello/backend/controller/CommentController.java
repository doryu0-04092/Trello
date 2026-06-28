package com.trello.backend.controller;

import com.trello.backend.dto.CommentRequest;
import com.trello.backend.entity.CardEntity;
import com.trello.backend.entity.CommentEntity;
import com.trello.backend.repository.CardRepository;
import com.trello.backend.repository.CommentRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cards/{cardId}/comments")
public class CommentController {

    private final CommentRepository commentRepository;
    private final CardRepository cardRepository;

    public CommentController(CommentRepository commentRepository, CardRepository cardRepository) {
        this.commentRepository = commentRepository;
        this.cardRepository = cardRepository;
    }

    @GetMapping
    public ResponseEntity<List<CommentEntity>> getAll(@PathVariable Long cardId) {
        return cardRepository.findById(cardId)
                .map(card -> ResponseEntity.ok(card.getComments()))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<CommentEntity> create(@PathVariable Long cardId, @RequestBody CommentRequest request) {
        if (request.text() == null || request.text().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        CardEntity card = cardRepository.findById(cardId).orElse(null);
        if (card == null) {
            return ResponseEntity.notFound().build();
        }
        CommentEntity comment = new CommentEntity();
        comment.setText(request.text());
        comment.setCreatedAt(LocalDateTime.now());
        comment.setCard(card);
        return ResponseEntity.ok(commentRepository.save(comment));
    }
}
