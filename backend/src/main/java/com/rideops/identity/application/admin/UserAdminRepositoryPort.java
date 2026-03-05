package com.rideops.identity.application.admin;

import com.rideops.identity.adapters.out.UserEntity;
import java.util.List;
import java.util.Optional;

public interface UserAdminRepositoryPort {

    boolean existsByEmailIgnoreCase(String email);

    UserEntity save(UserEntity userEntity);

    Optional<UserEntity> findById(Long id);

    List<UserEntity> findAllByOrderByCreatedAtDesc();
}
