# Rspamd configuration for TempMail Pro

# Logging
log_level = "info";
log_color = false;

# DNS settings
dns {
  nameserver = ["8.8.8.8", "8.8.4.4"];
  timeout = 1s;
  retransmits = 5;
}

# Workers configuration
worker {
  count = 4;
  max_connections = 1000;
  .type = "normal";
  .task_timeout = 60s;
}

# Controller worker
worker "controller" {
  bind_socket = "0.0.0.0:11334";
  .type = "controller";
  .count = 1;
  password = "$2$hgj7knh4g4vnxf9sbqan7xdzhw1j19sk$k254c6xxw1n81xyr341q4n4px9idb1zbs378qzrf8d1ps4b44mf";
  .secure_ip = ["127.0.0.1", "::1"];
}

# Normal worker for scanning
worker "normal" {
  bind_socket = "0.0.0.0:11333";
  .type = "normal";
  .task_timeout = 120s;
  .max_connections = 1000;
}

# Redis configuration
redis {
  servers = "rspamd-redis:6379";
  timeout = 1s;
  db = 0;
  prefix = "rs_";
}

# Antivirus configuration
antivirus {
  clamav {
    enabled = true;
    servers = "/tmp/clamd.sock";
    scan_mime_parts = true;
    scan_text_mime = false;
    scan_images = false;
    symbol = "CLAM_VIRUS";
    type = "clamav";
    log_clean = true;
  }
}

# DKIM configuration
dkim {
  sign = false;  # We'll implement DKIM signing separately
  allow_envfrom_empty = true;
  allow_hdrfrom_mismatch = false;
  allow_hdrfrom_multiple = false;
  allow_username_mismatch = false;
  allow_pubkey_mismatch = false;
  skip_domains = [];
  path = "/var/lib/rspamd/dkim";
  use_redis = true;
  use_esld = true;
  hash_key = "dkim";
}

# SPF configuration
spf {
  enabled = true;
  use_redis = true;
  spf_cache_expire = 86400;
  cache_expire = 3600;
  timeout = 1s;
}

# DMARC configuration
dmarc {
  enabled = true;
  use_redis = true;
  reporting = false;
  timeout = 2s;
  cache_expire = 3600;
}

# Greylisting
greylist {
  enabled = false;  # Disabled for temp mail service
}

# Rate limiting
ratelimit {
  enabled = true;
  burst = 100;
  rate = "10 / 1m";
}

# Neural networks
neural {
  enabled = false;  # Disabled for initial deployment
  max_train = 1000;
  max_learn = 10000;
  spam_score = 10;
  ham_score = -10;
}

# History
history {
  enabled = true;
  rows = 1000;
}

# Statistical filters
classifier "bayes" {
  enabled = true;
  tokenizer {
    name = "osb";
  }
  min_tokens = 11;
  max_tokens = 12;
  min_word_len = 3;
  max_word_len = 30;
  languages = ["en"];
}

# Statistical settings
statfile {
  symbol = "BAYES_HAM";
  spam = false;
  backend = "redis";
  spamicity = 0.1;
}

statfile {
  symbol = "BAYES_SPAM";
  spam = true;
  backend = "redis";
  spamicity = 0.95;
}

# Settings for temp mail specific checks
tempmail {
  enabled = true;
  # Check for known temp mail domains
  temp_domains = ["10minutemail.com", "guerrillamail.com", "temp-mail.org", "maildrop.cc"];
  # Score increase for temp mail domains
  temp_domain_score = 5.0;
}

# Custom symbols
symbols {
  "TEMP_MAIL_DOMAIN" {
    score = 5.0;
    description = "Email from known temporary mail domain";
    one_shot = true;
  }

  "SHORT_BODY" {
    score = 1.0;
    description = "Email body is too short";
    one_shot = true;
  }

  "EXCESSIVE_CAPS" {
    score = 3.0;
    description = "Excessive capitalization in subject";
    one_shot = true;
  }
}

# Milter headers
milter_headers {
  use = ["authentication-results", "x-spam-status"];
  extended_spam_headers = true;
}