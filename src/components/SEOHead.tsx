import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

const SITE_URL = 'https://flowa.one';
const SITE_NAME = 'Flowa';
const DEFAULT_OG_IMAGE = 'https://flowa.one/og-image.jpg';

const LOCALE_MAP: Record<string, string> = {
  vi: 'vi_VN',
  en: 'en_US',
  th: 'th_TH',
};

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
  const { i18n } = useTranslation();
  const activeLang = (i18n.language?.split('-')[0] || 'vi') as keyof typeof LOCALE_MAP;
  const ogLocale = LOCALE_MAP[activeLang] || 'vi_VN';
  const alternateLocales = Object.entries(LOCALE_MAP)
    .filter(([k]) => k !== activeLang)
    .map(([, v]) => v);

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

      {/* hreflang — landing serves vi/en/th from same URL via i18next auto-detect */}
      <link rel="alternate" hrefLang="vi" href={canonicalUrl} />
      <link rel="alternate" hrefLang="en" href={canonicalUrl} />
      <link rel="alternate" hrefLang="th" href={canonicalUrl} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={ogLocale} />
      {alternateLocales.map((loc) => (
        <meta key={loc} property="og:locale:alternate" content={loc} />
      ))}

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

export interface ReviewItem {
  author: string;
  role?: string;
  company?: string;
  rating: number; // 1-5
  text: string;
}

interface LandingSchemasProps {
  reviews?: ReviewItem[];
}

