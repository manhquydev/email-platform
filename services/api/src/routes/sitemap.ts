import { FastifyInstance, FastifyReply } from 'fastify';
import { XMLBuilder } from 'xmlbuilder';

interface SitemapEntry {
  url: string;
  lastmod?: Date;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export default async function sitemapRoutes(fastify: FastifyInstance) {
  // Generate sitemap
  fastify.get('/sitemap.xml', async (_, reply: FastifyReply) => {
    const baseUrl = process.env.WEB_URL || 'https://app.manhquy.click';
    const currentDate = new Date();

    const sitemapEntries: SitemapEntry[] = [
      // Static pages
      {
        url: baseUrl,
        lastmod: currentDate,
        changefreq: 'daily',
        priority: 1.0
      },
      {
        url: `${baseUrl}/pricing`,
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: 0.9
      },
      {
        url: `${baseUrl}/signup`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        url: `${baseUrl}/login`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.7
      },
      {
        url: `${baseUrl}/terms`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.3
      },
      {
        url: `${baseUrl}/privacy`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.3
      },

      // Documentation pages
      {
        url: `${baseUrl}/docs/getting-started/introduction`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        url: `${baseUrl}/docs/getting-started/quick-start`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        url: `${baseUrl}/docs/api/authentication`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.7
      },
      {
        url: `${baseUrl}/docs/api/endpoints/domains`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.7
      },
      {
        url: `${baseUrl}/docs/api/endpoints/inboxes`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.7
      },
      {
        url: `${baseUrl}/docs/api/endpoints/messages`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.7
      },
      {
        url: `${baseUrl}/docs/guides/custom-domains`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.6
      },
      {
        url: `${baseUrl}/docs/guides/email-forwarding`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.6
      },
      {
        url: `${baseUrl}/docs/guides/using-the-api`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.6
      },
      {
        url: `${baseUrl}/docs/tutorials/nodejs-sdk`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.5
      },
      {
        url: `${baseUrl}/docs/tutorials/python-sdk`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.5
      },
      {
        url: `${baseUrl}/docs/faq/general`,
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: 0.6
      },
      {
        url: `${baseUrl}/docs/faq/troubleshooting`,
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: 0.6
      }
    ];

    // Build XML
    const root = new XMLBuilder({ version: '1.0', encoding: 'UTF-8' })
      .ele('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });

    sitemapEntries.forEach(entry => {
      const urlElement = root.ele('url');
      urlElement.ele('loc').txt(entry.url);

      if (entry.lastmod) {
        urlElement.ele('lastmod').txt(entry.lastmod.toISOString().split('T')[0]);
      }

      if (entry.changefreq) {
        urlElement.ele('changefreq').txt(entry.changefreq);
      }

      if (entry.priority) {
        urlElement.ele('priority').txt(entry.priority.toString());
      }
    });

    const xml = root.end({ pretty: true });

    reply.type('application/xml').send(xml);
  });

  // Generate sitemap index (for multiple sitemaps if needed in future)
  fastify.get('/sitemap_index.xml', async (_, reply: FastifyReply) => {
    const baseUrl = process.env.WEB_URL || 'https://app.manhquy.click';
    const currentDate = new Date();

    const root = new XMLBuilder({ version: '1.0', encoding: 'UTF-8' })
      .ele('sitemapindex', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });

    const sitemap = root.ele('sitemap');
    sitemap.ele('loc').txt(`${baseUrl}/sitemap.xml`);
    sitemap.ele('lastmod').txt(currentDate.toISOString().split('T')[0]);

    const xml = root.end({ pretty: true });

    reply.type('application/xml').send(xml);
  });

  // Generate robots.txt
  fastify.get('/robots.txt', async (_, reply: FastifyReply) => {
    const robotsTxt = `User-agent: *
Allow: /
Allow: /docs/
Allow: /api
Allow: /public/auth/signup
Disallow: /app
Disallow: /admin
Disallow: /api/*
Disallow: /private

Sitemap: ${process.env.WEB_URL || 'https://app.manhquy.click'}/sitemap.xml
Sitemap: ${process.env.WEB_URL || 'https://app.manhquy.click'}/sitemap_index.xml`;

    reply.type('text/plain').send(robotsTxt);
  });

  // Generate ads.txt
  fastify.get('/ads.txt', async (_, reply: FastifyReply) => {
    const adsTxt = `# TempMail Pro
# Contact: support@manhquy.click

google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
`;

    reply.type('text/plain').send(adsTxt);
  });

  // Security.txt
  fastify.get('/.well-known/security.txt', async (_, reply: FastifyReply) => {
    const securityTxt = `Contact: security@manhquy.click
Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
Preferred-Languages: en
Policy: https://manhquy.click/security-policy
Hiring: https://manhquy.click/security-hiring`;

    reply.type('text/plain').send(securityTxt);
  });
}