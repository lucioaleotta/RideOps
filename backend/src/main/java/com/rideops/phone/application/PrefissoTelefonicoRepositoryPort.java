package com.rideops.phone.application;

import com.rideops.phone.adapters.out.PrefissoTelefonicoEntity;
import java.util.List;

public interface PrefissoTelefonicoRepositoryPort {

    List<PrefissoTelefonicoEntity> findAllAttivi();
}
