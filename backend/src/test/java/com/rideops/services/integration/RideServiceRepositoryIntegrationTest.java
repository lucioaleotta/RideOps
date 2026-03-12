package com.rideops.services.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.adapters.out.RideServiceRepository;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDateTime;
/**
 * Integration test for RideService entity using Testcontainers.
 * 
 * This test class demonstrates how to write integration tests that use
 * a real PostgreSQL database running in a Docker container.
 */
@Testcontainers
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class RideServiceRepositoryIntegrationTest {

  @Container
  static PostgreSQLContainer<?> postgres =
      new PostgreSQLContainer<>("postgres:15")
          .withDatabaseName("rideops_test")
          .withUsername("postgres")
          .withPassword("postgres");

  @DynamicPropertySource
  static void registerDataSourceProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
  }

  @Autowired private TestEntityManager entityManager;
  @Autowired private RideServiceRepository repository;

  @Test
  void testCreateAndFindService() {
    // Arrange
    RideServiceEntity service = new RideServiceEntity();
    service.setPickupLocation("Downtown Station");
    service.setDestination("Airport Terminal");
    service.setNotes("Test Service");
    service.setPrice(new BigDecimal("100.00"));
    service.setStatus(ServiceStatus.OPEN);
    service.setStartAt(LocalDateTime.now().plusHours(2));
    service.setType(ServiceType.TRANSFER);

    // Act
    RideServiceEntity saved = repository.save(service);
    entityManager.flush();
    RideServiceEntity found = repository.findById(saved.getId()).orElse(null);

    // Assert
    assertNotNull(found);
    assertThat(found.getNotes()).isEqualTo("Test Service");
    assertThat(found.getPrice()).isEqualTo(new BigDecimal("100.00"));
    assertThat(found.getStatus()).isEqualTo(ServiceStatus.OPEN);
  }

  @Test
  void testUpdateServiceStatus() {
    // Arrange
    RideServiceEntity service = new RideServiceEntity();
    service.setPickupLocation("Downtown Station");
    service.setDestination("Airport Terminal");
    service.setNotes("Test Service");
    service.setStatus(ServiceStatus.OPEN);
    service.setStartAt(LocalDateTime.now().plusHours(2));
    service.setType(ServiceType.TRANSFER);
    RideServiceEntity saved = repository.save(service);

    // Act
    saved.setStatus(ServiceStatus.ASSIGNED);
    repository.save(saved);
    entityManager.flush();
    RideServiceEntity updated = repository.findById(saved.getId()).orElse(null);

    // Assert
    assertThat(updated.getStatus()).isEqualTo(ServiceStatus.ASSIGNED);
  }

  @Test
  void testFindAllServices() {
    // Arrange
    RideServiceEntity service1 = new RideServiceEntity();
    service1.setPickupLocation("Location 1");
    service1.setDestination("Destination 1");
    service1.setNotes("Service 1");
    service1.setStartAt(LocalDateTime.now().plusHours(1));
    service1.setType(ServiceType.TRANSFER);
    service1.setStatus(ServiceStatus.OPEN);
    RideServiceEntity service2 = new RideServiceEntity();
    service2.setPickupLocation("Location 2");
    service2.setDestination("Destination 2");
    service2.setNotes("Service 2");
    service2.setStartAt(LocalDateTime.now().plusHours(3));
    service2.setType(ServiceType.TRANSFER);
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
    RideServiceEntity service = new RideServiceEntity();
    service.setPickupLocation("Downtown Station");
    service.setDestination("Airport Terminal");
    service.setNotes("Test Service");
    service.setStartAt(LocalDateTime.now().plusHours(2));
    service.setType(ServiceType.TRANSFER);
    RideServiceEntity saved = repository.save(service);
    entityManager.flush();

    // Act
    repository.delete(saved);
    entityManager.flush();

    var found = repository.findById(saved.getId());

    // Assert
    assertThat(found).isEmpty();
  }
}
