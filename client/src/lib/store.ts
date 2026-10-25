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
const token =
  (import.meta.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN ||
    import.meta.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
    import.meta.env.VITE_SHOPIFY_STOREFRONT_API_ACCESS_TOKEN ||
    import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN) ??
  "";
const apiVersion = (import.meta.env.SHOPIFY_API_VERSION || import.meta.env.VITE_SHOPIFY_API_VERSION) ?? "2026-07";

export const shopifyConfigured = Boolean(domain && token);
export const shopifyEndpoint = domain ? `https://${domain}/api/${apiVersion}/graphql.json` : "";

const PRODUCT_FIELDS = `
  id handle title description descriptionHtml availableForSale tags productType
  collections(first: 5) { nodes { title handle } }
  featuredImage { url altText width height }
  images(first: 8) { nodes { url altText width height } }
  priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
  compareAtPriceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
  variants(first: 20) { nodes { id title availableForSale quantityAvailable price { amount currencyCode } compareAtPrice { amount currencyCode } } }
`;

// Fast in-memory cache
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

function getCached<T>(key: string): T | null {
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }
  try {
    const sessionItem = sessionStorage.getItem(`nexus_cache_${key}`);
    if (sessionItem) {
      const parsed = JSON.parse(sessionItem);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        memoryCache.set(key, parsed);
        return parsed.data as T;
      }
    }
  } catch {}
  return null;
}

function setCached<T>(key: string, data: T): void {
  const entry = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);
  try {
    sessionStorage.setItem(`nexus_cache_${key}`, JSON.stringify(entry));
  } catch {}
}

