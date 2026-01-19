# Development Rules

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** You ALWAYS follow these principles: **YAGNI (You Aren't Gonna Need It) - KISS (Keep It Simple, Stupid) - DRY (Don't Repeat Yourself)**

## General
- **File Naming**: Use kebab-case for file names with a meaningful name that describes the purpose of the file, doesn't matter if the file name is long, just make sure when LLMs read the file names while using Grep or other tools, they can understand the purpose of the file right away without reading the file content.
- **File Size Management**: Keep individual code files under 200 lines for optimal context management
  - Split large files into smaller, focused components/modules
  - Use composition over inheritance for complex widgets
  - Extract utility functions into separate modules
  - Create dedicated service classes for business logic
- When looking for docs, activate `docs-seeker` skill (`context7` reference) for exploring latest docs.
- Use `gh` bash command to interact with Github features if needed
- Use `psql` bash command to query Postgres database for debugging if needed
- Use `ai-multimodal` skill for describing details of images, videos, documents, etc. if needed
- Use `ai-multimodal` skill and `imagemagick` skill for generating and editing images, videos, documents, etc. if needed
- Use `sequential-thinking` and `debugging` skills for sequential thinking, analyzing code, debugging, etc. if needed
- **[IMPORTANT]** Follow the codebase structure and code standards in `./docs` during implementation.
- **[IMPORTANT]** Do not just simulate the implementation or mocking them, always implement the real code.

## Code Quality Guidelines
- Read and follow codebase structure and code standards in `./docs`
- Don't be too harsh on code linting, but **make sure there are no syntax errors and code are compilable**
- Prioritize functionality and readability over strict style enforcement and code formatting
- Use reasonable code quality standards that enhance developer productivity
- Use try catch error handling & cover security standards
- Use `code-reviewer` agent to review code after every implementation

## Pre-commit/Push Rules
- Run linting before commit
- Run tests before push (DO NOT ignore failed tests just to pass the build or github actions)
- Keep commits focused on the actual code changes
- **DO NOT** commit and push any confidential information (such as dotenv files, API keys, database credentials, etc.) to git repository!
- Create clean, professional commit messages without AI references. Use conventional commit format.

## Code Implementation
- Write clean, readable, and maintainable code
- Follow established architectural patterns
- Implement features according to specifications
- Handle edge cases and error scenarios
- **DO NOT** create new enhanced files, update to the existing files directly.

## Component Modularization Standards

### When to Modularize
- Components exceeding **200 lines** must be split into modules
- Complex components with multiple concerns (hooks, utilities, sub-components)
- Reusable logic that can be shared across components

### Module Structure Pattern
For a component `ComponentName.tsx`, create `component-name-modules/`:
```
component-name-modules/
├── component-name-utils.ts      # Types, interfaces, constants
├── component-name-hooks.ts      # Custom React hooks
├── component-name-components.tsx # Sub-components
└── index.ts                      # Barrel export
```

### Naming Conventions
- Use **kebab-case** for module directories: `quick-generate-card-modules/`
- Use **kebab-case** for module files: `quick-generate-card-hooks.ts`
- Suffix files by concern: `-utils.ts`, `-hooks.ts`, `-components.tsx`

### Barrel Export Pattern
```typescript
// index.ts
export type { ComponentProps } from "./component-utils";
export { CONSTANTS } from "./component-utils";
export { useComponentHook } from "./component-hooks";
export { SubComponent1, SubComponent2 } from "./component-components";
```

## Vercel React Best Practices

### Critical Performance Rules
- `bundle-barrel-imports`: Import directly from modules, avoid re-exporting everything
- `async-parallel`: Use `Promise.all()` for independent async operations
- `bundle-dynamic-imports`: Use `next/dynamic` or `React.lazy()` for heavy components

### Re-render Optimization
- `rerender-memo`: Use `useMemo` for expensive derived state
- `rerender-functional-setstate`: Use `useCallback` for stable event handlers
- `rerender-lazy-state-init`: Pass function to `useState` for expensive initial values

### Rendering Performance
- `rendering-hoist-jsx`: Extract static JSX/constants outside components
- `rendering-conditional-render`: Use ternary (`? :`) instead of `&&` for conditionals

### Example Pattern
```typescript
// ✅ Good: Hoisted constants, memoized derived state
const OPTIONS = [{ label: 'A', value: 1 }] as const;

function Component({ items }) {
  const filtered = useMemo(() => items.filter(x => x.active), [items]);
  const handleClick = useCallback(() => doSomething(), []);
  return <Button onClick={handleClick} />;
}
```