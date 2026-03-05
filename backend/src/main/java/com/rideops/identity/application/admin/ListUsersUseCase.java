package com.rideops.identity.application.admin;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ListUsersUseCase {

    private final UserAdminRepositoryPort userAdminRepositoryPort;

    public ListUsersUseCase(UserAdminRepositoryPort userAdminRepositoryPort) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
    }

    public List<UserSummaryDto> execute() {
        return userAdminRepositoryPort.findAllByOrderByCreatedAtDesc()
            .stream()
            .map(UserAdminMapper::toDto)
            .toList();
    }
}
