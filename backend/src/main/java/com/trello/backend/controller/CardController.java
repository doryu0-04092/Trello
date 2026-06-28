package com.trello.backend.controller;

import com.trello.backend.dto.CardRequest;
import com.trello.backend.entity.CardEntity;
import com.trello.backend.entity.ListEntity;
import com.trello.backend.repository.CardRepository;
import com.trello.backend.repository.ListRepository;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class CardController {

    private final CardRepository cardRepository;
    private final ListRepository listRepository;

    public CardController(CardRepository cardRepository, ListRepository listRepository) {
        this.cardRepository = cardRepository;
        this.listRepository = listRepository;
    }

    @GetMapping("/lists/{listId}/cards")
    public ResponseEntity<List<CardEntity>> getCardsByList(@PathVariable Long listId) {
        return listRepository.findById(listId)
                .map(list -> ResponseEntity.ok(list.getCards()))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/lists/{listId}/cards")
    public ResponseEntity<CardEntity> create(@PathVariable Long listId, @RequestBody CardRequest request) {
        if (request.text() == null || request.text().isBlank() || request.text().length() > 200) {
            return ResponseEntity.badRequest().build();
        }
        ListEntity list = listRepository.findById(listId).orElse(null);
        if (list == null) {
            return ResponseEntity.notFound().build();
        }
        CardEntity card = new CardEntity();
        card.setText(request.text());
        card.setList(list);
        card.setDisplayOrder(cardRepository.findMaxDisplayOrderByListId(listId) + 1);
        return ResponseEntity.ok(cardRepository.save(card));
    }

    @PutMapping("/cards/{id}")
    public ResponseEntity<CardEntity> update(@PathVariable Long id, @RequestBody CardRequest request) {
        return cardRepository.findById(id)
                .map(card -> {
                    if (request.text() != null && !request.text().isBlank() && request.text().length() <= 200) {
                        card.setText(request.text());
                    }
                    card.setDueDate(request.dueDate());
                    card.setPriority(request.priority());
                    return ResponseEntity.ok(cardRepository.save(card));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/cards/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!cardRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        cardRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
