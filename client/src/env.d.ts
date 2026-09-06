/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_CONFIG_JSON?: string;
  readonly SHOPIFY_STORE_DOMAIN?: string;
  readonly SHOPIFY_STOREFRONT_ACCESS_TOKEN?: string;
  readonly SHOPIFY_API_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
