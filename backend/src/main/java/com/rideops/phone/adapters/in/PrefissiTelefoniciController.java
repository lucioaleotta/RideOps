package com.rideops.phone.adapters.in;

import com.rideops.phone.application.ListPrefissiTelefoniciUseCase;
import com.rideops.phone.application.PrefissoTelefonicoDto;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/prefissi-telefonici")
@PreAuthorize("hasAnyRole('ADMIN','GESTIONALE','DRIVER','DRIVER_FREELANCER')")
public class PrefissiTelefoniciController {

    private final ListPrefissiTelefoniciUseCase listPrefissiTelefoniciUseCase;

    public PrefissiTelefoniciController(ListPrefissiTelefoniciUseCase listPrefissiTelefoniciUseCase) {
        this.listPrefissiTelefoniciUseCase = listPrefissiTelefoniciUseCase;
    }

    @GetMapping
    public List<PrefissoTelefonicoDto> list() {
        return listPrefissiTelefoniciUseCase.execute();
    }
}
