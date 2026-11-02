package com.rideops.absences.application;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ListTipiAssenzaUseCase {

    private final TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;

    public ListTipiAssenzaUseCase(TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort) {
        this.tipoAssenzaRepositoryPort = tipoAssenzaRepositoryPort;
    }

    public List<TipoAssenzaDto> execute() {
        return tipoAssenzaRepositoryPort.findAllAttivi()
            .stream()
            .map(RichiestaAssenzaMapper::toDto)
            .toList();
    }
}
