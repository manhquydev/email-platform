# Phase 02 — Blanket replace literals (2-pass)

**Risk:** 🟡 · **Depends:** Phase 01 (apex-web spots xử trước để Pass A/B nhất quán)

## Target list (curated)
Build danh sách file chứa `manhquy.click` trong `services packages scripts`, LOẠI:
`node_modules/`, `**/dist/`, `services/extension/.output/`, `*.txt`.
```bash
grep -rIl "manhquy\.click" services packages scripts \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.output --exclude-dir=coverage 2>/dev/null \
  | grep -vE '\.(txt)$' \
  | grep -vE 'services/api/openapi/openapi\.(json|yaml)$' \
  > /tmp/domain_targets_code.txt
```
Kỳ vọng: SDK (`packages/sdk-js|python|go|php|java|dotnet`, `packages/cli`), web content pages (Support, Plans, Legal/*, register/hero/docs/api modules), `services/web/index.html`, `scripts/*.py|*.sh`, telegram, `registry.ts`.
> LOẠI `coverage/` (H1) + openapi artifacts (M2) khỏi list. openapi regenerate ở Phase 05.

## Replace 2-pass (trên target list)
```bash
files=$(cat /tmp/domain_targets_code.txt)
# Pass A: bare-apex web base → app.
sed -i -E 's#https?://manhquy\.click#https://app.manhquy.id.vn#g' $files
# Pass B: phần còn lại → id.vn (api./app./mail./grafana./emails/prose)
sed -i -E 's#manhquy\.click#manhquy.id.vn#g' $files
```

## Lưu ý per-area
- **SDK/CLI:** default `baseUrl`/`base_url` `https://api.manhquy.click` → Pass B → `api.manhquy.id.vn` ✅ (literal đúng cho package publish).
- **Emails** `support@/legal@/privacy@/abuse@manhquy.click` → Pass B → `@manhquy.id.vn` ✅ (apex mail).
- **Web content snippets** (curl ví dụ `api.manhquy.click`) → Pass B → `api.manhquy.id.vn` ✅.
- **scripts/deploy_ssh.py** webhook `https://api.manhquy.click/telegram/webhook`: Pass A biến thành `app.`? → KHÔNG: regex Pass A chỉ khớp `https://manhquy.click` (không có subdomain). `api.manhquy.click` có subdomain → Pass A bỏ qua, Pass B → `api.manhquy.id.vn` ✅. (Xác nhận lại sau replace.)

## Validation
- `grep -rI "manhquy\.click" $(cat /tmp/domain_targets_code.txt)` → rỗng.
- Đọc `scripts/deploy_ssh.py` webhook = `api.manhquy.id.vn`.
- `git diff --stat` khớp target list, không dính `dist/`.

## Rollback
`git checkout -- <area>`; thay đổi thuần literal, revert theo file/area.
