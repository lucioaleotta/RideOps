package com.rideops.identity.adapters.out;

import com.rideops.identity.application.admin.UserAdminRepositoryPort;
import com.rideops.identity.domain.UserRole;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class UserAdminJpaAdapter implements UserAdminRepositoryPort {

    private final UserRepository userRepository;

    public UserAdminJpaAdapter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

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
        return userRepository.save(userEntity);
    }

    @Override
    public Optional<UserEntity> findById(@NonNull Long id) {
        return userRepository.findById(id);
    }

    @Override
    public List<UserEntity> findAllByOrderByCreatedAtDesc() {
        return userRepository.findAllByOrderByCreatedAtDesc();
    }

    @Override
    public List<UserEntity> findAllByRoleAndEnabledTrueOrderByEmailAsc(UserRole role) {
        return userRepository.findAllByRoleAndEnabledTrueOrderByEmailAsc(role);
    }

    @Override
    public List<UserEntity> findAllByRoleOrderByCreatedAtDesc(UserRole role) {
        return userRepository.findAllByRoleOrderByCreatedAtDesc(role);
    }
}
