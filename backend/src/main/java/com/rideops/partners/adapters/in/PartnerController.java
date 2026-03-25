package com.rideops.partners.adapters.in;

import com.rideops.partners.application.PartnerDto;
import com.rideops.partners.application.PartnerAssignableServiceDto;
import com.rideops.partners.application.PartnerCollaborationDto;
import com.rideops.partners.application.PartnerEmailCommunicationResultDto;
import com.rideops.partners.application.PartnerNotFoundException;
import com.rideops.partners.application.PartnerService;
import com.rideops.partners.application.PartnerValidationException;
import com.rideops.partners.domain.PartnerType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/partners")
@PreAuthorize("hasAnyRole('ADMIN','GESTIONALE')")
public class PartnerController {

    private final PartnerService partnerService;

    public PartnerController(PartnerService partnerService) {
        this.partnerService = partnerService;
    }

    @GetMapping
    public List<PartnerDto> search(@RequestParam(required = false) String ragioneSociale,
                                   @RequestParam(required = false) PartnerType type,
                                   @RequestParam(defaultValue = "false") boolean includeDeleted) {
        return partnerService.search(ragioneSociale, type, includeDeleted);
    }

    @GetMapping("/{partnerId}")
    public PartnerDto getById(@PathVariable Long partnerId) {
        return partnerService.getById(partnerId);
    }

    @GetMapping("/{partnerId}/assignable-services")
    public List<PartnerAssignableServiceDto> listAssignableServices(@PathVariable Long partnerId) {
        return partnerService.listAssignableServices(partnerId);
    }

    @GetMapping("/{partnerId}/collaborations")
    public List<PartnerCollaborationDto> listCollaborations(@PathVariable Long partnerId) {
        return partnerService.listCollaborations(partnerId);
    }

    @PostMapping("/{partnerId}/communications/email")
    public PartnerEmailCommunicationResultDto sendServiceEmail(@PathVariable Long partnerId,
                                                               @Valid @RequestBody SendEmailRequest request) {
        return partnerService.sendServiceEmail(partnerId, request.serviceId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PartnerDto create(@Valid @RequestBody SavePartnerRequest request) {
        return partnerService.create(
            request.type(),
            request.ragioneSociale(),
            request.nomeReferente(),
            request.cognomeReferente(),
            request.telefono(),
            request.email(),
            request.citta(),
            request.indirizzo(),
            request.zonaOperativa(),
            request.partitaIva(),
            request.codiceFiscale(),
            request.iban(),
            request.intestatarioConto(),
            request.notePagamenti(),
            request.riceveEmail(),
            request.riceveWhatsApp(),
            request.telefonoWhatsApp(),
            request.noteOperative()
        );
    }

    @PutMapping("/{partnerId}")
    public PartnerDto update(@PathVariable Long partnerId,
                             @Valid @RequestBody SavePartnerRequest request) {
        return partnerService.update(
            partnerId,
            request.type(),
            request.ragioneSociale(),
            request.nomeReferente(),
            request.cognomeReferente(),
            request.telefono(),
            request.email(),
            request.citta(),
            request.indirizzo(),
            request.zonaOperativa(),
            request.partitaIva(),
            request.codiceFiscale(),
            request.iban(),
            request.intestatarioConto(),
            request.notePagamenti(),
            request.riceveEmail(),
            request.riceveWhatsApp(),
            request.telefonoWhatsApp(),
            request.noteOperative()
        );
    }

    @PatchMapping("/{partnerId}/deactivate")
    public PartnerDto deactivate(@PathVariable Long partnerId) {
        return partnerService.deactivate(partnerId);
    }

    @ExceptionHandler(PartnerValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(PartnerValidationException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    @ExceptionHandler(PartnerNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(PartnerNotFoundException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    record SavePartnerRequest(
        @NotNull PartnerType type,
        @NotBlank String ragioneSociale,
        String nomeReferente,
        String cognomeReferente,
        String telefono,
        String email,
        String citta,
        String indirizzo,
        String zonaOperativa,
        String partitaIva,
        String codiceFiscale,
        String iban,
        String intestatarioConto,
        String notePagamenti,
        boolean riceveEmail,
        boolean riceveWhatsApp,
        String telefonoWhatsApp,
        String noteOperative
    ) {
    }

    record SendEmailRequest(@NotNull Long serviceId) {
    }

    record ErrorResponse(String message) {
    }
}
