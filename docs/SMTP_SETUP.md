# Hướng dẫn Cấu hình SMTP Self-Hosted

Tài liệu này hướng dẫn cách cấu hình DNS và server để email gửi đi từ platform được chấp nhận bởi các nhà cung cấp email (Gmail, Outlook, Yahoo...).

## 📋 Yêu cầu

- Domain: `manhquy.id.vn` (đã chỉnh DNS về server)
- Server IP: `165.22.48.193`
- Truy cập quản lý DNS (Tenten.vn hoặc provider khác)

---

## 🚀 Bước 1: Deploy Code Mới

```bash
# SSH vào server
ssh root@165.22.48.193

# Pull code mới
cd /path/to/Email
git pull origin main

# Rebuild và restart services
docker-compose -f docker-compose.prod.yml up -d --build

# Xem logs Postfix để lấy DKIM public key
docker-compose -f docker-compose.prod.yml logs postfix
```

---

## 🔑 Bước 2: Lấy DKIM Public Key

Sau khi container postfix khởi động lần đầu, nó sẽ tự động tạo DKIM key và hiển thị trong logs:

```bash
docker-compose -f docker-compose.prod.yml logs postfix | grep -A 10 "DKIM PUBLIC KEY"
```

Bạn sẽ thấy output tương tự:

```
============================================
DKIM PUBLIC KEY - ADD THIS TO DNS TXT RECORD
============================================
Record Name: mail._domainkey.manhquy.id.vn

mail._domainkey IN TXT ( "v=DKIM1; k=rsa; "
    "p=MIIBIjANBgkqhk..." ... )
============================================
```

**Lưu lại giá trị này để cấu hình DNS.**

---

## 🌐 Bước 3: Cấu hình DNS Records

Truy cập quản lý DNS của domain và thêm các record sau:

### 1. SPF Record (Xác thực server được phép gửi mail)

| Field | Value |
|-------|-------|
| Type | TXT |
| Name | @ |
| Value | `v=spf1 ip4:165.22.48.193 ~all` |
| TTL | 3600 |

### 2. DKIM Record (Chữ ký số cho email)

| Field | Value |
|-------|-------|
| Type | TXT |
| Name | mail._domainkey |
| Value | (copy từ logs Postfix ở Bước 2) |
| TTL | 3600 |

> ⚠️ **Lưu ý**: DKIM value rất dài, một số DNS provider yêu cầu chia thành nhiều chuỗi 255 ký tự.

### 3. DMARC Record (Chính sách xử lý email fail SPF/DKIM)

| Field | Value |
|-------|-------|
| Type | TXT |
| Name | _dmarc |
| Value | `v=DMARC1; p=quarantine; rua=mailto:admin@manhquy.id.vn; pct=100` |
| TTL | 3600 |

### 4. MX Record (Nếu muốn nhận mail từ ngoài vào domain)

| Field | Value |
|-------|-------|
| Type | MX |
| Name | @ |
| Value | `mail.manhquy.id.vn` |
| Priority | 10 |
| TTL | 3600 |

### 5. A Record cho mail subdomain

| Field | Value |
|-------|-------|
| Type | A |
| Name | mail |
| Value | `165.22.48.193` |
| TTL | 3600 |

---

## 📧 Bước 4: Cấu hình PTR Record (Reverse DNS)

**PTR Record rất quan trọng** - nếu không có, email sẽ bị từ chối hoặc vào spam.

### Đối với DigitalOcean:

1. Đăng nhập vào DigitalOcean Dashboard
2. Vào **Networking** → **Domains**
3. Click vào droplet của bạn
4. Trong phần **Hostname**, đổi tên thành: `mail.manhquy.id.vn`

Hoặc:

1. Tạo support ticket yêu cầu setup PTR:
   - IP: `165.22.48.193`
   - PTR: `mail.manhquy.id.vn`

---

## ✅ Bước 5: Kiểm tra Cấu hình

### Kiểm tra DNS đã cập nhật:

```bash
# Kiểm tra SPF
dig TXT manhquy.id.vn +short

# Kiểm tra DKIM
dig TXT mail._domainkey.manhquy.id.vn +short

# Kiểm tra DMARC
dig TXT _dmarc.manhquy.id.vn +short

# Kiểm tra MX
dig MX manhquy.id.vn +short
```

### Kiểm tra PTR:

```bash
dig -x 165.22.48.193 +short
# Kết quả mong đợi: mail.manhquy.id.vn.
```

### Test gửi email:

1. Đăng ký tài khoản mới trên platform
2. Kiểm tra email xác thực trong inbox (không phải spam)
3. Xem email headers để kiểm tra DKIM pass

### Test với Mail-Tester:

1. Truy cập https://www.mail-tester.com
2. Gửi email test tới địa chỉ họ cung cấp
3. Kiểm tra điểm spam score (mục tiêu: 8+/10)

---

## 🔧 Troubleshooting

### Email vào spam:

1. Kiểm tra SPF, DKIM, DMARC đã cấu hình đúng
2. Kiểm tra PTR record đã setup
3. Đợi 24-48h để DNS propagate

### Không gửi được email:

```bash
# Xem logs Postfix
docker-compose -f docker-compose.prod.yml logs -f postfix

# Test SMTP connection từ trong container
docker-compose -f docker-compose.prod.yml exec api sh -c "nc -zv postfix 587"
```

### DKIM không pass:

```bash
# Kiểm tra DKIM key đã tạo
docker-compose -f docker-compose.prod.yml exec postfix cat /etc/opendkim/keys/manhquy.id.vn/mail.txt

# Restart OpenDKIM
docker-compose -f docker-compose.prod.yml restart postfix
```

---

## 📝 Tóm tắt DNS Records cần thêm

| Type | Name | Value |
|------|------|-------|
| TXT | @ | `v=spf1 ip4:165.22.48.193 ~all` |
| TXT | mail._domainkey | (từ logs postfix) |
| TXT | _dmarc | `v=DMARC1; p=quarantine; rua=mailto:admin@manhquy.id.vn; pct=100` |
| A | mail | `165.22.48.193` |
| MX | @ | `mail.manhquy.id.vn` (priority 10) |

**PTR Record**: Liên hệ DigitalOcean để setup `165.22.48.193` → `mail.manhquy.id.vn`

---

## ⏰ Timeline dự kiến

1. **Deploy code**: 5 phút
2. **Cấu hình DNS**: 10 phút
3. **DNS propagation**: 15 phút - 24 giờ
4. **PTR setup (DigitalOcean)**: 1-24 giờ
5. **Build email reputation**: 1-2 tuần

> 💡 **Tip**: Trong thời gian đợi reputation, chỉ gửi email cho những địa chỉ thật sự cần (verification, password reset). Tránh gửi bulk email.
