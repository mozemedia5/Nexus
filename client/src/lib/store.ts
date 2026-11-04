export type ShopifyImage = {
  url: string;
  altText: string | null;
  width?: number;
  height?: number;
};

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  price: { amount: string; currencyCode: string };
  compareAtPrice?: { amount: string; currencyCode: string } | null;
};

export type Money = { amount: string; currencyCode: string };

const PRODUCT_VARIANT_GID = /^gid:\/\/shopify\/ProductVariant\/\d+$/;

export function isValidShopifyVariantId(value: unknown): value is string {
  return typeof value === "string" && PRODUCT_VARIANT_GID.test(value);
}

export function isValidMoney(
  value: unknown,
  requirePositive = true
): value is Money {
  if (!value || typeof value !== "object") return false;
  const money = value as Partial<Money>;
  const amount = Number(money.amount);
  if (
    typeof money.amount !== "string" ||
    !Number.isFinite(amount) ||
    (requirePositive ? amount <= 0 : amount < 0)
  )
    return false;
  if (
    typeof money.currencyCode !== "string" ||
    !/^[A-Z]{3}$/.test(money.currencyCode) ||
    money.currencyCode === "XXX"
  )
    return false;
  try {
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: money.currencyCode,
    });
  } catch {
    return false;
  }
  return true;
}

export function isPurchasableVariant(value: unknown): value is ProductVariant {
  if (!value || typeof value !== "object") return false;
  const variant = value as ProductVariant;
  return (
    variant.availableForSale === true &&
    isValidShopifyVariantId(variant.id) &&
    isValidMoney(variant.price)
  );
}

export type Product = {
  id: string;
  handle: string;
  name: string;
  description: string;
  categoryLabel: string;
  tags: string[];
  image: ShopifyImage | null;
  images: ShopifyImage[];
  price: Money | null;
  compareAtPrice?: { amount: string; currencyCode: string } | null;
  availableForSale: boolean;
  variants: ProductVariant[];
};

export function getAvailableVariant(
  product: Product,
  selectedVariantId?: string
): ProductVariant | null {
  const candidates = product.variants.filter(isPurchasableVariant);
  if (selectedVariantId !== undefined) {
    return candidates.find(variant => variant.id === selectedVariantId) ?? null;
  }
  return (
    candidates
      .slice()
      .sort(
        (left, right) => Number(left.price.amount) - Number(right.price.amount)
      )[0] ?? null
  );
}

export type Collection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: ShopifyImage | null;
};

export type TrackedOrder = {
  id: string;
  name: string;
  orderNumber?: number | string;
  processedAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  trackingStatus?: string | null;
  deliveredAt?: string | null;
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
    status?: string | null;
    deliveredAt?: string | null;
  }[];
};

const domain = (
  (import.meta.env.SHOPIFY_STORE_DOMAIN ||
    import.meta.env.VITE_SHOPIFY_STORE_DOMAIN) ??
  ""
)
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");
// These names are documented as PUBLIC Storefront API access tokens in .env.example.
// Never map Shopify Admin API or private Storefront credentials into client code.
const token =
  (import.meta.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN ||
    import.meta.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN) ??
  "";
const apiVersion =
  (import.meta.env.SHOPIFY_API_VERSION ||
    import.meta.env.VITE_SHOPIFY_API_VERSION) ??
  "2026-07";

export const shopifyStoreDomain = domain;
export const shopifyConfigured = Boolean(domain && token);
export const shopifyEndpoint = domain
  ? `https://${domain}/api/${apiVersion}/graphql.json`
  : "";

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

async function shopifyFetch<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  if (!shopifyConfigured)
    throw new Error("Product catalog service is not configured.");
  const response = await fetch(shopifyEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok)
    throw new Error(`Store catalog request failed (${response.status})`);
  const payload = await response.json();
  assertGraphqlErrors(payload.errors);
  if (!payload.data)
    throw new Error("Shopify returned an empty response. Please try again.");
  return payload.data as T;
}

export function assertGraphqlErrors(
  errors:
    | { message?: string; extensions?: { code?: string } }[]
    | null
    | undefined
): void {
  const messages = (errors ?? [])
    .map(error => {
      const message = error?.message?.trim();
      const code = error?.extensions?.code?.trim();
      return message ? `${code ? `${code}: ` : ""}${message}` : code;
    })
    .filter((message): message is string => Boolean(message));
  if (messages.length)
    throw new Error(
      `Shopify request failed: ${Array.from(new Set(messages)).join("; ")}`
    );
}

