import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  name?: string;
  type?: string;
  image?: string;
  url?: string;
  keywords?: string;
}

export default function SEO({
  title,
  description,
  name = 'Soccer Circular',
  type = 'website',
  image,
  url,
  keywords
}: SEOProps) {
  const defaultTitle = 'Soccer Circular - Empowering the Next Generation of Football Athletes';
  const defaultDescription = 'Soccer Circular is the premier platform connecting football academies, players, and scouts to foster talent and create professional opportunities.';
  const defaultImage = `${window.location.origin}/images/hero-bg.jpg`; // A default image from public assets
  const defaultKeywords = 'football, football academies, youth football, football scouts, Soccer Circular, athletes';

  const currentUrl = url || window.location.href;
  const seoTitle = title ? `${title} | ${name}` : defaultTitle;
  const seoDescription = description || defaultDescription;
  const seoImage = image || defaultImage;
  const seoKeywords = keywords || defaultKeywords;

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{seoTitle}</title>
      <meta name='description' content={seoDescription} />
      <meta name='keywords' content={seoKeywords} />

      {/* Open Graph tags */}
      <meta property='og:type' content={type} />
      <meta property='og:title' content={seoTitle} />
      <meta property='og:description' content={seoDescription} />
      <meta property='og:url' content={currentUrl} />
      <meta property='og:site_name' content={name} />
      <meta property='og:image' content={seoImage} />

      {/* Twitter tags */}
      <meta name='twitter:creator' content={name} />
      <meta name='twitter:card' content={type === 'article' ? 'summary_large_image' : 'summary'} />
      <meta name='twitter:title' content={seoTitle} />
      <meta name='twitter:description' content={seoDescription} />
      <meta name='twitter:image' content={seoImage} />
      
      {/* Canonical link */}
      <link rel="canonical" href={currentUrl} />
    </Helmet>
  );
}
