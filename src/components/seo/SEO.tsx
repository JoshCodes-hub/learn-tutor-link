import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  structuredData?: object;
}

const DEFAULT_TITLE = "OverraPrep AI – FUTA";
const DEFAULT_DESCRIPTION =
  "Ace your FUTA CBT exams with AI-powered practice questions, instant explanations, and personalized learning paths. Join thousands of students preparing smarter.";
const DEFAULT_IMAGE = "https://lovable.dev/opengraph-image-p98pqg.png";
const DEFAULT_URL = "https://overraprep.com";

export const SEO = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = "FUTA, CBT, exam preparation, past questions, AI tutoring, online learning, Nigeria university, computer based test",
  image = DEFAULT_IMAGE,
  url = DEFAULT_URL,
  type = "website",
  noindex = false,
  structuredData,
}: SEOProps) => {
  const fullTitle = title ? `${title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE;

  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "OverraPrep AI",
    description: DEFAULT_DESCRIPTION,
    url: DEFAULT_URL,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "NGN",
    },
    provider: {
      "@type": "Organization",
      name: "OverraPrep AI",
    },
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="OverraPrep AI" />
      <meta property="og:locale" content="en_NG" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData || defaultStructuredData)}
      </script>
    </Helmet>
  );
};
