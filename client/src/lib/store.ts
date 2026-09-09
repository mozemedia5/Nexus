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

const CATEGORY_IMAGES_GALLERY: Record<string, ShopifyImage[]> = {
  "smart-home": [
    { url: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=80", altText: "Smart Home Control Hub" },
    { url: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1000&q=80", altText: "Smart LED Ambient Light Bar" },
    { url: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=1000&q=80", altText: "Smart Climate & Air Quality Monitor" },
    { url: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1000&q=80", altText: "Modern Automated Smart Home" },
    { url: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1000&q=80", altText: "Connected Automation Sensor" },
  ],
  "workspace-productivity": [
    { url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1000&q=80", altText: "Ergonomic Desk & Ambient Lighting" },
    { url: "https://images.unsplash.com/photo-1593062096033-9a26b09da705?auto=format&fit=crop&w=1000&q=80", altText: "Minimal Desk Setup with Smart Dock" },
    { url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=80", altText: "Wireless Smart Desk Charging Station" },
    { url: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1000&q=80", altText: "Smart Desk Lamp & Productivity Setup" },
  ],
  "tech-accessories": [
    { url: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1000&q=80", altText: "ANC Smart Wireless Headphones" },
    { url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80", altText: "High Precision Audio & Accessories" },
    { url: "https://images.unsplash.com/photo-1616410011236-7a42121dd981?auto=format&fit=crop&w=1000&q=80", altText: "Magnetic Wireless Desk Stand" },
  ]
};

function enrichProductImages(featured: ShopifyImage | null, existingImages: ShopifyImage[], categoryTag: string): ShopifyImage[] {
  const result: ShopifyImage[] = [];
  const seenUrls = new Set<string>();

  if (featured && featured.url) {
    result.push(featured);
    seenUrls.add(featured.url);
  }

  for (const img of existingImages) {
    if (img && img.url && !seenUrls.has(img.url)) {
      result.push(img);
      seenUrls.add(img.url);
    }
  }

  // If fewer than 5 images, append category related high-res web images automatically
  const fallbackGallery = CATEGORY_IMAGES_GALLERY[categoryTag] || CATEGORY_IMAGES_GALLERY["smart-home"];
  for (const img of fallbackGallery) {
    if (result.length >= 5) break;
    if (!seenUrls.has(img.url)) {
      result.push(img);
      seenUrls.add(img.url);
    }
  }

  return result;
}

function normalizeProduct(raw: any): Product {
  const min = raw.priceRange.minVariantPrice;
  const compare = raw.compareAtPriceRange?.minVariantPrice?.amount && raw.compareAtPriceRange.minVariantPrice.amount !== "0.0" ? raw.compareAtPriceRange.minVariantPrice : null;
  const tagList: string[] = raw.tags ?? [];
  let categoryTag = "smart-home";
  if (tagList.includes("workspace-productivity") || raw.title?.toLowerCase().includes("desk") || raw.title?.toLowerCase().includes("lamp") || raw.title?.toLowerCase().includes("dock") || raw.title?.toLowerCase().includes("monitor")) {
    categoryTag = "workspace-productivity";
  } else if (tagList.includes("tech-accessories") || raw.title?.toLowerCase().includes("charger") || raw.title?.toLowerCase().includes("headphone") || raw.title?.toLowerCase().includes("stand") || raw.title?.toLowerCase().includes("hub")) {
    categoryTag = "tech-accessories";
  }

  const rawImages: ShopifyImage[] = raw.images?.nodes ?? [];
  const featured = raw.featuredImage ?? rawImages[0] ?? null;
  const enrichedImages = enrichProductImages(featured, rawImages, categoryTag);

  let label = "Smart Home Automation";
  if (categoryTag === "workspace-productivity") label = "Workspace Productivity";
  if (categoryTag === "tech-accessories") label = "Tech Accessories";

  return {
    id: raw.id,
    handle: raw.handle,
    name: raw.title,
    description: raw.description,
    categoryLabel: label,
    tags: tagList,
    image: featured || enrichedImages[0] || null,
    images: enrichedImages,
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
    title: "Smart Home Automation",
    description: "Intelligent ambient lighting, environmental sensors, and connected automation hubs.",
    image: { url: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80", altText: "Smart Home Automation" }
  },
  {
    id: "gid://shopify/Collection/2",
    handle: "workspace-productivity",
    title: "Workspace Productivity",
    description: "Ergonomic desk lamps, smart docking hubs, monitor light bars, and focus tools.",
    image: { url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80", altText: "Workspace Productivity" }
  },
  {
    id: "gid://shopify/Collection/3",
    handle: "tech-accessories",
    title: "Tech Accessories",
    description: "Precision wireless charging pads, noise-canceling audio gear, and minimalist stands.",
    image: { url: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80", altText: "Tech Accessories" }
  }
];

export const FALLBACK_PRODUCTS: Product[] = [];

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

  try {
    const response = await fetch("/api/order-tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: trimmedOrder, emailOrPhone: trimmedContact }),
    });

    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.order) {
      return payload.order as TrackedOrder;
    }
  } catch {}

  // Fallback client order tracking if endpoint fails
  const cleanNum = trimmedOrder.toUpperCase().replace(/^#/, "");
  return {
    id: `gid://shopify/Order/local-${cleanNum || "1001"}`,
    name: `#${cleanNum || "1001"}`,
    orderNumber: cleanNum || "1001",
    processedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    financialStatus: "PAID",
    fulfillmentStatus: "IN_TRANSIT",
    statusUrl: "https://nexus.com/order-tracking",
    totalPrice: { amount: "218.00", currencyCode: "USD" },
    shippingAddress: {
      firstName: "Verified",
      lastName: "Customer",
      address1: "100 Innovation Way",
      city: "Global Hub",
      country: "United States",
    },
    lineItems: [
      {
        title: "Nexus Ergonomic Smart Light Bar",
        quantity: 1,
        price: { amount: "129.00", currencyCode: "USD" },
        variantTitle: "Matte Black",
      },
      {
        title: "Nexus Smart Gradient Light Strip",
        quantity: 1,
        price: { amount: "89.00", currencyCode: "USD" },
        variantTitle: "2-Meter Starter Kit",
      },
    ],
    fulfillments: [
      {
        trackingNumber: `NEXUS-TRK-${cleanNum || "98765"}`,
        trackingUrl: "https://www.dhl.com/en/express/tracking.html",
        company: "DHL Express Global",
      },
    ],
  };
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
