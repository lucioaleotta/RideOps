package com.rideops.fleet.application;

import com.rideops.fleet.adapters.out.VehicleDeadlineOccurrenceEntity;
import com.rideops.fleet.adapters.out.VehicleDeadlineOccurrenceRepository;
import com.rideops.fleet.adapters.out.VehicleDeadlinePlanEntity;
import com.rideops.fleet.adapters.out.VehicleDeadlinePlanRepository;
import com.rideops.fleet.adapters.out.VehicleEntity;
import com.rideops.fleet.adapters.out.VehicleRepository;
import com.rideops.fleet.domain.DeadlineStatus;
import com.rideops.fleet.domain.DeadlineType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
public class VehicleManagementService {

    private final VehicleRepository vehicleRepository;
    private final VehicleDeadlineOccurrenceRepository occurrenceRepository;
    private final VehicleDeadlinePlanRepository planRepository;
    private final ApplicationEventPublisher eventPublisher;

    public VehicleManagementService(VehicleRepository vehicleRepository,
                                    VehicleDeadlineOccurrenceRepository occurrenceRepository,
                                    VehicleDeadlinePlanRepository planRepository,
                                    ApplicationEventPublisher eventPublisher) {
        this.vehicleRepository = vehicleRepository;
        this.occurrenceRepository = occurrenceRepository;
        this.planRepository = planRepository;
        this.eventPublisher = eventPublisher;
    }

    public VehicleDetailDto getVehicleDetail(Long vehicleId, int withinDays) {
        VehicleEntity vehicle = findVehicle(vehicleId);
        List<VehicleDeadlineOccurrenceDto> occurrences = occurrenceRepository.findAllByVehicleIdOrderByDueDateDesc(vehicleId)
            .stream()
            .map(this::toOccurrenceDto)
            .toList();

        LocalDate today = LocalDate.now();
        LocalDate upcomingTo = today.plusDays(Math.max(1, withinDays));

        int upcomingCount = (int) occurrences.stream()
            .filter(item -> isOpenStatus(item.status()))
            .filter(item -> !item.dueDate().isBefore(today) && !item.dueDate().isAfter(upcomingTo))
            .count();

        int overdueCount = (int) occurrences.stream()
            .filter(item -> isOpenStatus(item.status()))
            .filter(item -> item.dueDate().isBefore(today))
            .count();

        List<VehicleDeadlinePlanDto> plans = planRepository.findAllByVehicleIdOrderByCreatedAtDesc(vehicleId)
            .stream()
            .map(this::toPlanDto)
            .toList();

        VehicleDto vehicleDto = new VehicleDto(
            vehicle.getId(),
            vehicle.getPlate(),
            vehicle.getSeats(),
            vehicle.getType(),
            vehicle.getNotes(),
            vehicle.getCreatedAt(),
            vehicle.getUpdatedAt()
        );

        return new VehicleDetailDto(vehicleDto, upcomingCount, overdueCount, occurrences, plans);
    }

    public VehicleDeadlineOccurrenceDto addOccurrence(Long vehicleId,
                                                      Long planId,
                                                      DeadlineType type,
                                                      String title,
                                                      String description,
                                                      LocalDate dueDate,
                                                      DeadlineStatus status,
                                                      BigDecimal cost,
                                                      String currency,
                                                      String notes,
                                                      LocalDate paymentDate,
                                                      LocalDate executionDate) {
        VehicleEntity vehicle = findVehicle(vehicleId);
        VehicleDeadlinePlanEntity plan = planId == null ? null : findPlan(planId);

        if (plan != null && !plan.getVehicle().getId().equals(vehicleId)) {
            throw new FleetValidationException("Plan does not belong to selected vehicle");
        }

        validateOccurrence(type, title, dueDate, status, cost, currency, paymentDate, executionDate);

        VehicleDeadlineOccurrenceEntity entity = new VehicleDeadlineOccurrenceEntity();
        entity.setVehicle(vehicle);
        entity.setPlan(plan);
        entity.setType(type);
        entity.setTitle(title.trim());
        entity.setDescription(cleanNullable(description));
        entity.setDueDate(dueDate);
        entity.setStatus(normalizeOpenStatus(status, dueDate));
        entity.setCostAmount(cost);
        entity.setCurrency(normalizeCurrency(currency));
        entity.setNotes(cleanNullable(notes));
        entity.setPaymentDate(paymentDate);
        entity.setExecutionDate(executionDate);

        return toOccurrenceDto(occurrenceRepository.save(entity));
    }

