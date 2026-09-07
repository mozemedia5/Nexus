import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  canonicalPath?: string;
  type?: string;
  jsonLd?: object | object[];
}

const DEFAULT_TITLE = "Nexus A Liverton Store — Smart Home, Beauty & Wellness Essentials";
const DEFAULT_DESCRIPTION = "Explore Nexus A Liverton Store: Curated Smart Home devices, intelligent lighting, and Beauty & Wellness essentials with worldwide global delivery.";
const DEFAULT_KEYWORDS = "Nexus, Liverton Store, Smart Home, Beauty and Wellness, Smart Lighting, Home Automation, Skincare Tech, Global Shipping";
const DEFAULT_IMAGE = "https://liverton-nexus.vercel.app/logo.png";
const DOMAIN = "https://liverton-nexus.vercel.app";

export default function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  image = DEFAULT_IMAGE,
  canonicalPath = "/",
  type = "website",
  jsonLd,
}: SEOProps) {
  useEffect(() => {
    // Set document title
    document.title = title;

    // Helper function to update or create meta element
    const setMetaTag = (selector: string, attributeName: string, attributeValue: string, content: string) => {
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // Primary Meta Tags
    setMetaTag('meta[name="description"]', 'name', 'description', description);
    setMetaTag('meta[name="keywords"]', 'name', 'keywords', keywords);

    // Open Graph / Facebook / WhatsApp
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', type);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', image);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', `${DOMAIN}${canonicalPath}`);
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', 'Nexus A Liverton Store');

    // Twitter
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', image);

    // Canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", `${DOMAIN}${canonicalPath}`);

    // Dynamic JSON-LD Structured Data
    const scriptId = "seo-json-ld";
    let scriptElement = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (scriptElement) {
      scriptElement.remove();
    }

    if (jsonLd) {
      scriptElement = document.createElement("script");
      scriptElement.id = scriptId;
      scriptElement.type = "application/ld+json";
      scriptElement.text = JSON.stringify(jsonLd);
      document.head.appendChild(scriptElement);
    }
  }, [title, description, keywords, image, canonicalPath, type, jsonLd]);

  return null;
}
