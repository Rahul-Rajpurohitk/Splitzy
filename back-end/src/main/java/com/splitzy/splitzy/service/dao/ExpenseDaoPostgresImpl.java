package com.splitzy.splitzy.service.dao;

import com.splitzy.splitzy.entity.ExpenseItemSql;
import com.splitzy.splitzy.entity.ExpenseSql;
import com.splitzy.splitzy.entity.ParticipantSql;
import com.splitzy.splitzy.entity.PayerSql;
import com.splitzy.splitzy.repository.sql.ExpenseSqlRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * PostgreSQL implementation of ExpenseDao.
 */
@Repository
@Profile("postgres")
public class ExpenseDaoPostgresImpl implements ExpenseDao {

    private final ExpenseSqlRepository expenseSqlRepository;

    public ExpenseDaoPostgresImpl(ExpenseSqlRepository expenseSqlRepository) {
        this.expenseSqlRepository = expenseSqlRepository;
    }

    @Override
    public Optional<ExpenseDto> findById(String id) {
        return expenseSqlRepository.findById(id).map(this::toDto);
    }

    @Override
    public List<ExpenseDto> findAllByUserInvolvement(String userId, Sort sort) {
        return expenseSqlRepository.findAllByUserInvolvement(userId, sort).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ExpenseDto> findAllByCreatorId(String creatorId, Sort sort) {
        return expenseSqlRepository.findAllByCreatorId(creatorId, sort).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ExpenseDto> findAllByPayer(String userId, Sort sort) {
        return expenseSqlRepository.findAllByPayer(userId, sort).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ExpenseDto> findAllByParticipant(String userId, Sort sort) {
        return expenseSqlRepository.findAllByParticipant(userId, sort).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ExpenseDto> findAllByGroupId(String groupId, Sort sort) {
        return expenseSqlRepository.findAllByGroupId(groupId, sort).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ExpenseDto> findAllByBothUserInvolvement(String userId, String friendId, Sort sort) {
        return expenseSqlRepository.findAllByBothUserInvolvement(userId, friendId, sort).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public ExpenseDto save(ExpenseDto expenseDto) {
        ExpenseSql expense = toEntity(expenseDto);
        ExpenseSql saved = expenseSqlRepository.save(expense);
        return toDto(saved);
    }

    @Override
    public void deleteById(String id) {
        expenseSqlRepository.deleteById(id);
    }

    // Mapping methods
    private ExpenseDto toDto(ExpenseSql expense) {
        ExpenseDto dto = new ExpenseDto();
        dto.setId(expense.getId());
        dto.setDescription(expense.getDescription());
        dto.setCategory(expense.getCategory());
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

    private ExpenseDto.ParticipantDto participantToDto(ParticipantSql p) {
        ExpenseDto.ParticipantDto dto = new ExpenseDto.ParticipantDto();
        dto.setUserId(p.getUserId());
        dto.setPartName(p.getPartName());
        dto.setShare(p.getShare());
        dto.setPaid(p.getPaid());
        dto.setNet(p.getNet());
        return dto;
    }

    private ExpenseDto.ExpenseItemDto itemToDto(ExpenseItemSql item) {
        ExpenseDto.ExpenseItemDto dto = new ExpenseDto.ExpenseItemDto();
        dto.setId(item.getId());
        dto.setName(item.getName());
        dto.setAmount(item.getAmount());
        dto.setUserShares(item.getUserShares());
        return dto;
    }

    private ExpenseSql toEntity(ExpenseDto dto) {
        ExpenseSql expense = new ExpenseSql();
        expense.setId(dto.getId());
        expense.setDescription(dto.getDescription());
        expense.setCategory(dto.getCategory());
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
                    .map(p -> new PayerSql(p.getUserId(), p.getPayerName(), p.getPaidAmount()))
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

    private ParticipantSql participantToEntity(ExpenseDto.ParticipantDto dto) {
        ParticipantSql p = new ParticipantSql();
        p.setUserId(dto.getUserId());
        p.setPartName(dto.getPartName());
        p.setShare(dto.getShare());
        p.setPaid(dto.getPaid());
        p.setNet(dto.getNet());
        return p;
    }

    private ExpenseItemSql itemToEntity(ExpenseDto.ExpenseItemDto dto) {
        ExpenseItemSql item = new ExpenseItemSql();
        item.setId(dto.getId());
        item.setName(dto.getName());
        item.setAmount(dto.getAmount());
        item.setUserShares(dto.getUserShares());
        return item;
    }
}

