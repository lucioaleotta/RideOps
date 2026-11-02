package com.rideops.phone.adapters.out;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrefissoTelefonicoRepository extends JpaRepository<PrefissoTelefonicoEntity, Long> {

    List<PrefissoTelefonicoEntity> findAllByAttivoTrueOrderByOrdineAsc();
}
