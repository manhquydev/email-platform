# AI Agent Directory

Structured prompts and workflows for AI-assisted development on Ephemera email platform.

## Directory Structure

```
.agent/
├── README.md              # This file
├── system-prompt.md       # Base context for AI agents
├── architecture-context.md # System design reference
├── workflows/
│   ├── api-development.md      # Backend feature workflow
│   └── frontend-development.md # React component workflow
└── prompts/
    ├── new-api-feature.md      # Template: New endpoints
    ├── debug-issue.md          # Template: Production bugs
    ├── refactor-code.md        # Template: Code cleanup
    ├── optimize-performance.md # Template: Speed improvements
    ├── database-migration.md   # Template: Schema changes
    └── security-review.md      # Template: Security audit
```

## Usage

### For New Features
1. Read `system-prompt.md` for context
2. Use appropriate workflow (`api-development.md` or `frontend-development.md`)
3. Copy relevant prompt template and fill in details

### For Debugging
1. Use `debug-issue.md` template
2. Include error logs and reproduction steps
3. Reference `architecture-context.md` for system understanding

### For Optimization
1. Use `optimize-performance.md` template
2. Include metrics/traces showing the issue
3. Follow constraints to avoid breaking changes

## Best Practices

1. **Be Specific**: Include file paths, line numbers, error messages
2. **Provide Context**: Reference similar implementations
3. **Set Constraints**: Clarify what NOT to change
4. **Include Tests**: Always request test coverage
5. **Check Schema**: Reference Prisma schema for data model

## Template Variables

Common placeholders in templates:
- `[Component Name]` - Feature or file being worked on
- `[path/to/file]` - Absolute path from project root
- `[Brief Description]` - One-line summary

## Integration with Claude Code

These prompts work with:
- Claude Code CLI
- Claude Code VS Code extension
- Any LLM-based coding assistant

Copy template, fill in specifics, paste into assistant.
