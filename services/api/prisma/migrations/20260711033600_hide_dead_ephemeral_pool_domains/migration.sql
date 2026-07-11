-- Data migration: hide dead legacy domains from the public/ephemeral inbox
-- pool (GET /ephemeral/domains, POST /ephemeral/inbox default selection).
--
-- manhquy.online and manhquy.site returned SERVFAIL on every record type
-- (no delegated nameservers at all) as of 2026-07-11 -- these zones are gone,
-- not fixable via DNS record changes, so mail sent to inboxes on them can
-- never arrive. Setting isPublic=false removes them as options for new
-- inbox creation without touching existing rows/data (no delete/cascade).
--
-- manhquy.click, edhub.tech, tinygeniushubvn.tech, viettablet.tech, and
-- weddinginvite.me all route MX to mail.manhquy.click, which was proxied
-- through Cloudflare (SMTP unreachable) and has since been fixed back to a
-- direct, unproxied A record -- so those domains are left public/enabled.
UPDATE "Domain"
SET "isPublic" = false
WHERE "name" IN ('manhquy.online', 'manhquy.site')
  AND "isPublic" = true;
