export type ShopifyImage = { url: string; altText: string | null; width?: number; height?: number };

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  price: { amount: string; currencyCode: string };
  compareAtPrice?: { amount: string; currencyCode: string } | null;
};

export type Product = {
  id: string;
  handle: string;
  name: string;
  description: string;
  categoryLabel: string;
  tags: string[];
  image: ShopifyImage | null;
  images: ShopifyImage[];
  price: { amount: string; currencyCode: string };
  compareAtPrice?: { amount: string; currencyCode: string } | null;
  availableForSale: boolean;
  variants: ProductVariant[];
};

export type Collection = { id: string; handle: string; title: string; description: string; image: ShopifyImage | null };

export type TrackedOrder = {
  id: string;
  name: string;
  orderNumber?: number | string;
  processedAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  statusUrl?: string | null;
  totalPrice: { amount: string; currencyCode: string };
  shippingAddress?: {
    firstName?: string;
    lastName?: string;
    address1?: string;
    city?: string;
    country?: string;
  } | null;
  lineItems: {
    title: string;
    quantity: number;
    price: { amount: string; currencyCode: string };
    image?: string | null;
    variantTitle?: string;
  }[];
  fulfillments: {
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    company?: string | null;
  }[];
};

const domain = ((import.meta.env.SHOPIFY_STORE_DOMAIN || import.meta.env.VITE_SHOPIFY_STORE_DOMAIN) ?? "")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");
const token = (import.meta.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN) ?? "";
const apiVersion = (import.meta.env.SHOPIFY_API_VERSION || import.meta.env.VITE_SHOPIFY_API_VERSION) ?? "2026-07";

export const shopifyConfigured = Boolean(domain && token);
export const shopifyEndpoint = domain ? `https://${domain}/api/${apiVersion}/graphql.json` : "";

const PRODUCT_FIELDS = `
  id handle title description descriptionHtml availableForSale tags
  featuredImage { url altText width height }
  images(first: 8) { nodes { url altText width height } }
  priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
  compareAtPriceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
  variants(first: 20) { nodes { id title availableForSale quantityAvailable price { amount currencyCode } compareAtPrice { amount currencyCode } } }
`;

