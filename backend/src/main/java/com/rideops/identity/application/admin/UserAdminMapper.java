package com.rideops.identity.application.admin;

import com.rideops.identity.adapters.out.UserEntity;

public final class UserAdminMapper {

    private UserAdminMapper() {
    }

    public static UserSummaryDto toDto(UserEntity userEntity) {
        return new UserSummaryDto(
            userEntity.getId(),
            userEntity.getEmail(),
            userEntity.getRole().name(),
            userEntity.isEnabled(),
            userEntity.getCreatedAt()
        );
    }
}
