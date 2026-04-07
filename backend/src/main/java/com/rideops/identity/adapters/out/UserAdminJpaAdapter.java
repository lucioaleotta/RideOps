package com.rideops.identity.adapters.out;

import com.rideops.identity.application.admin.UserAdminRepositoryPort;
import com.rideops.identity.domain.UserRole;
import com.rideops.multitenancy.TenantContext;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class UserAdminJpaAdapter implements UserAdminRepositoryPort {

    private final UserRepository userRepository;
    private final TenantContext tenantContext;

    public UserAdminJpaAdapter(UserRepository userRepository, TenantContext tenantContext) {
        this.userRepository = userRepository;
        this.tenantContext = tenantContext;
    }

    // Email e userId devono essere unici globalmente (cross-tenant)
    @Override
    public boolean existsByEmailIgnoreCase(String email) {
        return userRepository.existsByEmailIgnoreCase(email);
    }

    @Override
    public boolean existsByUserIdIgnoreCase(String userId) {
        return userRepository.existsByUserIdIgnoreCase(userId);
    }

    @Override
    public UserEntity save(@NonNull UserEntity userEntity) {
        // ADMIN ha tenantId null: non impostare dal contesto
        if (userEntity.getTenantId() == null) {
            Long contextTenantId = tenantContext.getTenantIdOrNull();
            if (contextTenantId != null) {
                userEntity.setTenantId(contextTenantId);
            }
        }
        return userRepository.save(userEntity);
    }

    @Override
    public Optional<UserEntity> findById(@NonNull Long id) {
        Long tenantId = tenantContext.getTenantIdOrNull();
        if (tenantId == null) {
            return userRepository.findById(id);
        }
        return userRepository.findByIdAndTenantId(id, tenantId);
    }

    // findByEmail e findByUserId usati per controlli unicità sull'update: devono essere globali
    @Override
    public Optional<UserEntity> findByEmailIgnoreCase(String email) {
        return userRepository.findByEmailIgnoreCase(email);
    }

    @Override
    public Optional<UserEntity> findByUserIdIgnoreCase(String userId) {
        return userRepository.findByUserIdIgnoreCase(userId);
    }

    @Override
    public List<UserEntity> findAllByOrderByCreatedAtDesc() {
        Long tenantId = tenantContext.getTenantIdOrNull();
        if (tenantId == null) {
            return userRepository.findAllByOrderByCreatedAtDesc();
        }
        return userRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    @Override
    public List<UserEntity> findAllByRoleAndEnabledTrueOrderByEmailAsc(UserRole role) {
        Long tenantId = tenantContext.getTenantIdOrNull();
        if (tenantId == null) {
            return userRepository.findAllByRoleAndEnabledTrueOrderByEmailAsc(role);
        }
        return userRepository.findAllByRoleAndEnabledTrueAndTenantIdOrderByEmailAsc(role, tenantId);
    }

    @Override
    public List<UserEntity> findAllByRoleOrderByCreatedAtDesc(UserRole role) {
        Long tenantId = tenantContext.getTenantIdOrNull();
        if (tenantId == null) {
            return userRepository.findAllByRoleOrderByCreatedAtDesc(role);
        }
        return userRepository.findAllByRoleAndTenantIdOrderByCreatedAtDesc(role, tenantId);
    }
}
