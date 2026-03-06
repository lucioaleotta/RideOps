package com.rideops.identity.adapters.out;

import com.rideops.identity.domain.UserRole;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByEmailIgnoreCase(String email);

    Optional<UserEntity> findByUserIdIgnoreCase(String userId);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUserIdIgnoreCase(String userId);

    List<UserEntity> findAllByOrderByCreatedAtDesc();

    List<UserEntity> findAllByRoleAndEnabledTrueOrderByEmailAsc(UserRole role);
}
