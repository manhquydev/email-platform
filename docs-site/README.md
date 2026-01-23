# Ephemera Developer Portal

Documentation site for Ephemera API built with Docusaurus 3.

## Development

```bash
npm install
npm start
```

## Build

```bash
npm run build
npm run serve  # Preview production build
```

## Deploy

Deployed automatically to Vercel on push to main branch.

**Live URL:** https://docs.manhquy.click

## Structure

```
docs/
├── getting-started/    # Introduction, auth, quickstart
├── api-reference/      # API endpoint documentation
├── sdks/               # SDK documentation (7 languages)
├── guides/             # How-to guides
└── examples/           # Framework-specific examples
```

## Configuration

- `docusaurus.config.ts` - Site configuration
- `sidebars.ts` - Navigation structure
- `src/css/custom.css` - Theme customization
