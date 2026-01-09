FROM alpine:3.18

# Install Dovecot and dependencies
# dovecot-pcre is likely included or not available as separate package
# Added dovecot-sql as we use dovecot-sql.conf.ext
RUN apk add --no-cache \
    dovecot \
    dovecot-lmtpd \
    dovecot-pop3d \
    dovecot-submissiond \
    dovecot-sql \
    openssl \
    bash

# Generate self-signed certificate for Dovecot
RUN mkdir -p /etc/ssl/certs /etc/ssl/private && \
    openssl req -new -x509 -days 365 -nodes \
    -out /etc/ssl/certs/dovecot.pem \
    -keyout /etc/ssl/private/dovecot.pem \
    -subj "/C=US/ST=Denial/L=Springfield/O=Dis/CN=localhost" && \
    chmod 0600 /etc/ssl/private/dovecot.pem

# Generate DH parameters for SSL (required by 10-ssl.conf)
RUN openssl dhparam -out /etc/dovecot/dh.pem 2048

# Copy configuration files
COPY dovecot.conf /etc/dovecot/dovecot.conf
COPY conf.d/ /etc/dovecot/conf.d/
COPY dovecot-sql.conf.ext /etc/dovecot/dovecot-sql.conf.ext

# Create mail directory and set permissions
RUN mkdir -p /var/mail && \
    chown -R dovecot:dovecot /var/mail && \
    chmod 755 /var/mail

# Expose IMAP ports
EXPOSE 143 993

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD doveadm service status || exit 1

# Start Dovecot in foreground
CMD ["dovecot", "-F"]
