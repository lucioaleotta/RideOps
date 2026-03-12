package com.rideops.services.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

import com.rideops.services.domain.RideService;
import com.rideops.services.domain.RideServiceRepository;
import com.rideops.services.domain.ServiceStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Integration test for RideService entity using Testcontainers.
 * 
 * This test class demonstrates how to write integration tests that use
 * a real PostgreSQL database running in a Docker container.
 */
@Testcontainers
@DataJpaTest
@ActiveProfiles("test")
class RideServiceRepositoryIntegrationTest {

  @Container
  static PostgreSQLContainer<?> postgres =
      new PostgreSQLContainer<>("postgres:15")
          .withDatabaseName("rideops_test")
          .withUsername("postgres")
          .withPassword("postgres");

  @Autowired private TestEntityManager entityManager;
  @Autowired private RideServiceRepository repository;

  @Test
  void testCreateAndFindService() {
    // Arrange
    RideService service = new RideService();
    service.setDescription("Test Service");
    service.setAmount(100.0);
    service.setStatus(ServiceStatus.OPEN);

    // Act
    RideService saved = repository.save(service);
    entityManager.flush();

    RideService found = repository.findById(saved.getId()).orElse(null);

    // Assert
    assertNotNull(found);
    assertThat(found.getDescription()).isEqualTo("Test Service");
    assertThat(found.getAmount()).isEqualTo(100.0);
    assertThat(found.getStatus()).isEqualTo(ServiceStatus.OPEN);
  }

  @Test
  void testUpdateServiceStatus() {
    // Arrange
    RideService service = new RideService();
    service.setDescription("Test Service");
    service.setStatus(ServiceStatus.OPEN);
    RideService saved = repository.save(service);

    // Act
    saved.setStatus(ServiceStatus.ASSIGNED);
    repository.save(saved);
    entityManager.flush();

    RideService updated = repository.findById(saved.getId()).orElse(null);

    // Assert
    assertThat(updated.getStatus()).isEqualTo(ServiceStatus.ASSIGNED);
  }

  @Test
  void testFindAllServices() {
    // Arrange
    RideService service1 = new RideService();
    service1.setDescription("Service 1");
    service1.setStatus(ServiceStatus.OPEN);

    RideService service2 = new RideService();
    service2.setDescription("Service 2");
    service2.setStatus(ServiceStatus.CLOSED);

    repository.save(service1);
    repository.save(service2);
    entityManager.flush();

    // Act
    var all = repository.findAll();

    // Assert
    assertThat(all).hasSize(2);
  }

  @Test
  void testDeleteService() {
    // Arrange
    RideService service = new RideService();
    service.setDescription("Test Service");
    RideService saved = repository.save(service);
    entityManager.flush();

    // Act
    repository.delete(saved);
    entityManager.flush();

    var found = repository.findById(saved.getId());

    // Assert
    assertThat(found).isEmpty();
  }
}