async function shopifyFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!shopifyConfigured) throw new Error("Product catalog service is not configured.");
  const response = await fetch(shopifyEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-Shopify-Storefront-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Store catalog request failed (${response.status})`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors[0].message ?? "Store catalog request failed");
  return payload.data as T;
}

function normalizeProduct(raw: any): Product {
  const min = raw.priceRange.minVariantPrice;
  const compare = raw.compareAtPriceRange?.minVariantPrice?.amount && raw.compareAtPriceRange.minVariantPrice.amount !== "0.0" ? raw.compareAtPriceRange.minVariantPrice : null;
  const tagList: string[] = raw.tags ?? [];
  const knownCategory = tagList.find((tag) => ["smart-home", "workspace-productivity", "tech-accessories"].includes(tag.toLowerCase()))?.toLowerCase();
  const collectionTitle = raw.collections?.nodes?.[0]?.title?.trim();
  const label = raw.productType?.trim() || collectionTitle || (knownCategory === "smart-home" ? "Smart Home Automation" : knownCategory === "workspace-productivity" ? "Workspace Productivity" : knownCategory === "tech-accessories" ? "Tech Accessories" : "Uncategorized");

  const rawImages: ShopifyImage[] = raw.images?.nodes ?? [];
  const featured = raw.featuredImage ?? rawImages[0] ?? null;
  const actualImages = rawImages.filter((image) => Boolean(image?.url));

  return {
    id: raw.id,
    handle: raw.handle,
    name: raw.title,
    description: raw.description,
    categoryLabel: label,
    tags: tagList,
    image: featured,
    images: actualImages,
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

export const FALLBACK_COLLECTIONS: Collection[] = [];

export async function getProducts(options: { first?: number; query?: string; sortKey?: string; fresh?: boolean } = {}): Promise<Product[]> {
  const cacheKey = `products_${options.first ?? 24}_${options.query || ""}_${options.sortKey || "BEST_SELLING"}`;
  const cached = options.fresh ? null : getCached<Product[]>(cacheKey);
  if (cached) return cached;

  if (!shopifyConfigured) {
    return [];
  }
  try {
    const data = await shopifyFetch<{ products: { nodes: any[] } }>(
      `query Products($first: Int!, $query: String, $sortKey: ProductSortKeys) { products(first: $first, query: $query, sortKey: $sortKey) { nodes { ${PRODUCT_FIELDS} } } }`,
      { first: options.first ?? 24, query: options.query || null, sortKey: options.sortKey || "BEST_SELLING" }
    );
    const items = data.products.nodes.map(normalizeProduct);
    if (!options.fresh) setCached(cacheKey, items);
    return items;
  } catch (err) {
    console.error("Shopify fetch failed:", err);
    return [];
  }
}

export async function getAllProducts(): Promise<Product[]> {
  const cacheKey = "products_all_shopify";
  const cached = getCached<Product[]>(cacheKey);
  if (cached) return cached;
  if (!shopifyConfigured) return [];

  const allProducts: Product[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  let pageCount = 0;

  try {
    while (hasNextPage && pageCount < 100) {
      const data: { products: { edges: Array<{ cursor: string; node: any }>; pageInfo: { hasNextPage: boolean } } } = await shopifyFetch<{
        products: {
          edges: Array<{ cursor: string; node: any }>;
          pageInfo: { hasNextPage: boolean };
        };
      }>(
        `query AllProducts($first: Int!, $after: String) { products(first: $first, after: $after, sortKey: TITLE) { edges { cursor node { ${PRODUCT_FIELDS} } } pageInfo { hasNextPage } } }`,
        { first: 250, after: cursor },
      );
      const edges: Array<{ cursor: string; node: any }> = data.products.edges ?? [];
      allProducts.push(...edges.map(({ node }) => normalizeProduct(node)));
      hasNextPage = Boolean(data.products.pageInfo?.hasNextPage && edges.length);
      cursor = edges.at(-1)?.cursor ?? null;
      pageCount += 1;
    }
    setCached(cacheKey, allProducts);
    return allProducts;
  } catch (error) {
    console.error("Shopify full catalogue fetch failed:", error);
    return allProducts;
  }
}

export async function getProduct(handle: string): Promise<Product | null> {
  const cacheKey = `product_${handle}`;
  const cached = getCached<Product | null>(cacheKey);
  if (cached) return cached;

  if (!shopifyConfigured) {
    return null;
  }
  try {
    const data = await shopifyFetch<{ productByHandle: any }>(
      `query Product($handle: String!) { productByHandle(handle: $handle) { ${PRODUCT_FIELDS} } }`,
      { handle }
    );
    if (data.productByHandle) {
      const res = normalizeProduct(data.productByHandle);
      setCached(cacheKey, res);
      return res;
    }
    return null;
  } catch (err) {
    console.error("Shopify fetch failed for product:", err);
    return null;
  }
}

export async function getCollections(first = 30): Promise<Collection[]> {
  const cacheKey = `collections_${first}`;
  const cached = getCached<Collection[]>(cacheKey);
  if (cached) return cached;

  if (!shopifyConfigured) {
    return [];
  }
  try {
    const data = await shopifyFetch<{ collections: { nodes: any[] } }>(
      `query Collections($first: Int!) { collections(first: $first) { nodes { id handle title description image { url altText width height } } } }`,
      { first }
    );
    const items = data.collections.nodes as Collection[];
    setCached(cacheKey, items);
    return items;
  } catch (err) {
    console.error("Shopify fetch failed for collections:", err);
    return [];
  }
}

export async function getCollectionProducts(handle: string, first = 250): Promise<Product[]> {
  const cacheKey = `col_products_${handle}_${first}`;
  const cached = getCached<Product[]>(cacheKey);
  if (cached) return cached;

  if (!shopifyConfigured) {
    return [];
  }
  try {
    const data = await shopifyFetch<{ collection: { products: { nodes: any[] } } | null }>(
      `query Collection($handle: String!, $first: Int!) { collection(handle: $handle) { products(first: $first) { nodes { ${PRODUCT_FIELDS} } } } }`,
      { handle, first }
    );
    const items = data.collection?.products.nodes.map(normalizeProduct) ?? [];
    setCached(cacheKey, items);
    return items;
  } catch (err) {
    console.error("Shopify fetch failed for collection products:", err);
    return [];
  }
}

export async function getOrderDetails(orderInput: string, emailOrPhone: string): Promise<TrackedOrder | null> {
  const trimmedOrder = orderInput.trim();
  const trimmedContact = emailOrPhone.trim();

  if (!trimmedOrder) throw new Error("Please enter your Order ID or Confirmation Number.");
  if (!trimmedContact) throw new Error("Please enter your email address or phone number for verification.");

  try {
    const response = await fetch("/api/order-tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: trimmedOrder, emailOrPhone: trimmedContact }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.order) return payload.order as TrackedOrder;
    throw new Error(payload.error || "Unable to verify this order. Please check the order details and try again.");
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Order tracking is temporarily unavailable. Please try again.");
  }
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