export function normalizeProduct(raw: any): Product {
  const variants: ProductVariant[] = (raw.variants?.nodes ?? [])
    .filter((variant: unknown) => variant && typeof variant === "object")
    .map((variant: ProductVariant) => ({
      ...variant,
      compareAtPrice:
        isValidMoney(variant.price) &&
        isValidMoney(variant.compareAtPrice) &&
        Number(variant.compareAtPrice.amount) > Number(variant.price.amount)
          ? variant.compareAtPrice
          : null,
    }));
  const purchasableVariants = variants.filter(isPurchasableVariant);
  const lowestVariant =
    purchasableVariants
      .slice()
      .sort(
        (left, right) => Number(left.price.amount) - Number(right.price.amount)
      )[0] ?? null;
  const compareCandidate = lowestVariant?.compareAtPrice;
  const compare =
    isValidMoney(compareCandidate) &&
    lowestVariant &&
    Number(compareCandidate.amount) > Number(lowestVariant.price.amount)
      ? compareCandidate
      : null;
  const tagList: string[] = raw.tags ?? [];
  const knownCategory = tagList
    .find(tag =>
      ["smart-home", "workspace-productivity", "tech-accessories"].includes(
        tag.toLowerCase()
      )
    )
    ?.toLowerCase();
  const collectionTitle = raw.collections?.nodes?.[0]?.title?.trim();
  const label =
    raw.productType?.trim() ||
    collectionTitle ||
    (knownCategory === "smart-home"
      ? "Smart Home Automation"
      : knownCategory === "workspace-productivity"
        ? "Workspace Productivity"
        : knownCategory === "tech-accessories"
          ? "Tech Accessories"
          : "Uncategorized");

  const rawImages: ShopifyImage[] = raw.images?.nodes ?? [];
  const featured = raw.featuredImage ?? rawImages[0] ?? null;
  const actualImages = rawImages.filter(image => Boolean(image?.url));

  return {
    id: raw.id,
    handle: raw.handle,
    name: raw.title,
    description: raw.description,
    categoryLabel: label,
    tags: tagList,
    image: featured,
    images: actualImages,
    price: lowestVariant?.price ?? null,
    compareAtPrice: compare,
    availableForSale: purchasableVariants.length > 0,
    variants,
  };
}

export function formatPrice(
  price: { amount: string; currencyCode: string } | null | undefined
) {
  if (!isValidMoney(price, false)) return "Price unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currencyCode,
  }).format(Number(price.amount));
}

export const FALLBACK_COLLECTIONS: Collection[] = [];

