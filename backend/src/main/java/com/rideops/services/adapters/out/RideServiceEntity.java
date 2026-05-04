package com.rideops.services.adapters.out;

import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ride_service")
public class RideServiceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "pickup_location", nullable = false, length = 255)
    private String pickupLocation;

    @Column(nullable = false, length = 255)
    private String destination;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", nullable = false, length = 20)
    private ServiceType type;

    @Column(name = "duration_hours")
    private Integer durationHours;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "external_booking_reference", length = 100)
    private String externalBookingReference;

    @Column(name = "internal_booking_reference", length = 32)
    private String internalBookingReference;

    @Column(name = "client_name", length = 255)
    private String clientName;

    @Column(name = "client_phone", length = 50)
    private String clientPhone;

    @Column(name = "client_email", length = 255)
    private String clientEmail;

    @Column(name = "passengers_count")
    private Integer passengersCount;

    @Column(columnDefinition = "TEXT")
    private String itinerary;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ServiceStatus status = ServiceStatus.OPEN;

    @Column(name = "assigned_driver_id")
    private Long assignedDriverId;

    @Column(name = "assigned_vehicle_id")
    private Long assignedVehicleId;

    @Column(name = "assigned_by_user_id")
    private Long assignedByUserId;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_assignment_type", nullable = false, length = 25)
    private ServiceAssignmentType serviceAssignmentType = ServiceAssignmentType.INTERNAL;

    @Column(name = "partner_id")
    private Long partnerId;

    @Column(name = "price_partner", precision = 12, scale = 2)
    private BigDecimal pricePartner;

    @Column(name = "margin", precision = 12, scale = 2)
    private BigDecimal margin;

    @Column(name = "outgoing_partner_id")
    private Long outgoingPartnerId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (serviceAssignmentType == null) {
            serviceAssignmentType = ServiceAssignmentType.INTERNAL;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getTenantId() {
        return tenantId;
    }

    public void setTenantId(Long tenantId) {
        this.tenantId = tenantId;
    }

    public LocalDateTime getStartAt() {
        return startAt;
    }

    public void setStartAt(LocalDateTime startAt) {
        this.startAt = startAt;
    }

    public String getPickupLocation() {
        return pickupLocation;
    }

    public void setPickupLocation(String pickupLocation) {
        this.pickupLocation = pickupLocation;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public ServiceType getType() {
        return type;
    }

    public void setType(ServiceType type) {
        this.type = type;
    }

    public Integer getDurationHours() {
        return durationHours;
    }

    public void setDurationHours(Integer durationHours) {
        this.durationHours = durationHours;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public String getExternalBookingReference() {
        return externalBookingReference;
    }

    public void setExternalBookingReference(String externalBookingReference) {
        this.externalBookingReference = externalBookingReference;
    }

    public String getInternalBookingReference() {
        return internalBookingReference;
    }

    public void setInternalBookingReference(String internalBookingReference) {
        this.internalBookingReference = internalBookingReference;
    }

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }

    public String getClientPhone() {
        return clientPhone;
    }

    public void setClientPhone(String clientPhone) {
        this.clientPhone = clientPhone;
    }

    public String getClientEmail() {
        return clientEmail;
    }

    public void setClientEmail(String clientEmail) {
        this.clientEmail = clientEmail;
    }

    public Integer getPassengersCount() {
        return passengersCount;
    }

    public void setPassengersCount(Integer passengersCount) {
        this.passengersCount = passengersCount;
    }

    public String getItinerary() {
        return itinerary;
    }

    public void setItinerary(String itinerary) {
        this.itinerary = itinerary;
    }

    public ServiceStatus getStatus() {
        return status;
    }

    public void setStatus(ServiceStatus status) {
        this.status = status;
    }

    public Long getAssignedDriverId() {
        return assignedDriverId;
    }

    public void setAssignedDriverId(Long assignedDriverId) {
        this.assignedDriverId = assignedDriverId;
    }

    public Long getAssignedVehicleId() {
        return assignedVehicleId;
    }

    public void setAssignedVehicleId(Long assignedVehicleId) {
        this.assignedVehicleId = assignedVehicleId;
    }

    public Long getAssignedByUserId() {
        return assignedByUserId;
    }

    public void setAssignedByUserId(Long assignedByUserId) {
        this.assignedByUserId = assignedByUserId;
    }

    public LocalDateTime getAssignedAt() {
        return assignedAt;
    }

    public void setAssignedAt(LocalDateTime assignedAt) {
        this.assignedAt = assignedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public ServiceAssignmentType getServiceAssignmentType() {
        return serviceAssignmentType;
    }

    public void setServiceAssignmentType(ServiceAssignmentType serviceAssignmentType) {
        this.serviceAssignmentType = serviceAssignmentType;
    }

    public Long getPartnerId() {
        return partnerId;
    }

    public void setPartnerId(Long partnerId) {
        this.partnerId = partnerId;
    }

    public BigDecimal getPricePartner() {
        return pricePartner;
    }

    public void setPricePartner(BigDecimal pricePartner) {
        this.pricePartner = pricePartner;
    }

    public BigDecimal getMargin() {
        return margin;
    }

    public void setMargin(BigDecimal margin) {
        this.margin = margin;
    }

    public Long getOutgoingPartnerId() {
        return outgoingPartnerId;
    }

    public void setOutgoingPartnerId(Long outgoingPartnerId) {
        this.outgoingPartnerId = outgoingPartnerId;
    }
}