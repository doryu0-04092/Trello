package com.trello.backend.dto;

import com.trello.backend.entity.Priority;
import java.time.LocalDate;

public record CardRequest(String text, LocalDate dueDate, Priority priority) {
}
