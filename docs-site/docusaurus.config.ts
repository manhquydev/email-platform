import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Ephemera API',
  tagline: 'Temporary email platform for developers',
  favicon: 'img/favicon.ico',
  url: 'https://docs.manhquy.click',
  baseUrl: '/',
  organizationName: 'ephemera',
  projectName: 'ephemera-docs',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/ephemera/docs/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/ephemera-social-card.png',
    navbar: {
      title: 'Ephemera',
      logo: {
        alt: 'Ephemera Logo',
        src: 'img/logo.svg',
      },
      items: [
        { type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs' },
        { to: '/api-explorer', label: 'API Explorer', position: 'left' },
        {
          href: 'https://github.com/ephemera',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/getting-started' },
            { label: 'API Reference', to: '/docs/api-reference/overview' },
            { label: 'SDKs', to: '/docs/sdks/javascript' },
          ],
        },
        {
          title: 'SDKs',
          items: [
            { label: 'JavaScript', to: '/docs/sdks/javascript' },
            { label: 'Python', to: '/docs/sdks/python' },
            { label: 'Go', to: '/docs/sdks/go' },
            { label: 'PHP', to: '/docs/sdks/php' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: 'https://github.com/ephemera' },
            { label: 'Status', href: 'https://status.manhquy.click' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Ephemera. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'php', 'java', 'csharp', 'go'],
    },
    algolia: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'ephemera',
      contextualSearch: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
