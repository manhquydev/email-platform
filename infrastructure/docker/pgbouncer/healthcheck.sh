#!/bin/bash

# PgBouncer health check
# This script checks if PgBouncer is accepting connections

set -e

# Test if PgBouncer is responding to stats command
echo "SHOW STATS;" | psql -U postgres -h localhost -p 6432 pgbouncer > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "PgBouncer is healthy"
    exit 0
else
    echo "PgBouncer health check failed"
    exit 1
fi