package com.ephemera.sdk;

import com.ephemera.sdk.exception.EphemeraException;
import com.ephemera.sdk.exception.NetworkException;
import com.ephemera.sdk.exception.RateLimitException;
import com.ephemera.sdk.exception.TimeoutException;
import com.ephemera.sdk.model.Domain;
import com.ephemera.sdk.model.Inbox;
import com.ephemera.sdk.model.Message;
import com.ephemera.sdk.model.PaginatedResponse;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Ephemera API Client
 *
 * Main client for interacting with the Ephemera temporary email API.
 *
 * <pre>{@code
 * EphemeraClient client = new EphemeraClient("your-api-key");
 * Inbox inbox = client.createInbox();
 * Message message = client.waitForEmail(inbox.getId(), "Verification", Duration.ofSeconds(60));
 * }</pre>
 */
public class EphemeraClient {
    private static final String DEFAULT_BASE_URL = "https://api.manhquy.click";
    private static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(30);

    private final String apiKey;
    private final String baseUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public EphemeraClient(String apiKey) {
        this(apiKey, DEFAULT_BASE_URL);
    }

    public EphemeraClient(String apiKey, String baseUrl) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalArgumentException("API key is required");
        }

        this.apiKey = apiKey;
        this.baseUrl = baseUrl.replaceAll("/$", "");
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(DEFAULT_TIMEOUT)
                .build();
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .setPropertyNamingStrategy(PropertyNamingStrategies.LOWER_CAMEL_CASE)
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    // ==================== Domain Methods ====================

    public List<Domain> listDomains() throws EphemeraException {
        String response = doRequest("GET", "/domains?limit=100", null);
        return parseList(response, Domain.class);
    }

    public Domain getDomain(String id) throws EphemeraException {
        String response = doRequest("GET", "/domains/" + id, null);
        return parse(response, Domain.class);
    }

    // ==================== Inbox Methods ====================

    public Inbox createInbox() throws EphemeraException {
        return createInbox(Map.of());
    }

    public Inbox createInbox(Map<String, Object> options) throws EphemeraException {
        String body = toJson(options);
        String response = doRequest("POST", "/inboxes", body);
        return parse(response, Inbox.class);
    }

    public Inbox getInbox(String id) throws EphemeraException {
        String response = doRequest("GET", "/inboxes/" + id, null);
        return parse(response, Inbox.class);
    }

    public List<Inbox> listInboxes() throws EphemeraException {
        return listInboxes(100);
    }

    public List<Inbox> listInboxes(int limit) throws EphemeraException {
        String response = doRequest("GET", "/inboxes?limit=" + limit + "&personal=true", null);
        return parseList(response, Inbox.class);
    }

    public void deleteInbox(String id) throws EphemeraException {
        doRequest("DELETE", "/inboxes/" + id, null);
    }

    // ==================== Message Methods ====================

    public List<Message> getMessages(String inboxId) throws EphemeraException {
        return getMessages(inboxId, 50);
    }

    public List<Message> getMessages(String inboxId, int limit) throws EphemeraException {
        String response = doRequest("GET", "/messages?inboxId=" + inboxId + "&limit=" + limit, null);
        return parseList(response, Message.class);
    }

    public Message getMessage(String id) throws EphemeraException {
        String response = doRequest("GET", "/messages/" + id, null);
        return parse(response, Message.class);
    }

    public void deleteMessage(String id) throws EphemeraException {
        doRequest("DELETE", "/messages/" + id, null);
    }

    // ==================== Convenience Methods ====================

    public Message waitForEmail(String inboxId, String subject, Duration timeout)
            throws EphemeraException, InterruptedException {
        return waitForEmail(inboxId, subject, null, timeout);
    }

    public Message waitForEmail(String inboxId, String subject, String from, Duration timeout)
            throws EphemeraException, InterruptedException {
        long start = System.currentTimeMillis();
        long timeoutMs = timeout.toMillis();

        while (System.currentTimeMillis() - start < timeoutMs) {
            List<Message> messages = getMessages(inboxId, 20);

            for (Message msg : messages) {
                boolean matchesSubject = subject == null ||
                        msg.getSubject().toLowerCase().contains(subject.toLowerCase());
                boolean matchesFrom = from == null ||
                        (msg.getFromAddress() != null &&
                                msg.getFromAddress().toLowerCase().contains(from.toLowerCase()));

                if (matchesSubject && matchesFrom) {
                    return msg;
                }
            }
            Thread.sleep(2000);
        }

        throw new TimeoutException("No matching email found within " + timeout.getSeconds() + "s");
    }

    public Optional<String> extractCode(Message message) {
        String text = message.getTextBody() != null ? message.getTextBody() :
                (message.getHtmlBody() != null ? message.getHtmlBody() : "");

        String[] patterns = {
                "\\b(\\d{6})\\b",           // 6 digits
                "\\b(\\d{4})\\b",           // 4 digits
                "(?i)code[:\\s]+(\\d{4,8})", // "code: 123456"
                "(?i)otp[:\\s]+(\\d{4,8})"   // "otp: 123456"
        };

        for (String pattern : patterns) {
            Matcher matcher = Pattern.compile(pattern).matcher(text);
            if (matcher.find()) {
                return Optional.of(matcher.group(1));
            }
        }

        return Optional.empty();
    }

    // ==================== HTTP Request ====================

    private String doRequest(String method, String path, String body) throws EphemeraException {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + path))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .header("User-Agent", "ephemera-java/1.0.0")
                    .timeout(DEFAULT_TIMEOUT);

            if (body != null) {
                builder.method(method, HttpRequest.BodyPublishers.ofString(body));
            } else if ("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method)) {
                builder.method(method, HttpRequest.BodyPublishers.ofString("{}"));
            } else {
                builder.method(method, HttpRequest.BodyPublishers.noBody());
            }

            HttpResponse<String> response = httpClient.send(
                    builder.build(),
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() >= 400) {
                throw parseError(response);
            }

            return response.body();
        } catch (IOException e) {
            throw new NetworkException("Network error: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new NetworkException("Request interrupted", e);
        }
    }

    private EphemeraException parseError(HttpResponse<String> response) {
        int status = response.statusCode();

        if (status == 429) {
            int retryAfter = response.headers()
                    .firstValue("Retry-After")
                    .map(Integer::parseInt)
                    .orElse(60);
            return new RateLimitException("Rate limit exceeded", retryAfter);
        }

        try {
            Map<?, ?> error = objectMapper.readValue(response.body(), Map.class);
            String message = (String) error.getOrDefault("message", "Unknown error");
            String code = (String) error.getOrDefault("code", "UNKNOWN");
            return new EphemeraException(message, code, status);
        } catch (Exception e) {
            return new EphemeraException("HTTP " + status, "HTTP_ERROR", status);
        }
    }

    private String toJson(Object obj) throws EphemeraException {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            throw new EphemeraException("Failed to serialize request", "SERIALIZATION_ERROR", 0);
        }
    }

    private <T> T parse(String json, Class<T> clazz) throws EphemeraException {
        try {
            return objectMapper.readValue(json, clazz);
        } catch (Exception e) {
            throw new EphemeraException("Failed to parse response", "PARSE_ERROR", 0);
        }
    }

    private <T> List<T> parseList(String json, Class<T> clazz) throws EphemeraException {
        try {
            var type = objectMapper.getTypeFactory().constructParametricType(
                    PaginatedResponse.class, clazz);
            PaginatedResponse<T> response = objectMapper.readValue(json, type);
            return response.getData();
        } catch (Exception e) {
            throw new EphemeraException("Failed to parse response", "PARSE_ERROR", 0);
        }
    }
}
