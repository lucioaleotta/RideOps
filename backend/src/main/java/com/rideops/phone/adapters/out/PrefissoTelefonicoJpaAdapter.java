package com.rideops.phone.adapters.out;

import com.rideops.phone.application.PrefissoTelefonicoRepositoryPort;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class PrefissoTelefonicoJpaAdapter implements PrefissoTelefonicoRepositoryPort {

    private final PrefissoTelefonicoRepository repository;

    public PrefissoTelefonicoJpaAdapter(PrefissoTelefonicoRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<PrefissoTelefonicoEntity> findAllAttivi() {
        return repository.findAllByAttivoTrueOrderByOrdineAsc();
    }
}
