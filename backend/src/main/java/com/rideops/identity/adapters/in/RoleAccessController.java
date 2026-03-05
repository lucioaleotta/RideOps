package com.rideops.identity.adapters.in;

import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class RoleAccessController {

    @GetMapping("/admin/ping")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> adminPing() {
        return Map.of("message", "admin-ok");
    }

    @GetMapping("/gestionale/ping")
    @PreAuthorize("hasAnyRole('ADMIN','GESTIONALE')")
    public Map<String, String> gestionalePing() {
        return Map.of("message", "gestionale-ok");
    }

    @GetMapping("/driver/ping")
    @PreAuthorize("hasAnyRole('ADMIN','DRIVER')")
    public Map<String, String> driverPing() {
        return Map.of("message", "driver-ok");
    }
}
