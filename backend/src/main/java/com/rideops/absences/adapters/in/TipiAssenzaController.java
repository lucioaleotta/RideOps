package com.rideops.absences.adapters.in;

import com.rideops.absences.application.AssenzaNotFoundException;
import com.rideops.absences.application.AssenzaValidationException;
import com.rideops.absences.application.ListTipiAssenzaUseCase;
import com.rideops.absences.application.TipoAssenzaDto;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tipi-assenza")
@PreAuthorize("hasAnyRole('GESTIONALE','DRIVER')")
public class TipiAssenzaController {

    private final ListTipiAssenzaUseCase listTipiAssenzaUseCase;

    public TipiAssenzaController(ListTipiAssenzaUseCase listTipiAssenzaUseCase) {
        this.listTipiAssenzaUseCase = listTipiAssenzaUseCase;
    }

    @GetMapping
    public List<TipoAssenzaDto> listTipiAssenza() {
        return listTipiAssenzaUseCase.execute();
    }

    @ExceptionHandler(AssenzaValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public AssenzeErrorResponse handleValidation(AssenzaValidationException exception) {
        return new AssenzeErrorResponse(exception.getMessage());
    }

    @ExceptionHandler(AssenzaNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public AssenzeErrorResponse handleNotFound(AssenzaNotFoundException exception) {
        return new AssenzeErrorResponse(exception.getMessage());
    }

    record AssenzeErrorResponse(String message) {
    }
}