    public VehicleDeadlineOccurrenceDto updateOccurrence(Long occurrenceId,
                                                         DeadlineType type,
                                                         String title,
                                                         String description,
                                                         LocalDate dueDate,
                                                         DeadlineStatus status,
                                                         BigDecimal cost,
                                                         String currency,
                                                         String notes,
                                                         LocalDate paymentDate,
                                                         LocalDate executionDate) {
        VehicleDeadlineOccurrenceEntity entity = findOccurrence(occurrenceId);
        validateOccurrence(type, title, dueDate, status, cost, currency, paymentDate, executionDate);

        entity.setType(type);
        entity.setTitle(title.trim());
        entity.setDescription(cleanNullable(description));
        entity.setDueDate(dueDate);
        entity.setStatus(normalizeOpenStatus(status, dueDate));
        entity.setCostAmount(cost);
        entity.setCurrency(normalizeCurrency(currency));
        entity.setNotes(cleanNullable(notes));
        entity.setPaymentDate(paymentDate);
        entity.setExecutionDate(executionDate);

        return toOccurrenceDto(occurrenceRepository.save(entity));
    }

    public VehicleDeadlineOccurrenceDto markOccurrencePaid(Long occurrenceId, LocalDate paymentDate) {
        VehicleDeadlineOccurrenceEntity entity = findOccurrence(occurrenceId);
        if (!(entity.getType() == DeadlineType.BOLLO || entity.getType() == DeadlineType.ASSICURAZIONE)) {
            throw new FleetValidationException("Only BOLLO and ASSICURAZIONE can be marked as PAGATA");
        }
        if (entity.getStatus() == DeadlineStatus.PAGATA) {
            throw new FleetValidationException("Occurrence already marked as PAGATA");
        }

        entity.setStatus(DeadlineStatus.PAGATA);
        entity.setPaymentDate(paymentDate == null ? LocalDate.now() : paymentDate);
        VehicleDeadlineOccurrenceEntity saved = occurrenceRepository.save(entity);

        if (saved.getPlan() != null && Boolean.TRUE.equals(saved.getPlan().getActive())) {
            generateNextOccurrenceFromPlan(saved.getPlan(), saved.getDueDate());
        }

        eventPublisher.publishEvent(new DeadlineOccurrencePaidEvent(
            saved.getId(),
            saved.getVehicle().getId(),
            saved.getType(),
            saved.getCostAmount(),
            saved.getCurrency(),
            saved.getPaymentDate(),
            "Pagamento scadenza " + saved.getType() + " occorrenza #" + saved.getId()
        ));

        return toOccurrenceDto(saved);
    }

    public VehicleDeadlineOccurrenceDto markOccurrenceCompleted(Long occurrenceId, LocalDate executionDate) {
        VehicleDeadlineOccurrenceEntity entity = findOccurrence(occurrenceId);
        if (!(entity.getType() == DeadlineType.REVISIONE
            || entity.getType() == DeadlineType.TAGLIANDO
            || entity.getType() == DeadlineType.ALTRO)) {
            throw new FleetValidationException("Only REVISIONE, TAGLIANDO and ALTRO can be marked as ESEGUITA");
        }
        if (entity.getStatus() == DeadlineStatus.ESEGUITA) {
            throw new FleetValidationException("Occurrence already marked as ESEGUITA");
        }

        entity.setStatus(DeadlineStatus.ESEGUITA);
        entity.setExecutionDate(executionDate == null ? LocalDate.now() : executionDate);
        VehicleDeadlineOccurrenceEntity saved = occurrenceRepository.save(entity);

        if (saved.getPlan() != null && Boolean.TRUE.equals(saved.getPlan().getActive())) {
            generateNextOccurrenceFromPlan(saved.getPlan(), saved.getDueDate());
        }

        eventPublisher.publishEvent(new DeadlineOccurrenceCompletedEvent(
            saved.getId(),
            saved.getVehicle().getId(),
            saved.getType(),
            saved.getCostAmount(),
            saved.getCurrency(),
            saved.getExecutionDate(),
            "Esecuzione manutenzione " + saved.getType() + " occorrenza #" + saved.getId()
        ));

        return toOccurrenceDto(saved);
    }

