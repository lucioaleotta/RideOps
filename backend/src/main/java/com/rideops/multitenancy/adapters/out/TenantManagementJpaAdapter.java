package com.rideops.multitenancy.adapters.out;

import com.rideops.multitenancy.TenantEntity;
import com.rideops.multitenancy.TenantRepository;
import com.rideops.multitenancy.application.TenantManagementRepositoryPort;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class TenantManagementJpaAdapter implements TenantManagementRepositoryPort {

    private final TenantRepository tenantRepository;

    public TenantManagementJpaAdapter(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    @Override
    public boolean existsByBusinessNameIgnoreCase(String businessName) {
        return tenantRepository.existsByBusinessNameIgnoreCase(businessName);
    }

    @Override
    public boolean existsByContactEmailIgnoreCase(String contactEmail) {
        return tenantRepository.existsByContactEmailIgnoreCase(contactEmail);
    }

    @Override
    public boolean existsByBusinessNameIgnoreCaseAndIdNot(String businessName, Long id) {
        return tenantRepository.existsByBusinessNameIgnoreCaseAndIdNot(businessName, id);
    }

    @Override
    public boolean existsByContactEmailIgnoreCaseAndIdNot(String contactEmail, Long id) {
        return tenantRepository.existsByContactEmailIgnoreCaseAndIdNot(contactEmail, id);
    }

    @Override
    public TenantEntity save(TenantEntity tenant) {
        return tenantRepository.save(tenant);
    }

    @Override
    public Optional<TenantEntity> findById(Long id) {
        return tenantRepository.findById(id);
    }

    @Override
    public List<TenantEntity> findAllByOrderByBusinessNameAsc() {
        return tenantRepository.findAllByOrderByBusinessNameAsc();
    }

    @Override
    public List<TenantEntity> search(String query) {
        if (query == null || query.trim().isEmpty()) {
            return tenantRepository.findAllByOrderByBusinessNameAsc();
        }
        String term = query.trim();
        return tenantRepository.findByBusinessNameContainingIgnoreCaseOrContactEmailContainingIgnoreCaseOrderByBusinessNameAsc(
            term,
            term
        );
    }
}
