package com.rideops.accounting.application;

import java.math.BigDecimal;

public record MonthlyFinancePointDto(
    int month,
    BigDecimal revenue,
    BigDecimal costs,
    BigDecimal gross,
    BigDecimal net
) {
}
