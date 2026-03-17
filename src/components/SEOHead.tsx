import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://tiktok-tale-tech.lovable.app';
const SITE_NAME = 'Flowa';
const DEFAULT_OG_IMAGE = 'https://storage.googleapis.com/gpt-engineer-file-uploads/ap5jSIXLX5NQqukPwVUDGUi3VdW2/social-images/social-1767767626719-Untitled.jpg';

export interface ArticleData {
  author: string;
  publishDate: string; // ISO 8601
  modifiedDate?: string;
  section: string;
  tags?: string[];
  readingTime?: string; // ISO 8601 duration, e.g. "PT15M"
  wordCount?: number;
  authorUrl?: string;
  authorJobTitle?: string;
  authorSameAs?: string[];
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: string;
  article?: ArticleData;
  breadcrumbs?: BreadcrumbItem[];
  noIndex?: boolean;
  children?: React.ReactNode;
}

export function SEOHead({
  title,
  description,
  canonicalPath = '/',
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  article,
  breadcrumbs,
  noIndex = false,
  children,
}: SEOHeadProps) {
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const fullTitle = title.includes('Flowa') ? title : `${title} | Flowa`;

  // Article JSON-LD
  const articleJsonLd = article
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        image: ogImage,
        author: {
          '@type': 'Person',
          name: article.author,
          ...(article.authorUrl && { url: article.authorUrl }),
          ...(article.authorJobTitle && { jobTitle: article.authorJobTitle }),
          ...(article.authorSameAs?.length && { sameAs: article.authorSameAs }),
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          logo: {
            '@type': 'ImageObject',
            url: `${SITE_URL}/favicon.png`,
          },
        },
        datePublished: article.publishDate,
        dateModified: article.modifiedDate || article.publishDate,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        articleSection: article.section,
        keywords: article.tags?.join(', '),
        ...(article.readingTime && { timeRequired: article.readingTime }),
        ...(article.wordCount && { wordCount: article.wordCount }),
      }
    : null;

  // BreadcrumbList JSON-LD
  const breadcrumbJsonLd = breadcrumbs?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: `${SITE_URL}${item.url}`,
        })),
      }
    : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="vi_VN" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@Flowa" />

      {/* Article meta */}
      {article && (
        <>
          <meta property="article:published_time" content={article.publishDate} />
          <meta property="article:modified_time" content={article.modifiedDate || article.publishDate} />
          <meta property="article:author" content={article.author} />
          <meta property="article:section" content={article.section} />
        </>
      )}

      {/* JSON-LD */}
      {articleJsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(articleJsonLd)}
        </script>
      )}
      {breadcrumbJsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbJsonLd)}
        </script>
      )}

      {children}
    </Helmet>
  );
}

// Organization + WebSite schema for landing page
export function LandingSEOSchemas() {
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Flowa',
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    description: 'Nền tảng AI tạo nội dung đa kênh thông minh',
    sameAs: [
      'https://facebook.com/flowa.vn',
      'https://linkedin.com/company/flowa',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@flowa.vn',
      contactType: 'customer service',
      availableLanguage: 'Vietnamese',
    },
  };

  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Flowa',
    url: SITE_URL,
    description: 'Nền tảng AI tạo nội dung đa kênh thông minh',
    inLanguage: 'vi',
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(webSiteSchema)}</script>
    </Helmet>
  );
}

// FAQPage schema
export function FAQSEOSchema({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
    </Helmet>
  );
}
