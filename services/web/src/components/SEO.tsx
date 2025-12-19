import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  type?: 'website' | 'article';
  image?: string;
  noindex?: boolean;
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  articleSection?: string;
  tags?: string[];
}

export function SEO({
  title,
  description,
  canonical,
  type = 'website',
  image,
  noindex = false,
  keywords = [],
  author,
  publishedTime,
  modifiedTime,
  articleSection,
  tags = []
}: SEOProps) {
  const siteTitle = title ? `${title} | TempMail Pro` : 'TempMail Pro - Temporary Email Service';
  const siteDescription = description ||
    'Create temporary email addresses instantly with TempMail Pro. Protect your privacy, avoid spam, and test applications with our secure disposable email service.';
  const siteImage = image || `${process.env.VITE_WEB_URL}/images/tempmail-pro-og.png`;
  const siteCanonical = canonical || process.env.VITE_WEB_URL;

  const jsonLd = type === 'article' ? {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: siteDescription,
    image: siteImage,
    author: {
      '@type': 'Organization',
      name: 'TempMail Pro'
    },
    publisher: {
      '@type': 'Organization',
      name: 'TempMail Pro',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.VITE_WEB_URL}/images/logo.png`
      }
    },
    datePublished: publishedTime,
    dateModified: modifiedTime,
    articleSection: articleSection,
    keywords: tags.join(', ')
  } : {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TempMail Pro',
    description: siteDescription,
    url: process.env.VITE_WEB_URL,
    logo: `${process.env.VITE_WEB_URL}/images/logo.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '',
      contactType: 'customer service',
      availableLanguage: ['English']
    },
    sameAs: [
      'https://twitter.com/tempmailpro',
      'https://github.com/manhquydev/tempmail-pro'
    ]
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={siteDescription} />
      <meta name="keywords" content={keywords.join(', ')} />
      <link rel="canonical" href={siteCanonical} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={siteCanonical} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      <meta property="og:image" content={siteImage} />
      <meta property="og:site_name" content="TempMail Pro" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={siteCanonical} />
      <meta property="twitter:title" content={siteTitle} />
      <meta property="twitter:description" content={siteDescription} />
      <meta property="twitter:image" content={siteImage} />
      <meta property="twitter:site" content="@tempmailpro" />

      {/* Additional Meta */}
      <meta name="author" content={author || 'TempMail Pro Team'} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="theme-color" content="#6366f1" />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>

      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

      {/* DNS Prefetch */}
      <link rel="dns-prefetch" href="//api.manhquy.click" />
      <link rel="dns-prefetch" href="//app.manhquy.click" />

      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    </Helmet>
  );
}

// Blog post specific SEO component
export function BlogSEO({
  title,
  description,
  canonical,
  author,
  publishedTime,
  modifiedTime,
  tags,
  category,
  image
}: SEOProps) {
  return (
    <SEO
      title={title}
      description={description}
      canonical={canonical}
      type="article"
      image={image}
      author={author}
      publishedTime={publishedTime}
      modifiedTime={modifiedTime}
      articleSection={category}
      tags={tags}
      keywords={tags}
    />
  );
}

// Product/Service page SEO
export function ProductSEO({
  title,
  description,
  canonical,
  features,
  price,
  currency = 'USD',
  availability = 'InStock'
}: {
  title?: string;
  description?: string;
  canonical?: string;
  features?: string[];
  price?: number;
  currency?: string;
  availability?: string;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title || 'TempMail Pro',
    description: description || 'Temporary email service',
    url: canonical || process.env.VITE_WEB_URL,
    image: `${process.env.VITE_WEB_URL}/images/tempmail-pro-og.png`,
    brand: {
      '@type': 'Brand',
      name: 'TempMail Pro'
    },
    offers: price ? {
      '@type': 'Offer',
      price: price,
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      seller: {
        '@type': 'Organization',
        name: 'TempMail Pro'
      }
    } : undefined,
    featureList: features
  };

  return (
    <Helmet>
      <title>{title ? `${title} | TempMail Pro` : 'TempMail Pro'}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical || process.env.VITE_WEB_URL} />

      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </Helmet>
  );
}