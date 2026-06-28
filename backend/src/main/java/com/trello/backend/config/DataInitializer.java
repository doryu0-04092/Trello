package com.trello.backend.config;

import com.trello.backend.entity.ListEntity;
import com.trello.backend.repository.ListRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final ListRepository listRepository;

    public DataInitializer(ListRepository listRepository) {
        this.listRepository = listRepository;
    }

    @Override
    public void run(String... args) {
        if (listRepository.count() > 0) {
            return;
        }
        ListEntity working = new ListEntity();
        working.setTitle("作業中");
        working.setDisplayOrder(0);
        listRepository.save(working);

        ListEntity done = new ListEntity();
        done.setTitle("完了");
        done.setDisplayOrder(1);
        listRepository.save(done);
    }
}
