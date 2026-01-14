FROM alpine:3.19

# Install dependencies
RUN apk add --no-cache \
    bash \
    docker-cli \
    aws-cli \
    gzip \
    curl

# Setup script
COPY scripts/backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Create backup directory
WORKDIR /backups

# Add cron job (default: every 6 hours)
ENV CRON_SCHEDULE="0 */6 * * *"
RUN echo "$CRON_SCHEDULE /usr/local/bin/backup.sh --s3 >> /var/log/backup.log 2>&1" > /etc/crontabs/root

# Run cron in foreground
CMD ["crond", "-f"]
