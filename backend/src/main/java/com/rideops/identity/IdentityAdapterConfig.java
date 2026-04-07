package com.rideops.identity;

import com.rideops.identity.adapters.out.UserAdminJpaAdapter;
import com.rideops.identity.adapters.out.UserRepository;
import com.rideops.identity.application.admin.UserAdminRepositoryPort;
import com.rideops.multitenancy.TenantContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class IdentityAdapterConfig {

    @Bean
    public UserAdminRepositoryPort userAdminRepositoryPort(UserRepository userRepository,
                                                           TenantContext tenantContext) {
        return new UserAdminJpaAdapter(userRepository, tenantContext);
    }
}
