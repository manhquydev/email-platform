#!/bin/bash
set -e

DOMAIN="${MAIL_DOMAIN:-localhost}"
HOSTNAME="${MAIL_HOSTNAME:-mail.${DOMAIN}}"

echo "=== Postfix + OpenDKIM Setup ==="
echo "Domain: ${DOMAIN}"
echo "Hostname: ${HOSTNAME}"

# Configure Postfix hostname
postconf -e "myhostname = ${HOSTNAME}"
postconf -e "mydomain = ${DOMAIN}"
postconf -e "myorigin = \$mydomain"

# Generate Relay Domains and Transport Maps
RELAY_DOMAINS_FILE="/etc/postfix/relay_domains"
TRANSPORT_FILE="/etc/postfix/transport"
echo "Configuring Relay Domains and Transport..."

# Start with primary domain
echo "${DOMAIN}" > "${RELAY_DOMAINS_FILE}"
echo "${DOMAIN} smtp:[api]:2525" > "${TRANSPORT_FILE}"

# Add extra domains if provided (comma separated)
if [ -n "${EXTRA_DOMAINS}" ]; then
    IFS=',' read -ra ADDR <<< "${EXTRA_DOMAINS}"
    for i in "${ADDR[@]}"; do
        echo "$i" >> "${RELAY_DOMAINS_FILE}"
        echo "$i smtp:[api]:2525" >> "${TRANSPORT_FILE}"
    done
fi

# Hash the maps
postmap "${RELAY_DOMAINS_FILE}"
postmap "${TRANSPORT_FILE}"

# Generate DKIM key if not exists
DKIM_SELECTOR="${DKIM_SELECTOR:-mail}"
DKIM_KEY_DIR="/etc/opendkim/keys/${DOMAIN}"

if [ ! -f "${DKIM_KEY_DIR}/${DKIM_SELECTOR}.private" ]; then
    echo "Generating DKIM keys for ${DOMAIN}..."
    mkdir -p "${DKIM_KEY_DIR}"
    opendkim-genkey -b 2048 -d "${DOMAIN}" -D "${DKIM_KEY_DIR}" -s "${DKIM_SELECTOR}" -v
    chown -R opendkim:opendkim "${DKIM_KEY_DIR}"
    chmod 600 "${DKIM_KEY_DIR}/${DKIM_SELECTOR}.private"
    echo ""
    echo "============================================"
    echo "DKIM PUBLIC KEY - ADD THIS TO DNS TXT RECORD"
    echo "============================================"
    echo "Record Name: ${DKIM_SELECTOR}._domainkey.${DOMAIN}"
    echo ""
    cat "${DKIM_KEY_DIR}/${DKIM_SELECTOR}.txt"
    echo ""
    echo "============================================"
fi

# Create OpenDKIM configuration files
cat > /etc/opendkim/KeyTable << EOF
${DKIM_SELECTOR}._domainkey.${DOMAIN} ${DOMAIN}:${DKIM_SELECTOR}:${DKIM_KEY_DIR}/${DKIM_SELECTOR}.private
EOF

cat > /etc/opendkim/SigningTable << EOF
*@${DOMAIN} ${DKIM_SELECTOR}._domainkey.${DOMAIN}
EOF

cat > /etc/opendkim/TrustedHosts << EOF
127.0.0.1
localhost
${HOSTNAME}
*.${DOMAIN}
EOF

# Fix permissions for OpenDKIM
chown -R opendkim:opendkim /etc/opendkim

# CRITICAL: Fix socket directory permissions for Postfix to access OpenDKIM
mkdir -p /var/spool/postfix/opendkim
chown opendkim:opendkim /var/spool/postfix/opendkim
chmod 755 /var/spool/postfix/opendkim

# Add postfix user to opendkim group for socket access
addgroup postfix opendkim 2>/dev/null || true

# Create Postfix chroot directories
mkdir -p /var/spool/postfix/etc
cp /etc/resolv.conf /var/spool/postfix/etc/
cp /etc/services /var/spool/postfix/etc/
cp /etc/hosts /var/spool/postfix/etc/

# Initialize Postfix
newaliases || true

# Configure Outbound Relay if variables are provided
if [ -n "${RELAY_HOST}" ]; then
    echo "Configuring outbound relay: ${RELAY_HOST}"
    postconf -e "relayhost = [${RELAY_HOST}]:${RELAY_PORT:-2525}"
    
    if [ -n "${RELAY_USER}" ] && [ -n "${RELAY_PASS}" ]; then
        echo "Configuring SASL authentication for relay..."
        echo "[${RELAY_HOST}]:${RELAY_PORT:-2525} ${RELAY_USER}:${RELAY_PASS}" > /etc/postfix/sasl_passwd
        postmap /etc/postfix/sasl_passwd
        chown root:root /etc/postfix/sasl_passwd /etc/postfix/sasl_passwd.db
        chmod 600 /etc/postfix/sasl_passwd /etc/postfix/sasl_passwd.db
    fi
fi

postfix check

echo "=== Configuration Complete ==="
echo ""
echo "DNS Records Required for ${DOMAIN}:"
echo ""
echo "1. SPF Record:"
echo "   Type: TXT"
echo "   Name: @"
echo "   Value: v=spf1 ip4:$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP') ~all"
echo ""
echo "2. DKIM Record:"
echo "   Type: TXT"  
echo "   Name: ${DKIM_SELECTOR}._domainkey"
echo "   Value: (see above)"
echo ""
echo "3. DMARC Record:"
echo "   Type: TXT"
echo "   Name: _dmarc"
echo "   Value: v=DMARC1; p=quarantine; rua=mailto:admin@${DOMAIN}"
echo ""

exec "$@"
