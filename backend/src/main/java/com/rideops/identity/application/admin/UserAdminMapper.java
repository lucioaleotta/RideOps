package com.rideops.identity.application.admin;

import com.rideops.identity.adapters.out.UserEntity;

public final class UserAdminMapper {

    private UserAdminMapper() {
    }

    public static UserSummaryDto toDto(UserEntity userEntity) {
        return new UserSummaryDto(
            userEntity.getId(),
            userEntity.getUserId(),
            userEntity.getEmail(),
            userEntity.getRole().name(),
            userEntity.isEnabled(),
            userEntity.getCreatedAt(),
            userEntity.getFirstName(),
            userEntity.getLastName(),
            userEntity.getBirthDate(),
            userEntity.getLicenseNumber(),
            DriverProfileJson.readStringList(userEntity.getLicenseTypesJson()),
            DriverProfileJson.readStringList(userEntity.getResidentialAddressesJson()),
            userEntity.getMobilePhone(),
            userEntity.getLicenseExpiryDate()
        );
    }
}
