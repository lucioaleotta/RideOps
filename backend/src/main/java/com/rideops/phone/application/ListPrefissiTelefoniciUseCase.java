package com.rideops.phone.application;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ListPrefissiTelefoniciUseCase {

    private final PrefissoTelefonicoRepositoryPort repositoryPort;

    public ListPrefissiTelefoniciUseCase(PrefissoTelefonicoRepositoryPort repositoryPort) {
        this.repositoryPort = repositoryPort;
    }

    public List<PrefissoTelefonicoDto> execute() {
        return repositoryPort.findAllAttivi().stream()
            .map(entity -> new PrefissoTelefonicoDto(
                entity.getCodiceIso2(), entity.getNomePaese(), entity.getPrefisso(), entity.isPrincipale()))
            .toList();
    }
}