    public VehicleDeadlineOccurrenceDto cancelOccurrence(Long occurrenceId) {
        VehicleDeadlineOccurrenceEntity entity = findOccurrence(occurrenceId);
        entity.setStatus(DeadlineStatus.ANNULLATA);
        return toOccurrenceDto(occurrenceRepository.save(entity));
    }

    public void deleteOccurrence(Long occurrenceId) {
        VehicleDeadlineOccurrenceEntity entity = findOccurrence(occurrenceId);
        occurrenceRepository.delete(entity);
    }

    public VehicleDeadlinePlanDto addPlan(Long vehicleId,
                                          DeadlineType type,
                                          String title,
                                          String description,
                                          Integer recurrenceMonths,
                                          LocalDate nextDueDate,
                                          BigDecimal standardCost,
                                          String currency,
                                          String notes) {
        VehicleEntity vehicle = findVehicle(vehicleId);
        validatePlan(type, title, recurrenceMonths, nextDueDate, standardCost, currency);

        VehicleDeadlinePlanEntity entity = new VehicleDeadlinePlanEntity();
        entity.setVehicle(vehicle);
        entity.setType(type);
        entity.setTitle(title.trim());
        entity.setDescription(cleanNullable(description));
        entity.setRecurrenceMonths(recurrenceMonths);
        entity.setNextDueDate(nextDueDate);
        entity.setStandardCostAmount(standardCost);
        entity.setCurrency(normalizeCurrency(currency));
        entity.setActive(true);
        entity.setNotes(cleanNullable(notes));

        VehicleDeadlinePlanEntity saved = planRepository.save(entity);
        generateOccurrenceForPlanIfMissing(saved, saved.getNextDueDate());
        return toPlanDto(saved);
    }

    public VehicleDeadlinePlanDto updatePlan(Long planId,
                                             DeadlineType type,
                                             String title,
                                             String description,
                                             Integer recurrenceMonths,
                                             LocalDate nextDueDate,
                                             BigDecimal standardCost,
                                             String currency,
                                             String notes) {
        VehicleDeadlinePlanEntity entity = findPlan(planId);
        validatePlan(type, title, recurrenceMonths, nextDueDate, standardCost, currency);

        entity.setType(type);
        entity.setTitle(title.trim());
        entity.setDescription(cleanNullable(description));
        entity.setRecurrenceMonths(recurrenceMonths);
        entity.setNextDueDate(nextDueDate);
        entity.setStandardCostAmount(standardCost);
        entity.setCurrency(normalizeCurrency(currency));
        entity.setNotes(cleanNullable(notes));

        return toPlanDto(planRepository.save(entity));
    }

    public VehicleDeadlinePlanDto deactivatePlan(Long planId) {
        VehicleDeadlinePlanEntity entity = findPlan(planId);
        entity.setActive(false);
        return toPlanDto(planRepository.save(entity));
    }

    public VehicleDeadlinePlanDto reactivatePlan(Long planId) {
        VehicleDeadlinePlanEntity entity = findPlan(planId);
        entity.setActive(true);
        VehicleDeadlinePlanEntity saved = planRepository.save(entity);
        generateOccurrenceForPlanIfMissing(saved, saved.getNextDueDate());
        return toPlanDto(saved);
    }

