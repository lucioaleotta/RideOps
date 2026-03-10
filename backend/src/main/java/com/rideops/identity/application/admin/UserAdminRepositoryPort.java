package com.rideops.identity.application.admin;

import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.domain.UserRole;
import java.util.List;
import java.util.Optional;
import org.springframework.lang.NonNull;

public interface UserAdminRepositoryPort {

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUserIdIgnoreCase(String userId);

    UserEntity save(@NonNull UserEntity userEntity);

    Optional<UserEntity> findById(@NonNull Long id);

    List<UserEntity> findAllByOrderByCreatedAtDesc();

    List<UserEntity> findAllByRoleAndEnabledTrueOrderByEmailAsc(UserRole role);

    List<UserEntity> findAllByRoleOrderByCreatedAtDesc(UserRole role);
}