export async function getProducts(
  options: {
    first?: number;
    query?: string;
    sortKey?: string;
    fresh?: boolean;
  } = {}
): Promise<Product[]> {
  const cacheKey = `products_v2_${options.first ?? 24}_${options.query || ""}_${options.sortKey || "BEST_SELLING"}`;
  const cached = options.fresh ? null : getCached<Product[]>(cacheKey);
  if (cached) return cached;

  if (!shopifyConfigured) {
    return [];
  }
  try {
    const data = await shopifyFetch<{ products: { nodes: any[] } }>(
      `query Products($first: Int!, $query: String, $sortKey: ProductSortKeys) { products(first: $first, query: $query, sortKey: $sortKey) { nodes { ${PRODUCT_FIELDS} } } }`,
      {
        first: options.first ?? 24,
        query: options.query || null,
        sortKey: options.sortKey || "BEST_SELLING",
      }
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
  const cacheKey = "products_all_shopify_v2";
  const cached = getCached<Product[]>(cacheKey);
  if (cached) return cached;
  if (!shopifyConfigured) return [];

  const allProducts: Product[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  let pageCount = 0;

  try {
    while (hasNextPage && pageCount < 100) {
      const data: {
        products: {
          edges: Array<{ cursor: string; node: any }>;
          pageInfo: { hasNextPage: boolean };
        };
      } = await shopifyFetch<{
        products: {
          edges: Array<{ cursor: string; node: any }>;
          pageInfo: { hasNextPage: boolean };
        };
      }>(
        `query AllProducts($first: Int!, $after: String) { products(first: $first, after: $after, sortKey: TITLE) { edges { cursor node { ${PRODUCT_FIELDS} } } pageInfo { hasNextPage } } }`,
        { first: 250, after: cursor }
      );
      const edges: Array<{ cursor: string; node: any }> =
        data.products.edges ?? [];
      allProducts.push(...edges.map(({ node }) => normalizeProduct(node)));
      hasNextPage = Boolean(
        data.products.pageInfo?.hasNextPage && edges.length
      );
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
  const cacheKey = `product_v2_${handle}`;
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
    throw new Error(
      err instanceof Error && err.message
        ? err.message
        : "Unable to load this product. Please try again."
    );
  }
}

export async function getCollections(first = 30): Promise<Collection[]> {
  const cacheKey = `collections_v2_${first}`;
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
    const items = data.collections.nodes.filter(
      (collection: Collection) => collection.handle !== "frontpage"
    ) as Collection[];
    setCached(cacheKey, items);
    return items;
  } catch (err) {
    console.error("Shopify fetch failed for collections:", err);
    return [];
  }
}

export async function getCollectionProducts(
  handle: string,
  first = 250
): Promise<Product[]> {
  const cacheKey = `col_products_v2_${handle}_${first}`;
  const cached = getCached<Product[]>(cacheKey);
  if (cached) return cached;

  if (!shopifyConfigured) {
    return [];
  }
  try {
    const data = await shopifyFetch<{
      collection: { products: { nodes: any[] } } | null;
    }>(
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

export async function getOrderDetails(
  orderInput: string,
  emailOrPhone: string
): Promise<TrackedOrder | null> {
  const trimmedOrder = orderInput.trim();
  const trimmedContact = emailOrPhone.trim();

  if (!trimmedOrder)
    throw new Error("Please enter your Order ID or Confirmation Number.");
  if (!trimmedContact)
    throw new Error(
      "Please enter your email address or phone number for verification."
    );

  try {
    const response = await fetch("/api/order-tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: trimmedOrder,
        emailOrPhone: trimmedContact,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.order) return payload.order as TrackedOrder;
    throw new Error(
      payload.error ||
        "Unable to verify this order. Please check the order details and try again."
    );
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      "Order tracking is temporarily unavailable. Please try again."
    );
  }
}

const CART_FIELDS = `
  id
  checkoutUrl
  lines(first: 100) {
    nodes {
      id
      quantity
      merchandise {
        ... on ProductVariant {
          id
          title
          product { title handle featuredImage { url altText } }
          price { amount currencyCode }
        }
      }
      cost {
        amountPerQuantity { amount currencyCode }
        totalAmount { amount currencyCode }
      }
    }
  }
  cost { subtotalAmount { amount currencyCode } }
`;

export type ShopifyCartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    price: Money;
    product: {
      title: string;
      handle: string;
      featuredImage: ShopifyImage | null;
    };
  };
  cost?: { amountPerQuantity?: Money; totalAmount?: Money };
};

export type ShopifyCartResponse = {
  id: string;
  checkoutUrl: string;
  lines: { nodes: ShopifyCartLine[] };
  cost: { subtotalAmount: Money };
};

export function assertShopifyCart(
  cart: ShopifyCartResponse | null | undefined
): ShopifyCartResponse {
  if (
    !cart ||
    typeof cart.id !== "string" ||
    !cart.id ||
    typeof cart.checkoutUrl !== "string" ||
    !Array.isArray(cart.lines?.nodes) ||
    !cart.cost?.subtotalAmount ||
    !isValidMoney(cart.cost.subtotalAmount, false)
  ) {
    throw new Error(
      "Shopify returned incomplete cart data. Please refresh and try again."
    );
  }
  for (const line of cart.lines.nodes) {
    const price = line?.merchandise?.price;
    if (
      typeof line?.id !== "string" ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 250 ||
      !isValidShopifyVariantId(line.merchandise?.id) ||
      !line.merchandise?.product?.title ||
      !line.merchandise.product.handle ||
      !isValidMoney(price) ||
      price.currencyCode !== cart.cost.subtotalAmount.currencyCode ||
      (line.cost?.amountPerQuantity &&
        (!isValidMoney(line.cost.amountPerQuantity) ||
          line.cost.amountPerQuantity.currencyCode !== price.currencyCode))
    ) {
      throw new Error(
        "Shopify returned a cart item with an invalid quantity or price. It was not saved; please try again or contact the store."
      );
    }
  }
  return cart;
}

export function assertCartQuantities(
  cart: ShopifyCartResponse,
  expected: ReadonlyMap<string, number>
): ShopifyCartResponse {
  const actual = new Map<string, number>();
  for (const line of cart.lines.nodes) {
    actual.set(
      line.merchandise.id,
      (actual.get(line.merchandise.id) ?? 0) + line.quantity
    );
  }
  if (
    actual.size !== expected.size ||
    Array.from(expected.entries()).some(
      ([id, quantity]) => actual.get(id) !== quantity
    )
  ) {
    throw new Error(
      "Shopify returned a cart that does not match the requested products and quantities. The change was not applied."
    );
  }
  return cart;
}

export function assertUserErrors(
  operation: string,
  errors: { message?: string; code?: string }[] | null | undefined
): void {
  const messages = (errors ?? [])
    .map(error => {
      const message = error?.message?.trim();
      const code = error?.code?.trim();
      return message ? `${code ? `${code}: ` : ""}${message}` : code;
    })
    .filter((message): message is string => Boolean(message));
  if (messages.length)
    throw new Error(
      `${operation}: ${Array.from(new Set(messages)).join("; ")}`
    );
}

export function cartQuantities(
  cart: ShopifyCartResponse | null | undefined
): Map<string, number> {
  const quantities = new Map<string, number>();
  for (const line of cart?.lines?.nodes ?? []) {
    if (
      isValidShopifyVariantId(line.merchandise?.id) &&
      Number.isInteger(line.quantity) &&
      line.quantity > 0
    ) {
      quantities.set(
        line.merchandise.id,
        (quantities.get(line.merchandise.id) ?? 0) + line.quantity
      );
    }
  }
  return quantities;
}

export function addQuantities(
  base: ReadonlyMap<string, number>,
  additions: { merchandiseId: string; quantity: number }[]
): Map<string, number> {
  const result = new Map(base);
  for (const line of additions) {
    if (
      !isValidShopifyVariantId(line.merchandiseId) ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1
    ) {
      throw new Error(
        "Choose a valid product and whole-number quantity before adding it to your cart."
      );
    }
    const next = (result.get(line.merchandiseId) ?? 0) + line.quantity;
    if (next > 250)
      throw new Error("Shopify carts are limited to 250 of each product.");
    result.set(line.merchandiseId, next);
  }
  return result;
}

export function updatedCartQuantities(
  cart: ShopifyCartResponse,
  updates: { id: string; quantity: number }[]
): Map<string, number> {
  const expected = cartQuantities(cart);
  for (const update of updates) {
    const existing = cart.lines.nodes.find(line => line.id === update.id);
    if (!existing)
      throw new Error(
        "The cart changed before the quantity could be updated. Refresh and try again."
      );
    const next =
      (expected.get(existing.merchandise.id) ?? 0) +
      update.quantity -
      existing.quantity;
    if (
      !Number.isInteger(update.quantity) ||
      update.quantity < 1 ||
      next < 1 ||
      next > 250
    ) {
      throw new Error("Cart quantity must be a whole number from 1 to 250.");
    }
    expected.set(existing.merchandise.id, next);
  }
  return expected;
}

export function removedCartQuantities(
  cart: ShopifyCartResponse,
  lineIds: string[]
): Map<string, number> {
  const expected = cartQuantities(cart);
  for (const lineId of lineIds) {
    const removed = cart.lines.nodes.find(line => line.id === lineId);
    if (!removed)
      throw new Error(
        "The item is no longer in your cart. Refresh and try again."
      );
    const remaining =
      (expected.get(removed.merchandise.id) ?? 0) - removed.quantity;
    if (remaining > 0) expected.set(removed.merchandise.id, remaining);
    else expected.delete(removed.merchandise.id);
  }
  return expected;
}

export async function getCart(
  cartId: string
): Promise<ShopifyCartResponse | null> {
  const data = await shopifyFetch<{ cart: ShopifyCartResponse | null }>(
    `query Cart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`,
    { id: cartId }
  );
  return data.cart ? assertShopifyCart(data.cart) : null;
}

export function filterPurchasableCartLines(
  lines: { merchandiseId: string; quantity: number }[],
  variants: (ProductVariant | null)[]
): { merchandiseId: string; quantity: number }[] {
  const requested = addQuantities(new Map(), lines);
  const available = new Set(
    variants.filter(isPurchasableVariant).map(variant => variant.id)
  );
  return Array.from(requested.entries())
    .filter(([merchandiseId]) => available.has(merchandiseId))
    .map(([merchandiseId, quantity]) => ({ merchandiseId, quantity }));
}

export async function getPurchasableCartLines(
  lines: { merchandiseId: string; quantity: number }[]
): Promise<{ merchandiseId: string; quantity: number }[]> {
  const requested = addQuantities(new Map(), lines);
  if (requested.size === 0) return [];
  const ids = Array.from(requested.keys());
  const data = await shopifyFetch<{ nodes: (ProductVariant | null)[] }>(
    `query CartRecoveryVariants($ids: [ID!]!) { nodes(ids: $ids) { ... on ProductVariant { id title availableForSale price { amount currencyCode } } } }`,
    { ids }
  );
  const normalized = Array.from(requested.entries()).map(
    ([merchandiseId, quantity]) => ({ merchandiseId, quantity })
  );
  return filterPurchasableCartLines(normalized, data.nodes ?? []);
}

export async function createCart(
  variantOrLines: string | { merchandiseId: string; quantity: number }[],
  quantity = 1
): Promise<ShopifyCartResponse> {
  const lines =
    typeof variantOrLines === "string"
      ? [{ merchandiseId: variantOrLines, quantity }]
      : variantOrLines;
  const expected = addQuantities(new Map(), lines);
  const normalizedLines = Array.from(expected.entries()).map(
    ([merchandiseId, lineQuantity]) => ({
      merchandiseId,
      quantity: lineQuantity,
    })
  );
  if (!normalizedLines.length) {
    throw new Error(
      "Choose a valid product quantity before adding it to your cart."
    );
  }
  const data = await shopifyFetch<{
    cartCreate: {
      cart: ShopifyCartResponse | null;
      userErrors: { message: string }[];
    };
  }>(
    `mutation CartCreate($input: CartInput!) { cartCreate(input: $input) { cart { ${CART_FIELDS} } userErrors { message } } }`,
    { input: { lines: normalizedLines } }
  );
  if (!data.cartCreate)
    throw new Error("Shopify did not return a cart-create result.");
  assertUserErrors(
    "Shopify could not create the cart",
    data.cartCreate.userErrors
  );
  return assertCartQuantities(
    assertShopifyCart(data.cartCreate.cart),
    expected
  );
}

export async function addCartLines(
  cartId: string,
  lines: { merchandiseId: string; quantity: number }[],
  currentCart: ShopifyCartResponse
): Promise<ShopifyCartResponse> {
  const additions = addQuantities(new Map(), lines);
  const normalizedLines = Array.from(additions.entries()).map(
    ([merchandiseId, quantity]) => ({ merchandiseId, quantity })
  );
  if (!normalizedLines.length) {
    throw new Error(
      "Choose a valid product quantity before adding it to your cart."
    );
  }
  const expected = addQuantities(cartQuantities(currentCart), normalizedLines);
  const data = await shopifyFetch<{
    cartLinesAdd: {
      cart: ShopifyCartResponse | null;
      userErrors: { message: string }[];
    };
  }>(
    `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } } }`,
    { cartId, lines: normalizedLines }
  );
  if (!data.cartLinesAdd)
    throw new Error("Shopify did not return a cart-add result.");
  assertUserErrors(
    "Shopify could not add the product",
    data.cartLinesAdd.userErrors
  );
  const cart = assertShopifyCart(data.cartLinesAdd.cart);
  return assertCartQuantities(cart, expected);
}

export async function updateCart(
  cartId: string,
  lines: { id: string; quantity: number }[],
  currentCart: ShopifyCartResponse
): Promise<ShopifyCartResponse> {
  if (
    !lines.length ||
    lines.some(
      line =>
        !line.id ||
        !Number.isInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > 250
    )
  ) {
    throw new Error("Cart quantity must be a whole number greater than zero.");
  }
  const expected = updatedCartQuantities(currentCart, lines);
  const data = await shopifyFetch<{
    cartLinesUpdate: {
      cart: ShopifyCartResponse | null;
      userErrors: { message: string }[];
    };
  }>(
    `mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } } }`,
    { cartId, lines }
  );
  if (!data.cartLinesUpdate)
    throw new Error("Shopify did not return a cart-update result.");
  assertUserErrors(
    "Shopify could not update the cart",
    data.cartLinesUpdate.userErrors
  );
  const cart = assertShopifyCart(data.cartLinesUpdate.cart);
  return assertCartQuantities(cart, expected);
}

export async function removeCartLines(
  cartId: string,
  lineIds: string[],
  currentCart: ShopifyCartResponse
): Promise<ShopifyCartResponse> {
  if (!lineIds.length || lineIds.some(id => !id))
    throw new Error("Choose a cart item to remove.");
  const expected = removedCartQuantities(currentCart, lineIds);
  const data = await shopifyFetch<{
    cartLinesRemove: {
      cart: ShopifyCartResponse | null;
      userErrors: { message: string }[];
    };
  }>(
    `mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${CART_FIELDS} } userErrors { message } } }`,
    { cartId, lineIds }
  );
  if (!data.cartLinesRemove)
    throw new Error("Shopify did not return a cart-remove result.");
  assertUserErrors(
    "Shopify could not remove the product",
    data.cartLinesRemove.userErrors
  );
  const cart = assertShopifyCart(data.cartLinesRemove.cart);
  return assertCartQuantities(cart, expected);
}
