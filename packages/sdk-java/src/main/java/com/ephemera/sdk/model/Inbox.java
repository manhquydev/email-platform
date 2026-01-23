package com.ephemera.sdk.model;

import java.time.Instant;

public class Inbox {
    private String id;
    private String localPart;
    private String domainId;
    private String address;
    private String ownerId;
    private Instant expiresAt;
    private Instant createdAt;
    private Domain domain;

    public Inbox() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getLocalPart() { return localPart; }
    public void setLocalPart(String localPart) { this.localPart = localPart; }

    public String getDomainId() { return domainId; }
    public void setDomainId(String domainId) { this.domainId = domainId; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Domain getDomain() { return domain; }
    public void setDomain(Domain domain) { this.domain = domain; }
}
