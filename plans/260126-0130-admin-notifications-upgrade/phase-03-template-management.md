# Phase 3: Template Management

## Context Links
- [Parent Plan](./plan.md)
- [UI Research](./research/researcher-02-notification-ui-patterns.md)
- [Phase 1 - API](./phase-01-database-schema-api.md)

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 6h
- **Description:** Build template management UI with rich text editor, variable insertion, and multi-device preview.

## Key Insights
- Use TipTap for rich text editing (headless, extensible)
- Variables rendered as non-editable "chips" (e.g., `{{username}}`)
- Preview modal with Desktop/Mobile/Telegram views
- Card grid layout for template browsing

## Requirements

### Functional
- Create/edit/archive templates
- Rich text editor with formatting toolbar
- Variable insertion via "@" menu or toolbar button
- Preview in different formats (Web, Telegram)
- Clone template functionality
- Template categories/tags

### Non-Functional
- Editor loads < 200ms
- Auto-save draft every 30s
- Keyboard shortcuts for formatting

## Architecture

```
TemplateManagementTab
├── TemplateGrid (card view)
│   └── TemplateCard (preview, actions)
├── TemplateEditorModal
│   ├── TipTapEditor
│   │   └── VariableExtension
│   └── PreviewPanel
└── TemplatePreviewModal
    ├── DesktopView
    ├── MobileView
    └── TelegramView
```

## Related Code Files

### Create
- `services/web/src/pages/admin/admin-notification-modules/template-management-tab.tsx`
- `services/web/src/pages/admin/admin-notification-modules/template-grid.tsx`
- `services/web/src/pages/admin/admin-notification-modules/template-editor-modal.tsx`
- `services/web/src/pages/admin/admin-notification-modules/template-preview-modal.tsx`
- `services/web/src/pages/admin/admin-notification-modules/tiptap-editor.tsx`
- `services/web/src/pages/admin/admin-notification-modules/tiptap-variable-extension.ts`
- `services/web/src/pages/admin/admin-notification-modules/template-hooks.ts`

## Implementation Steps

### 1. Install TipTap
```bash
cd services/web && pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
```

### 2. Create Variable Extension
```typescript
// Custom TipTap node for {{variable}} chips
const VariableNode = Node.create({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return { name: { default: null } };
  },
  parseHTML() {
    return [{ tag: 'span[data-variable]' }];
  },
  renderHTML({ node }) {
    return ['span', {
      'data-variable': node.attrs.name,
      class: 'variable-chip'
    }, `{{${node.attrs.name}}}`];
  },
});
```

### 3. Create Editor Toolbar
- Bold, Italic, Underline, Strikethrough
- Code block (for error messages)
- Link insertion
- Variable insertion button

### 4. Available Variables
```typescript
const TEMPLATE_VARIABLES = [
  { name: 'username', description: 'Tên người dùng' },
  { name: 'email', description: 'Email người dùng' },
  { name: 'tier', description: 'Gói đăng ký' },
  { name: 'date', description: 'Ngày hiện tại' },
  { name: 'appName', description: 'Tên ứng dụng' },
];
```

### 5. Template Card Design
```tsx
<TemplateCard>
  <TypeIcon type={template.type} />
  <Title>{template.name}</Title>
  <Preview>{truncate(template.message, 80)}</Preview>
  <Footer>
    <Badge>{template.type}</Badge>
    <Actions>
      <EditButton />
      <CloneButton />
      <ArchiveButton />
    </Actions>
  </Footer>
</TemplateCard>
```

### 6. Preview Modal
- Tab switcher: Desktop | Mobile | Telegram
- Render with sample variable data
- Telegram view shows MarkdownV2 formatted

## Todo List
- [ ] Install TipTap dependencies
- [ ] Create TipTap editor component
- [ ] Create variable extension node
- [ ] Create editor toolbar
- [ ] Create TemplateManagementTab
- [ ] Create TemplateGrid with cards
- [ ] Create TemplateCard component
- [ ] Create TemplateEditorModal
- [ ] Create TemplatePreviewModal with tabs
- [ ] Create template API hooks
- [ ] Add clone functionality
- [ ] Add archive with confirmation
- [ ] Add empty state illustration
- [ ] Test variable insertion flow

## Success Criteria
- [ ] Templates display in card grid
- [ ] Editor supports formatting + variables
- [ ] Variables render as chips
- [ ] Preview shows all 3 formats
- [ ] Clone creates copy with "-copy" suffix
- [ ] Archive hides from list (not deletes)

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| TipTap bundle size | Tree-shake unused extensions |
| Variable injection XSS | Sanitize on render, escape HTML |

## Security Considerations
- Escape variables when rendering to prevent XSS
- Validate variable names against allowlist
- Admin-only access

## Next Steps
- Templates used in compose form (dropdown select)
- Templates linked to scheduled notifications
