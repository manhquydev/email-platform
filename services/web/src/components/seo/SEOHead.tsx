import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

/**
 * SEOHead - Dynamic meta tags component for SEO optimization
 * Updates document head with page-specific meta tags for better search engine visibility
 */
interface SEOHeadProps {
  /** Page title - will be appended with brand name */
  title?: string;
  /** Meta description for search results */
  description?: string;
  /** Canonical URL path (e.g., '/login') */
  path?: string;
  /** Open Graph image URL */
  image?: string;
  /** Page type for Open Graph */
  type?: 'website' | 'article';
  /** Disable brand suffix in title */
  noSuffix?: boolean;
}

const BASE_URL = 'https://app.manhquy.id.vn';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;
const BRAND_NAME = 'Ephemera';

export function SEOHead({
  title,
  description,
  path = '',
  image = DEFAULT_IMAGE,
  type = 'website',
  noSuffix = false,
}: SEOHeadProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'vi';

  // Build full title with brand suffix
  const fullTitle = title
    ? (noSuffix ? title : `${title} | ${BRAND_NAME}`)
    : `${BRAND_NAME} - Email Tạm Thời Chuyên Nghiệp`;

  // Build canonical URL
  const canonicalUrl = `${BASE_URL}${path}`;

  // Alternate language URLs for hreflang
  const altLangUrl = currentLang === 'vi'
    ? `${BASE_URL}${path}?lang=en`
    : `${BASE_URL}${path}?lang=vi`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Language Alternates */}
      <link rel="alternate" hrefLang={currentLang} href={canonicalUrl} />
      <link rel="alternate" hrefLang={currentLang === 'vi' ? 'en' : 'vi'} href={altLangUrl} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={image} />
      <meta property="og:locale" content={currentLang === 'vi' ? 'vi_VN' : 'en_US'} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}

export default SEOHead;
