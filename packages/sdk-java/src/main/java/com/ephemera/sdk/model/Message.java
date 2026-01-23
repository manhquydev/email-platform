package com.ephemera.sdk.model;

import java.time.Instant;
import java.util.List;

public class Message {
    private String id;
    private String inboxId;
    private String messageId;
    private String fromAddress;
    private String toAddress;
    private String subject;
    private String textBody;
    private String htmlBody;
    private Instant receivedAt;
    private boolean isRead;
    private boolean isPinned;
    private Double spamScore;
    private long size;
    private List<Attachment> attachments;

    public Message() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getInboxId() { return inboxId; }
    public void setInboxId(String inboxId) { this.inboxId = inboxId; }

    public String getMessageId() { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }

    public String getFromAddress() { return fromAddress; }
    public void setFromAddress(String fromAddress) { this.fromAddress = fromAddress; }

    public String getToAddress() { return toAddress; }
    public void setToAddress(String toAddress) { this.toAddress = toAddress; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getTextBody() { return textBody; }
    public void setTextBody(String textBody) { this.textBody = textBody; }

    public String getHtmlBody() { return htmlBody; }
    public void setHtmlBody(String htmlBody) { this.htmlBody = htmlBody; }

    public Instant getReceivedAt() { return receivedAt; }
    public void setReceivedAt(Instant receivedAt) { this.receivedAt = receivedAt; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }

    public boolean isPinned() { return isPinned; }
    public void setPinned(boolean pinned) { isPinned = pinned; }

    public Double getSpamScore() { return spamScore; }
    public void setSpamScore(Double spamScore) { this.spamScore = spamScore; }

    public long getSize() { return size; }
    public void setSize(long size) { this.size = size; }

    public List<Attachment> getAttachments() { return attachments; }
    public void setAttachments(List<Attachment> attachments) { this.attachments = attachments; }
}
