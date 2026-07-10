# Phase 04 — Docs

**Risk:** 🟢 · **Depends:** none (song song)

## Scope (giữ nhất quán thương hiệu, không ảnh hưởng runtime)
- `README.md` (Live Demo URLs + prod-ready badge link).
- `docs/server-configuration-guide.md`, `deployment_guide.md` (ví dụ domain).
- `docs/project-overview-pdr.md`, `docs/project-roadmap.md`.
- `docs-site/**` (8 file: docusaurus config, api-reference, guides, sdk examples).

## Replace
Target list docs:
```bash
grep -rIl "manhquy\.click" README.md docs docs-site \
  --exclude-dir=node_modules 2>/dev/null | grep -vE '/journals/' > /tmp/domain_targets_docs.txt
```
Áp Pass A+B lên `/tmp/domain_targets_docs.txt`.

## KHÔNG đụng
`docs/journals/**`, `plans/archive/**`, `plans/reports/**`, `log/`, `buglog.md`, `blueprint.md` (lịch sử — giữ nguyên).

## Validation
`grep -rI "manhquy\.click" $(cat /tmp/domain_targets_docs.txt)` → rỗng.