async function shopifyFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!shopifyConfigured) throw new Error("Shopify is not configured. Add Storefront API variables in Vercel.");
  const response = await fetch(shopifyEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-Shopify-Storefront-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Shopify request failed (${response.status})`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors[0].message ?? "Shopify request failed");
  return payload.data as T;
}

function normalizeProduct(raw: any): Product {
  const min = raw.priceRange.minVariantPrice;
  const compare = raw.compareAtPriceRange?.minVariantPrice?.amount && raw.compareAtPriceRange.minVariantPrice.amount !== "0.0" ? raw.compareAtPriceRange.minVariantPrice : null;
  return {
    id: raw.id,
    handle: raw.handle,
    name: raw.title,
    description: raw.description,
    categoryLabel: raw.tags?.[0] || "Nexus Store",
    tags: raw.tags ?? [],
    image: raw.featuredImage ?? null,
    images: raw.images?.nodes ?? [],
    price: min,
    compareAtPrice: compare,
    availableForSale: raw.availableForSale,
    variants: raw.variants?.nodes ?? [],
  };
}

export function formatPrice(price: { amount: string; currencyCode: string } | null | undefined) {
  if (!price) return "Price unavailable";
  const currency = price.currencyCode || "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  }).format(Number(price.amount));
}

export async function getProducts(options: { first?: number; query?: string; sortKey?: string } = {}): Promise<Product[]> {
  if (!shopifyConfigured) {
    throw new Error("Shopify is not configured. Please configure SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN in Vercel.");
  }
  const data = await shopifyFetch<{ products: { nodes: any[] } }>(
    `query Products($first: Int!, $query: String, $sortKey: ProductSortKeys) { products(first: $first, query: $query, sortKey: $sortKey) { nodes { ${PRODUCT_FIELDS} } } }`,
    { first: options.first ?? 24, query: options.query || null, sortKey: options.sortKey || "BEST_SELLING" }
  );
  return data.products.nodes.map(normalizeProduct);
}

export async function getProduct(handle: string): Promise<Product | null> {
  if (!shopifyConfigured) {
    throw new Error("Shopify is not configured. Please configure SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN in Vercel.");
  }
  const data = await shopifyFetch<{ productByHandle: any }>(
    `query Product($handle: String!) { productByHandle(handle: $handle) { ${PRODUCT_FIELDS} } }`,
    { handle }
  );
  return data.productByHandle ? normalizeProduct(data.productByHandle) : null;
}

export async function getCollections(first = 30): Promise<Collection[]> {
  if (!shopifyConfigured) {
    throw new Error("Shopify is not configured. Please configure SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN in Vercel.");
  }
  const data = await shopifyFetch<{ collections: { nodes: any[] } }>(
    `query Collections($first: Int!) { collections(first: $first) { nodes { id handle title description image { url altText width height } } } }`,
    { first }
  );
  return data.collections.nodes as Collection[];
}

export async function getCollectionProducts(handle: string, first = 24): Promise<Product[]> {
  if (!shopifyConfigured) {
    throw new Error("Shopify is not configured. Please configure SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN in Vercel.");
  }
  const data = await shopifyFetch<{ collection: { products: { nodes: any[] } } | null }>(
    `query Collection($handle: String!, $first: Int!) { collection(handle: $handle) { products(first: $first) { nodes { ${PRODUCT_FIELDS} } } } }`,
    { handle, first }
  );
  return data.collection?.products.nodes.map(normalizeProduct) ?? [];
}

export async function getOrderDetails(orderInput: string, emailOrPhone: string): Promise<TrackedOrder | null> {
  const trimmedOrder = orderInput.trim();
  const trimmedContact = emailOrPhone.trim();

  if (!trimmedOrder) {
    throw new Error("Please enter your Order ID or Confirmation Number.");
  }
  if (!trimmedContact) {
    throw new Error("Please enter your email address or phone number for verification.");
  }

  const response = await fetch("/api/order-tracking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderNumber: trimmedOrder, emailOrPhone: trimmedContact }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Unable to retrieve order details.");
  }

  return payload.order as TrackedOrder;
}

export async function createCart(variantId: string, quantity = 1) {
  const data = await shopifyFetch<{ cartCreate: { cart: { id: string; checkoutUrl: string; lines: { nodes: any[] }; cost: { subtotalAmount: { amount: string; currencyCode: string } } }; userErrors: { message: string }[] } }>(`mutation CartCreate($input: CartInput!) { cartCreate(input: $input) { cart { id checkoutUrl lines(first: 50) { nodes { id quantity merchandise { ... on ProductVariant { id title product { title handle featuredImage { url altText } } price { amount currencyCode } } } } } cost { subtotalAmount { amount currencyCode } } } userErrors { message } } }`, { input: { lines: [{ merchandiseId: variantId, quantity }] } });
  const error = data.cartCreate.userErrors[0];
  if (error) throw new Error(error.message);
  return data.cartCreate.cart;
}

export async function addCartLines(cartId: string, lines: { merchandiseId: string; quantity: number }[]) {
  const data = await shopifyFetch<{ cartLinesAdd: { cart: any; userErrors: { message: string }[] } }>(`mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { id checkoutUrl lines(first: 50) { nodes { id quantity merchandise { ... on ProductVariant { id title product { title handle featuredImage { url altText } } price { amount currencyCode } } } } } cost { subtotalAmount { amount currencyCode } } } userErrors { message } } }`, { cartId, lines });
  const error = data.cartLinesAdd.userErrors[0];
  if (error) throw new Error(error.message);
  return data.cartLinesAdd.cart;
}

export async function updateCart(cartId: string, lines: { id: string; quantity: number }[]) {
  const data = await shopifyFetch<{ cartLinesUpdate: { cart: any; userErrors: { message: string }[] } }>(`mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { id checkoutUrl lines(first: 50) { nodes { id quantity merchandise { ... on ProductVariant { id title product { title handle featuredImage { url altText } } price { amount currencyCode } } } } } cost { subtotalAmount { amount currencyCode } } } userErrors { message } } }`, { cartId, lines });
  const error = data.cartLinesUpdate.userErrors[0];
  if (error) throw new Error(error.message);
  return data.cartLinesUpdate.cart;
}

export async function removeCartLines(cartId: string, lineIds: string[]) {
  const data = await shopifyFetch<{ cartLinesRemove: { cart: any; userErrors: { message: string }[] } }>(`mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { id checkoutUrl lines(first: 50) { nodes { id quantity merchandise { ... on ProductVariant { id title product { title handle featuredImage { url altText } } price { amount currencyCode } } } } } cost { subtotalAmount { amount currencyCode } } } userErrors { message } } }`, { cartId, lineIds });
  const error = data.cartLinesRemove.userErrors[0];
  if (error) throw new Error(error.message);
  return data.cartLinesRemove.cart;
}