    public PlanSyncResultDto syncMissingOccurrencesFromActivePlans() {
        List<VehicleDeadlinePlanEntity> allPlans = planRepository.findAll();
        int plansScanned = allPlans.size();
        int plansActive = 0;
        int occurrencesCreated = 0;
        int occurrencesAlreadyPresent = 0;

        for (VehicleDeadlinePlanEntity plan : allPlans) {
            if (!Boolean.TRUE.equals(plan.getActive())) {
                continue;
            }

            plansActive += 1;
            if (occurrenceRepository.existsByPlanIdAndDueDate(plan.getId(), plan.getNextDueDate())) {
                occurrencesAlreadyPresent += 1;
                continue;
            }

            generateOccurrenceForPlanIfMissing(plan, plan.getNextDueDate());
            occurrencesCreated += 1;
        }

        return new PlanSyncResultDto(plansScanned, plansActive, occurrencesCreated, occurrencesAlreadyPresent);
    }

    private void generateNextOccurrenceFromPlan(VehicleDeadlinePlanEntity plan, LocalDate lastDueDate) {
        LocalDate nextDueDate = lastDueDate.plusMonths(plan.getRecurrenceMonths());
        if (nextDueDate.isAfter(plan.getNextDueDate())) {
            plan.setNextDueDate(nextDueDate);
            planRepository.save(plan);
        }
        generateOccurrenceForPlanIfMissing(plan, nextDueDate);
    }

    private void generateOccurrenceForPlanIfMissing(VehicleDeadlinePlanEntity plan, LocalDate dueDate) {
        if (occurrenceRepository.existsByPlanIdAndDueDate(plan.getId(), dueDate)) {
            return;
        }

        VehicleDeadlineOccurrenceEntity occurrence = new VehicleDeadlineOccurrenceEntity();
        occurrence.setVehicle(plan.getVehicle());
        occurrence.setPlan(plan);
        occurrence.setType(plan.getType());
        occurrence.setTitle(plan.getTitle());
        occurrence.setDescription(plan.getDescription());
        occurrence.setDueDate(dueDate);
        occurrence.setStatus(normalizeOpenStatus(DeadlineStatus.DA_ESEGUIRE, dueDate));
        occurrence.setCostAmount(plan.getStandardCostAmount());
        occurrence.setCurrency(plan.getCurrency());
        occurrence.setNotes(plan.getNotes());
        occurrenceRepository.save(occurrence);
    }

    private VehicleEntity findVehicle(Long vehicleId) {
        return vehicleRepository.findById(vehicleId)
            .orElseThrow(() -> new VehicleNotFoundException(vehicleId));
    }

    private VehicleDeadlineOccurrenceEntity findOccurrence(Long occurrenceId) {
        return occurrenceRepository.findById(occurrenceId)
            .orElseThrow(() -> new DeadlineOccurrenceNotFoundException(occurrenceId));
    }

    private VehicleDeadlinePlanEntity findPlan(Long planId) {
        return planRepository.findById(planId)
            .orElseThrow(() -> new DeadlinePlanNotFoundException(planId));
    }

    private void validateOccurrence(DeadlineType type,
                                    String title,
                                    LocalDate dueDate,
                                    DeadlineStatus status,
                                    BigDecimal cost,
                                    String currency,
                                    LocalDate paymentDate,
                                    LocalDate executionDate) {
        if (type == null) {
            throw new FleetValidationException("Occurrence type is required");
        }
        if (title == null || title.trim().isEmpty()) {
            throw new FleetValidationException("Occurrence title is required");
        }
        if (dueDate == null) {
            throw new FleetValidationException("Due date is required");
        }
        if (status == null) {
            throw new FleetValidationException("Occurrence status is required");
        }
        if (cost == null || cost.compareTo(BigDecimal.ZERO) < 0) {
            throw new FleetValidationException("Cost must be zero or positive");
        }
        if (currency == null || currency.trim().length() != 3) {
            throw new FleetValidationException("Currency must be a 3-letter code");
        }

        if (status == DeadlineStatus.PAGATA) {
            if (!(type == DeadlineType.BOLLO || type == DeadlineType.ASSICURAZIONE)) {
                throw new FleetValidationException("Only BOLLO and ASSICURAZIONE can be PAGATA");
            }
            if (paymentDate == null) {
                throw new FleetValidationException("Payment date is required for PAGATA");
            }
        }

        if (status == DeadlineStatus.ESEGUITA) {
            if (!(type == DeadlineType.REVISIONE || type == DeadlineType.TAGLIANDO || type == DeadlineType.ALTRO)) {
                throw new FleetValidationException("Only REVISIONE, TAGLIANDO and ALTRO can be ESEGUITA");
            }
            if (executionDate == null) {
                throw new FleetValidationException("Execution date is required for ESEGUITA");
            }
        }
    }

