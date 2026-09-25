FROM pgbouncer/pgbouncer:latest

# Copy pgbouncer configuration
COPY pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
COPY users.txt /etc/pgbouncer/users.txt

# Create health check script
COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Set health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

# Expose port
EXPOSE 6432

# Run pgbouncer
CMD ["pgbouncer", "/etc/pgbouncer/pgbouncer.ini"]