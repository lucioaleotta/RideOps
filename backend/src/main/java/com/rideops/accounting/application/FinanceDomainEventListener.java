package com.rideops.accounting.application;

import com.rideops.fleet.application.DeadlineOccurrenceCompletedEvent;
import com.rideops.fleet.application.DeadlineOccurrencePaidEvent;
import com.rideops.services.application.ServiceClosedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class FinanceDomainEventListener {

    private final AutoCreateTransactionFromClosedServiceUseCase fromClosedServiceUseCase;
    private final AutoCreateTransactionFromPaidDeadlineOccurrenceUseCase fromPaidDeadlineOccurrenceUseCase;
    private final AutoCreateTransactionFromCompletedMaintenanceOccurrenceUseCase fromCompletedOccurrenceUseCase;

    public FinanceDomainEventListener(AutoCreateTransactionFromClosedServiceUseCase fromClosedServiceUseCase,
                                      AutoCreateTransactionFromPaidDeadlineOccurrenceUseCase fromPaidDeadlineOccurrenceUseCase,
                                      AutoCreateTransactionFromCompletedMaintenanceOccurrenceUseCase fromCompletedOccurrenceUseCase) {
        this.fromClosedServiceUseCase = fromClosedServiceUseCase;
        this.fromPaidDeadlineOccurrenceUseCase = fromPaidDeadlineOccurrenceUseCase;
        this.fromCompletedOccurrenceUseCase = fromCompletedOccurrenceUseCase;
    }

    @EventListener
    public void onServiceClosed(ServiceClosedEvent event) {
        fromClosedServiceUseCase.execute(event);
    }

    @EventListener
    public void onOccurrencePaid(DeadlineOccurrencePaidEvent event) {
        fromPaidDeadlineOccurrenceUseCase.execute(event);
    }

    @EventListener
    public void onOccurrenceCompleted(DeadlineOccurrenceCompletedEvent event) {
        fromCompletedOccurrenceUseCase.execute(event);
    }
}