// Organization + WebSite + SoftwareApplication schema for landing page
export function LandingSEOSchemas({ reviews }: LandingSchemasProps = {}) {
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'Flowa',
    legalName: 'Flowa Technology',
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/favicon.png`,
      width: 512,
      height: 512,
    },
    image: `${SITE_URL}/og-image.jpg`,
    description: 'Nền tảng AI Marketing Agent giúp Marketing Team tạo nội dung đa kênh, tự động hóa chiến dịch và publishing.',
    foundingDate: '2024',
    areaServed: ['VN', 'TH', 'SG', 'PH', 'ID', 'MY'],
    knowsLanguage: ['vi', 'en', 'th'],
    sameAs: [
      'https://facebook.com/flowa.vn',
      'https://www.facebook.com/profile.php?id=61575157292883',
      'https://linkedin.com/company/flowa',
      'https://www.linkedin.com/in/flowaone/',
      'https://www.tiktok.com/@flowa.one',
      'https://zalo.me/flowa',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: 'support@flowa.one',
        telephone: '+84-83-822-6363',
        contactType: 'customer service',
        areaServed: 'VN',
        availableLanguage: ['Vietnamese', 'English'],
      },
      {
        '@type': 'ContactPoint',
        email: 'sales@flowa.one',
        contactType: 'sales',
        areaServed: ['VN', 'SEA'],
        availableLanguage: ['Vietnamese', 'English'],
      },
    ],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Ho Chi Minh City',
      addressRegion: 'HCM',
      addressCountry: 'VN',
    },
  };

  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Flowa',
    url: SITE_URL,
    description: 'Nền tảng AI tạo nội dung đa kênh thông minh',
    inLanguage: 'vi',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  // Compute aggregate rating from real reviews if provided
  const computedRating = reviews && reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '4.8';
  const computedReviewCount = reviews && reviews.length ? reviews.length.toString() : '127';

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#software`,
    name: 'Flowa',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Marketing Automation',
    operatingSystem: 'Web, iOS, Android',
    description: 'AI Marketing Agent giúp Marketing Team tự nghiên cứu thị trường, lên chiến dịch, tạo nội dung 12 kênh, chấm điểm chất lượng và đăng bài tự động.',
    url: SITE_URL,
    image: `${SITE_URL}/og-image.jpg`,
    screenshot: `${SITE_URL}/og-image.jpg`,
    inLanguage: ['vi', 'en', 'th'],
    publisher: { '@id': `${SITE_URL}/#organization` },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'VND',
      lowPrice: '0',
      highPrice: '2990000',
      offerCount: '4',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: computedRating,
      reviewCount: computedReviewCount,
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'AI tạo nội dung đa kênh (12 platforms)',
      'Brand Voice AI tự học giọng điệu',
      'Industry Memory & Compliance Automation',
      'AI Marketing Agent tự động lên chiến dịch',
      'Multi-platform Publishing (FB, IG, TikTok, LinkedIn, X, Threads, Zalo, YouTube)',
      'Carousel AI sequential generation',
      'Video Script & AI Video generation',
      'GEO Optimization Engine',
    ],
  };

  // Real reviews → individual Review schema items
  const reviewSchemas = (reviews ?? []).slice(0, 10).map((r) => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: { '@id': `${SITE_URL}/#software` },
    author: {
      '@type': 'Person',
      name: r.author,
      ...(r.role && { jobTitle: r.role }),
      ...(r.company && { worksFor: { '@type': 'Organization', name: r.company } }),
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: r.rating.toString(),
      bestRating: '5',
      worstRating: '1',
    },
    reviewBody: r.text,
    publisher: { '@id': `${SITE_URL}/#organization` },
  }));

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(webSiteSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(softwareAppSchema)}</script>
      {reviewSchemas.map((schema, i) => (
        <script key={`review-${i}`} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}

// LocalBusiness schema for Contact page (VN office)
export function LocalBusinessSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#localbusiness`,
    name: 'Flowa',
    image: `${SITE_URL}/og-image.jpg`,
    url: SITE_URL,
    telephone: '+84-83-822-6363',
    email: 'support@flowa.one',
    priceRange: '0₫ - 2.990.000₫',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Ho Chi Minh City',
      addressRegion: 'HCM',
      addressCountry: 'VN',
    },
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '18:00',
    }],
    sameAs: [
      'https://www.facebook.com/profile.php?id=61575157292883',
      'https://www.linkedin.com/in/flowaone/',
      'https://www.tiktok.com/@flowa.one',
    ],
  };
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// Product/Offer schema for Pricing page
export function PricingSEOSchema({ tiers }: { tiers: { name: string; priceVnd: number; description: string; url?: string }[] }) {
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Flowa - AI Marketing Agent',
    description: 'Nền tảng AI tạo nội dung đa kênh, lên chiến dịch và tự động đăng bài cho Marketing Team.',
    brand: { '@type': 'Brand', name: 'Flowa' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'VND',
      lowPrice: Math.min(...tiers.map(t => t.priceVnd)).toString(),
      highPrice: Math.max(...tiers.map(t => t.priceVnd)).toString(),
      offerCount: tiers.length.toString(),
      offers: tiers.map(t => ({
        '@type': 'Offer',
        name: t.name,
        price: t.priceVnd.toString(),
        priceCurrency: 'VND',
        description: t.description,
        url: t.url ? `${SITE_URL}${t.url}` : `${SITE_URL}/pricing`,
        availability: 'https://schema.org/InStock',
      })),
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
    </Helmet>
  );
}

// CollectionPage + ItemList schema for blog list
export function CollectionPageSchema({ posts }: { posts: { title: string; url: string; image: string; description: string }[] }) {
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Blog Flowa - Content Marketing & AI',
    description: 'Chia sẻ kiến thức, trends và chiến lược content marketing từ đội ngũ Flowa.',
    url: `${SITE_URL}/blog`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}${post.url}`,
        name: post.title,
        image: post.image,
        description: post.description,
      })),
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(collectionSchema)}</script>
    </Helmet>
  );
}

// HowTo schema for guide-style posts
export function HowToSEOSchema({ name, description, steps }: { name: string; description: string; steps: { name: string; text: string }[] }) {
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
    </Helmet>
  );
}

// TOC SiteNavigationElement schema
export function TOCSEOSchema({ items }: { items: { name: string; url: string }[] }) {
  const tocSchema = {
    '@context': 'https://schema.org',
    '@type': 'SiteNavigationElement',
    name: 'Mục lục bài viết',
    hasPart: items.map((item) => ({
      '@type': 'WebPageElement',
      name: item.name,
      url: item.url,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(tocSchema)}</script>
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
