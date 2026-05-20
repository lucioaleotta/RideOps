package com.rideops.identity.adapters.out;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "user_sessions")
public class UserSessionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "ip_address", columnDefinition = "inet")
    private String ipAddress;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "user_agent_raw")
    private String userAgentRaw;

    @Column(name = "ua_browser", length = 50)
    private String uaBrowser;

    @Column(name = "ua_os", length = 50)
    private String uaOs;

    @Column(name = "country_code", length = 8)
    private String countryCode;

    @Column(name = "country_name", length = 100)
    private String countryName;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "device_type", nullable = false, length = 20)
    private String deviceType = "unknown";

    @Column(name = "anomaly")
    private String anomaly;

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getTenantId() {
        return tenantId;
    }

    public void setTenantId(Long tenantId) {
        this.tenantId = tenantId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public String getUserAgentRaw() {
        return userAgentRaw;
    }

    public void setUserAgentRaw(String userAgentRaw) {
        this.userAgentRaw = userAgentRaw;
    }

    public String getUaBrowser() {
        return uaBrowser;
    }

    public void setUaBrowser(String uaBrowser) {
        this.uaBrowser = uaBrowser;
    }

    public String getUaOs() {
        return uaOs;
    }

    public void setUaOs(String uaOs) {
        this.uaOs = uaOs;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public void setCountryCode(String countryCode) {
        this.countryCode = countryCode;
    }

    public String getCountryName() {
        return countryName;
    }

    public void setCountryName(String countryName) {
        this.countryName = countryName;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getDeviceType() {
        return deviceType;
    }

    public void setDeviceType(String deviceType) {
        this.deviceType = deviceType;
    }

    public String getAnomaly() {
        return anomaly;
    }

    public void setAnomaly(String anomaly) {
        this.anomaly = anomaly;
    }
}
