package com.rideops.accounting.application;

import java.math.BigDecimal;

public record YearlyFinancePointDto(
    int year,
    BigDecimal revenue,
    BigDecimal costs,
    BigDecimal gross,
    BigDecimal net
) {
}
