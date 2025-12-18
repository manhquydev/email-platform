FROM dovecot/dovecot:latest

# Copy configuration files
COPY conf.d/ /etc/dovecot/conf.d/
COPY dovecot-sql.conf.ext /etc/dovecot/

# Create mail directory
RUN mkdir -p /var/mail && \
    chown -R dovecot:dovecot /var/mail && \
    chmod 755 /var/mail

# Expose IMAP ports
EXPOSE 143 993

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD doveadm service status || exit 1

CMD ["dovecot", "-F"]
