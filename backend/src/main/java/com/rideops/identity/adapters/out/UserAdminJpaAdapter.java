package com.rideops.identity.adapters.out;

import com.rideops.identity.application.admin.UserAdminRepositoryPort;
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
    public UserEntity save(UserEntity userEntity) {
        return userRepository.save(userEntity);
    }

    @Override
    public Optional<UserEntity> findById(Long id) {
        return userRepository.findById(id);
    }

    @Override
    public List<UserEntity> findAllByOrderByCreatedAtDesc() {
        return userRepository.findAllByOrderByCreatedAtDesc();
    }
}
