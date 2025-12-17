FROM alpine:3.18

# Install Postfix, OpenDKIM, and required tools
RUN apk add --no-cache \
    postfix \
    postfix-pcre \
    opendkim \
    opendkim-utils \
    ca-certificates \
    openssl \
    bash \
    supervisor

# Create directories
RUN mkdir -p /etc/opendkim/keys \
    && mkdir -p /var/spool/postfix/opendkim \
    && mkdir -p /var/log/supervisor

# Copy configuration files
COPY main.cf /etc/postfix/main.cf
COPY master.cf /etc/postfix/master.cf
COPY opendkim.conf /etc/opendkim/opendkim.conf
COPY supervisord.conf /etc/supervisord.conf
COPY entrypoint.sh /entrypoint.sh

# Set permissions
RUN chmod +x /entrypoint.sh \
    && chown -R opendkim:opendkim /etc/opendkim \
    && chown -R opendkim:opendkim /var/spool/postfix/opendkim

# Expose SMTP ports
EXPOSE 25 587

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD postfix status || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