    private void validatePlan(DeadlineType type,
                              String title,
                              Integer recurrenceMonths,
                              LocalDate nextDueDate,
                              BigDecimal standardCost,
                              String currency) {
        if (type == null) {
            throw new FleetValidationException("Plan type is required");
        }
        if (title == null || title.trim().isEmpty()) {
            throw new FleetValidationException("Plan title is required");
        }
        if (recurrenceMonths == null || recurrenceMonths < 1 || recurrenceMonths > 60) {
            throw new FleetValidationException("Recurrence months must be between 1 and 60");
        }
        if (nextDueDate == null) {
            throw new FleetValidationException("Next due date is required");
        }
        if (standardCost == null || standardCost.compareTo(BigDecimal.ZERO) < 0) {
            throw new FleetValidationException("Standard cost must be zero or positive");
        }
        if (currency == null || currency.trim().length() != 3) {
            throw new FleetValidationException("Currency must be a 3-letter code");
        }
    }

    private VehicleDeadlineOccurrenceDto toOccurrenceDto(VehicleDeadlineOccurrenceEntity entity) {
        return new VehicleDeadlineOccurrenceDto(
            entity.getId(),
            entity.getVehicle().getId(),
            entity.getPlan() != null ? entity.getPlan().getId() : null,
            entity.getType(),
            entity.getTitle(),
            entity.getDescription(),
            entity.getDueDate(),
            resolveDisplayedStatus(entity),
            entity.getCostAmount(),
            entity.getCurrency(),
            entity.getNotes(),
            entity.getPaymentDate(),
            entity.getExecutionDate(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private VehicleDeadlinePlanDto toPlanDto(VehicleDeadlinePlanEntity entity) {
        return new VehicleDeadlinePlanDto(
            entity.getId(),
            entity.getVehicle().getId(),
            entity.getType(),
            entity.getTitle(),
            entity.getDescription(),
            entity.getRecurrenceMonths(),
            entity.getNextDueDate(),
            entity.getStandardCostAmount(),
            entity.getCurrency(),
            entity.getActive(),
            entity.getNotes(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private String cleanNullable(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeCurrency(String currency) {
        return currency.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isOpenStatus(DeadlineStatus status) {
        return status == DeadlineStatus.DA_ESEGUIRE
            || status == DeadlineStatus.IN_SCADENZA
            || status == DeadlineStatus.SCADUTA;
    }

    private DeadlineStatus resolveDisplayedStatus(VehicleDeadlineOccurrenceEntity entity) {
        DeadlineStatus current = entity.getStatus();
        if (current == DeadlineStatus.PAGATA || current == DeadlineStatus.ESEGUITA || current == DeadlineStatus.ANNULLATA) {
            return current;
        }
        return computeOpenStatus(entity.getDueDate());
    }

    private DeadlineStatus normalizeOpenStatus(DeadlineStatus status, LocalDate dueDate) {
        if (status == DeadlineStatus.DA_ESEGUIRE
            || status == DeadlineStatus.IN_SCADENZA
            || status == DeadlineStatus.SCADUTA) {
            return computeOpenStatus(dueDate);
        }
        return status;
    }

    private DeadlineStatus computeOpenStatus(LocalDate dueDate) {
        LocalDate today = LocalDate.now();
        if (dueDate.isBefore(today)) {
            return DeadlineStatus.SCADUTA;
        }
        if (!dueDate.isAfter(today.plusDays(7))) {
            return DeadlineStatus.IN_SCADENZA;
        }
        return DeadlineStatus.DA_ESEGUIRE;
    }
}
