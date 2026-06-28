package com.trello.backend.controller;

import com.trello.backend.dto.ListRequest;
import com.trello.backend.entity.ListEntity;
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
@RequestMapping("/api/lists")
public class ListController {

    private final ListRepository listRepository;

    public ListController(ListRepository listRepository) {
        this.listRepository = listRepository;
    }

    @GetMapping
    public List<ListEntity> getAll() {
        return listRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<ListEntity> create(@RequestBody ListRequest request) {
        if (request.title() == null || request.title().isBlank() || request.title().length() > 50) {
            return ResponseEntity.badRequest().build();
        }
        ListEntity list = new ListEntity();
        list.setTitle(request.title());
        list.setDisplayOrder(listRepository.findMaxDisplayOrder() + 1);
        return ResponseEntity.ok(listRepository.save(list));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ListEntity> rename(@PathVariable Long id, @RequestBody ListRequest request) {
        return listRepository.findById(id)
                .map(list -> {
                    if (request.title() != null && !request.title().isBlank() && request.title().length() <= 50) {
                        list.setTitle(request.title());
                    }
                    return ResponseEntity.ok(listRepository.save(list));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!listRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        listRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
