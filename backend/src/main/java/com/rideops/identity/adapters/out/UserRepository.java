package com.rideops.identity.adapters.out;

import com.rideops.identity.domain.UserRole;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByEmailIgnoreCase(String email);

    Optional<UserEntity> findByUserIdIgnoreCase(String userId);

    Optional<UserEntity> findByIdAndTenantId(Long id, Long tenantId);

    Optional<UserEntity> findByEmailIgnoreCaseAndTenantId(String email, Long tenantId);

    Optional<UserEntity> findByUserIdIgnoreCaseAndTenantId(String userId, Long tenantId);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndTenantId(String email, Long tenantId);

    boolean existsByUserIdIgnoreCase(String userId);

    boolean existsByUserIdIgnoreCaseAndTenantId(String userId, Long tenantId);

    List<UserEntity> findAllByOrderByCreatedAtDesc();

    List<UserEntity> findAllByTenantIdOrderByCreatedAtDesc(Long tenantId);

    List<UserEntity> findAllByRoleAndEnabledTrueOrderByEmailAsc(UserRole role);

    List<UserEntity> findAllByRoleAndEnabledTrueAndTenantIdOrderByEmailAsc(UserRole role, Long tenantId);

    List<UserEntity> findAllByRoleOrderByCreatedAtDesc(UserRole role);

    List<UserEntity> findAllByRoleAndTenantIdOrderByCreatedAtDesc(UserRole role, Long tenantId);
}
