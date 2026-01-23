import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Getting Started',
      items: ['getting-started/introduction', 'getting-started/authentication', 'getting-started/quickstart'],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api-reference/overview',
        'api-reference/inboxes',
        'api-reference/messages',
        'api-reference/domains',
        'api-reference/webhooks',
      ],
    },
    {
      type: 'category',
      label: 'SDKs',
      items: [
        'sdks/javascript',
        'sdks/python',
        'sdks/go',
        'sdks/php',
        'sdks/java',
        'sdks/dotnet',
        'sdks/cli',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: ['guides/test-automation', 'guides/webhook-integration', 'guides/rate-limiting'],
    },
    {
      type: 'category',
      label: 'Examples',
      items: ['examples/playwright', 'examples/cypress', 'examples/selenium', 'examples/pytest'],
    },
  ],
};

export default sidebars;
