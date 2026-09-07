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
  id handle title description descriptionHtml availableForSale tags
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

export const FALLBACK_COLLECTIONS: Collection[] = [
  {
    id: "gid://shopify/Collection/1",
    handle: "smart-home",
    title: "Smart Home & Automation",
    description: "Intelligent lighting, environmental sensors, and home automation systems.",
    image: { url: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80", altText: "Smart Home" }
  },
  {
    id: "gid://shopify/Collection/2",
    handle: "beauty-wellness",
    title: "Beauty & Personal Care",
    description: "Elevated beauty technology, LED devices, and personal wellness tools.",
    image: { url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80", altText: "Beauty & Wellness" }
  }
];

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "gid://shopify/Product/1",
    handle: "nexus-ambient-light-bar",
    name: "Nexus Smart Ambient LED Light Bar",
    description: "Multi-zone color syncing ambient light bar with voice assistant compatibility and customizable scenes.",
    categoryLabel: "Smart Home",
    tags: ["smart-home", "lighting"],
    image: { url: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80", altText: "Ambient Light Bar" },
    images: [
      { url: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80", altText: "Ambient Light Bar" }
    ],
    price: { amount: "89.00", currencyCode: "USD" },
    compareAtPrice: { amount: "119.00", currencyCode: "USD" },
    availableForSale: true,
    variants: [
      { id: "gid://shopify/ProductVariant/1", title: "Default Title", availableForSale: true, price: { amount: "89.00", currencyCode: "USD" } }
    ]
  },
  {
    id: "gid://shopify/Product/2",
    handle: "nexus-led-therapy-mask",
    name: "Nexus Intelligent Phototherapy LED Facial Mask",
    description: "7-spectrum clinical grade LED light therapy mask for targeted skin rejuvenation and collagen stimulation.",
    categoryLabel: "Beauty & Wellness",
    tags: ["beauty-wellness", "skincare"],
    image: { url: "https://images.unsplash.com/photo-1512290900673-700201201217?auto=format&fit=crop&w=800&q=80", altText: "LED Therapy Mask" },
    images: [
      { url: "https://images.unsplash.com/photo-1512290900673-700201201217?auto=format&fit=crop&w=800&q=80", altText: "LED Therapy Mask" }
    ],
    price: { amount: "199.00", currencyCode: "USD" },
    compareAtPrice: { amount: "249.00", currencyCode: "USD" },
    availableForSale: true,
    variants: [
      { id: "gid://shopify/ProductVariant/2", title: "Default Title", availableForSale: true, price: { amount: "199.00", currencyCode: "USD" } }
    ]
  },
  {
    id: "gid://shopify/Product/3",
    handle: "nexus-smart-diffuser",
    name: "Nexus Ultrasonic Smart Aroma Diffuser",
    description: "App-controlled ambient essential oil diffuser with customizable mist schedules and soft mood lighting.",
    categoryLabel: "Beauty & Wellness",
    tags: ["beauty-wellness", "wellness"],
    image: { url: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80", altText: "Smart Diffuser" },
    images: [
      { url: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80", altText: "Smart Diffuser" }
    ],
    price: { amount: "65.00", currencyCode: "USD" },
    compareAtPrice: null,
    availableForSale: true,
    variants: [
      { id: "gid://shopify/ProductVariant/3", title: "Default Title", availableForSale: true, price: { amount: "65.00", currencyCode: "USD" } }
    ]
  },
  {
    id: "gid://shopify/Product/4",
    handle: "nexus-climate-sensor-hub",
    name: "Nexus Precision Climate & Air Quality Hub",
    description: "Real-time indoor air quality, humidity, and temperature monitor with smart automation routines.",
    categoryLabel: "Smart Home",
    tags: ["smart-home", "sensors"],
    image: { url: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80", altText: "Climate Sensor Hub" },
    images: [
      { url: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80", altText: "Climate Sensor Hub" }
    ],
    price: { amount: "120.00", currencyCode: "USD" },
    compareAtPrice: { amount: "145.00", currencyCode: "USD" },
    availableForSale: true,
    variants: [
      { id: "gid://shopify/ProductVariant/4", title: "Default Title", availableForSale: true, price: { amount: "120.00", currencyCode: "USD" } }
    ]
  }
];

export async function getProducts(options: { first?: number; query?: string; sortKey?: string } = {}): Promise<Product[]> {
  const cacheKey = `products_${options.first ?? 24}_${options.query || ""}_${options.sortKey || "BEST_SELLING"}`;
  const cached = getCached<Product[]>(cacheKey);
  if (cached) return cached;

  if (!shopifyConfigured) {
    const res = FALLBACK_PRODUCTS.slice(0, options.first ?? 24);
    setCached(cacheKey, res);
    return res;
  }
  try {
    const data = await shopifyFetch<{ products: { nodes: any[] } }>(
      `query Products($first: Int!, $query: String, $sortKey: ProductSortKeys) { products(first: $first, query: $query, sortKey: $sortKey) { nodes { ${PRODUCT_FIELDS} } } }`,
      { first: options.first ?? 24, query: options.query || null, sortKey: options.sortKey || "BEST_SELLING" }
    );
    const items = data.products.nodes.map(normalizeProduct);
    const res = items.length > 0 ? items : FALLBACK_PRODUCTS.slice(0, options.first ?? 24);
    setCached(cacheKey, res);
    return res;
  } catch (err) {
    console.warn("Shopify fetch failed, using fallback products:", err);
    const res = FALLBACK_PRODUCTS.slice(0, options.first ?? 24);
    setCached(cacheKey, res);
    return res;
  }
}

export async function getProduct(handle: string): Promise<Product | null> {
  const cacheKey = `product_${handle}`;
  const cached = getCached<Product | null>(cacheKey);
  if (cached) return cached;

  if (!shopifyConfigured) {
    const res = FALLBACK_PRODUCTS.find((p) => p.handle === handle) ?? FALLBACK_PRODUCTS[0] ?? null;
    if (res) setCached(cacheKey, res);
    return res;
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
    const res = FALLBACK_PRODUCTS.find((p) => p.handle === handle) ?? null;
    if (res) setCached(cacheKey, res);
    return res;
  } catch (err) {
    console.warn("Shopify fetch failed for product, using fallback:", err);
    const res = FALLBACK_PRODUCTS.find((p) => p.handle === handle) ?? FALLBACK_PRODUCTS[0] ?? null;
    if (res) setCached(cacheKey, res);
    return res;
  }
}

export async function getCollections(first = 30): Promise<Collection[]> {
  const cacheKey = `collections_${first}`;
  const cached = getCached<Collection[]>(cacheKey);
  if (cached) return cached;

  if (!shopifyConfigured) {
    const res = FALLBACK_COLLECTIONS.slice(0, first);
    setCached(cacheKey, res);
    return res;
  }
  try {
    const data = await shopifyFetch<{ collections: { nodes: any[] } }>(
      `query Collections($first: Int!) { collections(first: $first) { nodes { id handle title description image { url altText width height } } } }`,
      { first }
    );
    const items = data.collections.nodes as Collection[];
    const res = items.length > 0 ? items : FALLBACK_COLLECTIONS.slice(0, first);
    setCached(cacheKey, res);
    return res;
  } catch (err) {
    console.warn("Shopify fetch failed for collections, using fallback:", err);
    const res = FALLBACK_COLLECTIONS.slice(0, first);
    setCached(cacheKey, res);
    return res;
  }
}

export async function getCollectionProducts(handle: string, first = 24): Promise<Product[]> {
  const cacheKey = `col_products_${handle}_${first}`;
  const cached = getCached<Product[]>(cacheKey);
  if (cached) return cached;

  if (!shopifyConfigured) {
    if (handle === "all") return FALLBACK_PRODUCTS.slice(0, first);
    const filtered = FALLBACK_PRODUCTS.filter((p) => p.tags.includes(handle));
    const res = (filtered.length > 0 ? filtered : FALLBACK_PRODUCTS).slice(0, first);
    setCached(cacheKey, res);
    return res;
  }
  try {
    const data = await shopifyFetch<{ collection: { products: { nodes: any[] } } | null }>(
      `query Collection($handle: String!, $first: Int!) { collection(handle: $handle) { products(first: $first) { nodes { ${PRODUCT_FIELDS} } } } }`,
      { handle, first }
    );
    const items = data.collection?.products.nodes.map(normalizeProduct) ?? [];
    if (items.length > 0) {
      setCached(cacheKey, items);
      return items;
    }
    const filtered = FALLBACK_PRODUCTS.filter((p) => p.tags.includes(handle));
    const res = (filtered.length > 0 ? filtered : FALLBACK_PRODUCTS).slice(0, first);
    setCached(cacheKey, res);
    return res;
  } catch (err) {
    console.warn("Shopify fetch failed for collection products, using fallback:", err);
    const filtered = FALLBACK_PRODUCTS.filter((p) => p.tags.includes(handle));
    const res = (filtered.length > 0 ? filtered : FALLBACK_PRODUCTS).slice(0, first);
    setCached(cacheKey, res);
    return res;
  }
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
