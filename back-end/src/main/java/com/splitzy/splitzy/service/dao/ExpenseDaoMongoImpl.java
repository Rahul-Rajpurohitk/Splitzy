package com.splitzy.splitzy.service.dao;

import com.splitzy.splitzy.model.Expense;
import com.splitzy.splitzy.model.ExpenseItem;
import com.splitzy.splitzy.model.Participant;
import com.splitzy.splitzy.model.Payer;
import com.splitzy.splitzy.repository.ExpenseRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * MongoDB implementation of ExpenseDao.
 */
@Repository
@Profile("!postgres")
public class ExpenseDaoMongoImpl implements ExpenseDao {

    private final ExpenseRepository expenseRepository;

    public ExpenseDaoMongoImpl(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    @Override
    public Optional<ExpenseDto> findById(String id) {
        return expenseRepository.findById(id).map(this::toDto);
    }

    @Override
    public List<ExpenseDto> findAllByUserInvolvement(String userId, Sort sort) {
        return expenseRepository.findAllByUserInvolvement(userId, sort).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ExpenseDto> findAllByCreatorId(String creatorId, Sort sort) {
        return expenseRepository.findAllByCreatorId(creatorId, sort).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ExpenseDto> findAllByPayer(String userId, Sort sort) {
        return expenseRepository.findAllByPayer(userId, sort).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ExpenseDto> findAllByParticipant(String userId, Sort sort) {
        return expenseRepository.findAllByParticipant(userId, sort).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ExpenseDto> findAllByGroupId(String groupId, Sort sort) {
        return expenseRepository.findAllByGroupId(groupId, sort).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ExpenseDto> findAllByBothUserInvolvement(String userId, String friendId, Sort sort) {
        return expenseRepository.findAllByBothUserInvolvement(userId, friendId, sort).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public ExpenseDto save(ExpenseDto expenseDto) {
        Expense expense = toEntity(expenseDto);
        Expense saved = expenseRepository.save(expense);
        return toDto(saved);
    }

    @Override
    public void deleteById(String id) {
        expenseRepository.deleteById(id);
    }

    // Mapping methods
    private ExpenseDto toDto(Expense expense) {
        ExpenseDto dto = new ExpenseDto();
        dto.setId(expense.getId());
        dto.setDescription(expense.getDescription());
        dto.setTotalAmount(expense.getTotalAmount());
        dto.setDate(expense.getDate());
        dto.setNotes(expense.getNotes());
        dto.setGroupId(expense.getGroupId());
        dto.setGroupName(expense.getGroupName());
        dto.setSplitMethod(expense.getSplitMethod());
        dto.setCreatorId(expense.getCreatorId());
        dto.setCreatorName(expense.getCreatorName());
        dto.setCreatedAt(expense.getCreatedAt());
        dto.setUpdatedAt(expense.getUpdatedAt());
        dto.setTaxRate(expense.getTaxRate());
        dto.setTipRate(expense.getTipRate());

        if (expense.getPayers() != null) {
            dto.setPayers(expense.getPayers().stream()
                    .map(p -> new ExpenseDto.PayerDto(p.getUserId(), p.getPayerName(), p.getPaidAmount()))
                    .collect(Collectors.toList()));
        }

        if (expense.getParticipants() != null) {
            dto.setParticipants(expense.getParticipants().stream()
                    .map(this::participantToDto)
                    .collect(Collectors.toList()));
        }

        if (expense.getItems() != null) {
            dto.setItems(expense.getItems().stream()
                    .map(this::itemToDto)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    private ExpenseDto.ParticipantDto participantToDto(Participant p) {
        ExpenseDto.ParticipantDto dto = new ExpenseDto.ParticipantDto();
        dto.setUserId(p.getUserId());
        dto.setPartName(p.getPartName());
        dto.setPercent(p.getPercent());
        dto.setExact(p.getExact());
        dto.setShares(p.getShares());
        dto.setShare(p.getShare());
        dto.setPaid(p.getPaid());
        dto.setNet(p.getNet());
        return dto;
    }

    private ExpenseDto.ExpenseItemDto itemToDto(ExpenseItem item) {
        ExpenseDto.ExpenseItemDto dto = new ExpenseDto.ExpenseItemDto();
        dto.setName(item.getName());
        dto.setAmount(item.getAmount());
        dto.setUserShares(item.getUserShares());
        return dto;
    }

    private Expense toEntity(ExpenseDto dto) {
        Expense expense = new Expense();
        expense.setId(dto.getId());
        expense.setDescription(dto.getDescription());
        expense.setTotalAmount(dto.getTotalAmount());
        expense.setDate(dto.getDate());
        expense.setNotes(dto.getNotes());
        expense.setGroupId(dto.getGroupId());
        expense.setGroupName(dto.getGroupName());
        expense.setSplitMethod(dto.getSplitMethod());
        expense.setCreatorId(dto.getCreatorId());
        expense.setCreatorName(dto.getCreatorName());
        expense.setCreatedAt(dto.getCreatedAt());
        expense.setUpdatedAt(dto.getUpdatedAt());
        expense.setTaxRate(dto.getTaxRate());
        expense.setTipRate(dto.getTipRate());

        if (dto.getPayers() != null) {
            expense.setPayers(dto.getPayers().stream()
                    .map(p -> {
                        Payer payer = new Payer();
                        payer.setUserId(p.getUserId());
                        payer.setPayerName(p.getPayerName());
                        payer.setPaidAmount(p.getPaidAmount());
                        return payer;
                    })
                    .collect(Collectors.toList()));
        }

        if (dto.getParticipants() != null) {
            expense.setParticipants(dto.getParticipants().stream()
                    .map(this::participantToEntity)
                    .collect(Collectors.toList()));
        }

        if (dto.getItems() != null) {
            expense.setItems(dto.getItems().stream()
                    .map(this::itemToEntity)
                    .collect(Collectors.toList()));
        }

        return expense;
    }

    private Participant participantToEntity(ExpenseDto.ParticipantDto dto) {
        Participant p = new Participant();
        p.setUserId(dto.getUserId());
        p.setPartName(dto.getPartName());
        p.setPercent(dto.getPercent());
        p.setExact(dto.getExact());
        p.setShares(dto.getShares());
        p.setShare(dto.getShare());
        p.setPaid(dto.getPaid());
        p.setNet(dto.getNet());
        return p;
    }

    private ExpenseItem itemToEntity(ExpenseDto.ExpenseItemDto dto) {
        ExpenseItem item = new ExpenseItem();
        item.setName(dto.getName());
        item.setAmount(dto.getAmount());
        item.setUserShares(dto.getUserShares());
        return item;
    }
}

