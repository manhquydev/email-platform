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
