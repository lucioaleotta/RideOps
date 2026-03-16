package com.rideops.identity.adapters.out;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_admin_audit_log")
public class UserAdminAuditLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "target_user_id", nullable = false)
    private Long targetUserId;

    @Column(name = "target_userid", nullable = false, length = 80)
    private String targetUserIdValue;

    @Column(name = "admin_user_id")
    private Long adminUserId;

    @Column(name = "admin_userid", nullable = false, length = 80)
    private String adminUserIdValue;

    @Column(nullable = false, length = 40)
    private String action;

    @Column(name = "changed_fields", length = 500)
    private String changedFields;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getTargetUserId() {
        return targetUserId;
    }

    public void setTargetUserId(Long targetUserId) {
        this.targetUserId = targetUserId;
    }

    public String getTargetUserIdValue() {
        return targetUserIdValue;
    }

    public void setTargetUserIdValue(String targetUserIdValue) {
        this.targetUserIdValue = targetUserIdValue;
    }

    public Long getAdminUserId() {
        return adminUserId;
    }

    public void setAdminUserId(Long adminUserId) {
        this.adminUserId = adminUserId;
    }

    public String getAdminUserIdValue() {
        return adminUserIdValue;
    }

    public void setAdminUserIdValue(String adminUserIdValue) {
        this.adminUserIdValue = adminUserIdValue;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getChangedFields() {
        return changedFields;
    }

    public void setChangedFields(String changedFields) {
        this.changedFields = changedFields;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
