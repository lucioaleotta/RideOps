package com.rideops.multitenancy.adapters.out;

import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.adapters.out.UserRepository;
import com.rideops.identity.domain.UserRole;
import com.rideops.multitenancy.application.TenantAdminProvisioningPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class TenantAdminProvisioningJpaAdapter implements TenantAdminProvisioningPort {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public TenantAdminProvisioningJpaAdapter(UserRepository userRepository,
                                             PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public boolean existsByUserIdIgnoreCase(String userId) {
        return userRepository.existsByUserIdIgnoreCase(userId);
    }

    @Override
    public boolean existsByEmailIgnoreCase(String email) {
        return userRepository.existsByEmailIgnoreCase(email);
    }

    @Override
    public void createDefaultAdminUser(Long tenantId,
                                       String userId,
                                       String email,
                                       String rawPassword,
                                       String firstName,
                                       String lastName) {
        UserEntity user = new UserEntity();
        user.setTenantId(tenantId);
        user.setUserId(userId);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(UserRole.GESTIONALE);
        user.setEnabled(true);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        userRepository.save(user);
    }
}
