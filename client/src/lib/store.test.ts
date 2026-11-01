import { describe, expect, it } from "vitest";
import { parseCartSnapshot } from "@/contexts/CartContext";
import {
  addQuantities,
  assertCartQuantities,
  assertGraphqlErrors,
  assertShopifyCart,
  assertUserErrors,
  filterPurchasableCartLines,
  formatPrice,
  getAvailableVariant,
  isPurchasableVariant,
  normalizeProduct,
  removedCartQuantities,
  updatedCartQuantities,
  type ProductVariant,
  type ShopifyCartResponse,
} from "@/lib/store";

const variantGid = (id: number) => `gid://shopify/ProductVariant/${id}`;

function variant(
  id: number,
  overrides: Partial<ProductVariant> = {}
): ProductVariant {
  return {
    id: variantGid(id),
    title: `Option ${id}`,
    availableForSale: true,
    price: { amount: "20.00", currencyCode: "USD" },
    ...overrides,
  };
}

function productWith(variants: ProductVariant[]) {
  return normalizeProduct({
    id: "gid://shopify/Product/100",
    handle: "test-product",
    title: "Test product",
    description: "",
    availableForSale: true,
    tags: [],
    productType: "",
    collections: { nodes: [] },
    images: { nodes: [] },
    priceRange: { minVariantPrice: { amount: "0.00", currencyCode: "USD" } },
    compareAtPriceRange: { minVariantPrice: null },
    variants: { nodes: variants },
  });
}

function cartFixture(
  overrides: Partial<ShopifyCartResponse> = {}
): ShopifyCartResponse {
  return {
    id: "gid://shopify/Cart/test?key=cart-key",
    checkoutUrl: "https://sg1f51-1y.myshopify.com/checkouts/test",
    lines: {
      nodes: [
        {
          id: "gid://shopify/CartLine/1",
          quantity: 2,
          merchandise: {
            id: variantGid(1),
            title: "Option 1",
            price: { amount: "20.00", currencyCode: "USD" },
            product: {
              title: "Test product",
              handle: "test-product",
              featuredImage: null,
            },
          },
        },
      ],
    },
    cost: { subtotalAmount: { amount: "40.00", currencyCode: "USD" } },
    ...overrides,
  };
}

describe("Shopify variant validation and product normalization", () => {
  it("rejects unavailable, zero-priced, malformed-price and non-variant GIDs", () => {
    expect(isPurchasableVariant(variant(1))).toBe(true);
    expect(isPurchasableVariant(variant(2, { availableForSale: false }))).toBe(
      false
    );
    expect(
      isPurchasableVariant(
        variant(3, { price: { amount: "0.00", currencyCode: "USD" } })
      )
    ).toBe(false);
    expect(
      isPurchasableVariant(
        variant(4, { price: { amount: "NaN", currencyCode: "USD" } })
      )
    ).toBe(false);
    expect(
      isPurchasableVariant(
        variant(5, { price: { amount: "20", currencyCode: "US" } })
      )
    ).toBe(false);
    expect(
      isPurchasableVariant(variant(6, { id: "gid://shopify/Product/6" }))
    ).toBe(false);
  });

  it("chooses the lowest valid available variant and honors an explicit valid selection", () => {
    const zero = variant(10, {
      price: { amount: "0.00", currencyCode: "USD" },
    });
    const costly = variant(11, {
      price: { amount: "35.00", currencyCode: "USD" },
    });
    const lowest = variant(12, {
      price: { amount: "12.50", currencyCode: "USD" },
    });
    const product = productWith([zero, costly, lowest]);
    expect(getAvailableVariant(product)?.id).toBe(lowest.id);
    expect(getAvailableVariant(product, costly.id)?.id).toBe(costly.id);
    expect(getAvailableVariant(product, zero.id)).toBeNull();
    expect(product.price).toEqual(lowest.price);
  });

  it("marks a product unavailable and gives it no price if it has no valid purchasable variant", () => {
    const product = productWith([
      variant(20, { price: { amount: "0", currencyCode: "USD" } }),
      variant(21, { availableForSale: false }),
    ]);
    expect(product.availableForSale).toBe(false);
    expect(product.price).toBeNull();
    expect(getAvailableVariant(product)).toBeNull();
  });

  it("formats real USD money and refuses to invent a currency for malformed values", () => {
    expect(formatPrice({ amount: "10.50", currencyCode: "USD" })).toBe(
      "$10.50"
    );
    expect(formatPrice({ amount: "10.50", currencyCode: "CAD" })).toContain(
      "10.50"
    );
    expect(formatPrice({ amount: "10.50", currencyCode: "" })).toBe(
      "Price unavailable"
    );
  });
});

describe("Shopify cart response validation", () => {
  it("rejects a zero-quantity line even when Shopify says the mutation succeeded", () => {
    const cart = cartFixture({
      lines: { nodes: [{ ...cartFixture().lines.nodes[0], quantity: 0 }] },
      cost: { subtotalAmount: { amount: "0.00", currencyCode: "USD" } },
    });
    expect(() => assertShopifyCart(cart)).toThrow(/invalid quantity or price/i);
  });

  it("rejects zero, missing, or malformed variant prices", () => {
    const line = cartFixture().lines.nodes[0];
    expect(() =>
      assertShopifyCart(
        cartFixture({
          lines: {
            nodes: [
              {
                ...line,
                merchandise: {
                  ...line.merchandise,
                  price: { amount: "0.00", currencyCode: "USD" },
                },
              },
            ],
          },
        })
      )
    ).toThrow(/invalid quantity or price/i);
    expect(() =>
      assertShopifyCart(
        cartFixture({
          lines: {
            nodes: [
              {
                ...line,
                merchandise: {
                  ...line.merchandise,
                  price: { amount: "not-money", currencyCode: "USD" },
                },
              },
            ],
          },
        })
      )
    ).toThrow(/invalid quantity or price/i);
  });

  it("aggregates every top-level GraphQL error and every mutation userError", () => {
    expect(() =>
      assertGraphqlErrors([
        { message: "catalog denied" },
        { message: "cart unavailable" },
      ])
    ).toThrow("catalog denied; cart unavailable");
    expect(() =>
      assertGraphqlErrors([
        { message: "not found", extensions: { code: "CART_NOT_FOUND" } },
      ])
    ).toThrow("CART_NOT_FOUND: not found");
    expect(() =>
      assertUserErrors("Cart update failed", [
        { message: "out of stock" },
        { message: "price changed" },
      ])
    ).toThrow("out of stock; price changed");
  });

  it("coalesces duplicate additions and enforces Shopify's per-variant limit", () => {
    const lines = addQuantities(new Map(), [
      { merchandiseId: variantGid(30), quantity: 1 },
      { merchandiseId: variantGid(30), quantity: 2 },
    ]);
    expect(Array.from(lines.entries())).toEqual([[variantGid(30), 3]]);
    expect(() =>
      addQuantities(new Map(), [
        { merchandiseId: variantGid(30), quantity: 251 },
      ])
    ).toThrow(/250/);
    expect(() =>
      addQuantities(new Map(), [{ merchandiseId: "bad-id", quantity: 1 }])
    ).toThrow(/valid product/i);
  });

  it("verifies quantity updates preserve other products and removal leaves expected merchandise", () => {
    const cart = cartFixture({
      lines: {
        nodes: [
          cartFixture().lines.nodes[0],
          {
            id: "gid://shopify/CartLine/2",
            quantity: 1,
            merchandise: {
              id: variantGid(2),
              title: "Option 2",
              price: { amount: "5.00", currencyCode: "USD" },
              product: {
                title: "Other product",
                handle: "other-product",
                featuredImage: null,
              },
            },
          },
        ],
      },
    });
    expect(
      Array.from(
        updatedCartQuantities(cart, [
          { id: "gid://shopify/CartLine/1", quantity: 1 },
        ]).entries()
      )
    ).toEqual([
      [variantGid(1), 1],
      [variantGid(2), 1],
    ]);
    expect(
      Array.from(
        removedCartQuantities(cart, ["gid://shopify/CartLine/1"]).entries()
      )
    ).toEqual([[variantGid(2), 1]]);
    expect(() =>
      assertCartQuantities(
        cartFixture({ lines: { nodes: [] } }),
        new Map([[variantGid(1), 2]])
      )
    ).toThrow(/does not match/i);
  });

  it("rebuilds expired carts only from variants that Shopify currently marks purchasable", () => {
    const snapshot = parseCartSnapshot(
      JSON.stringify({
        id: "gid://shopify/Cart/expired",
        lines: [
          { merchandiseId: variantGid(40), quantity: 2 },
          { merchandiseId: variantGid(41), quantity: 1 },
          { merchandiseId: variantGid(42), quantity: 0 },
          { merchandiseId: "corrupted", quantity: 9 },
        ],
      })
    );
    expect(snapshot.lines).toEqual([
      { merchandiseId: variantGid(40), quantity: 2 },
      { merchandiseId: variantGid(41), quantity: 1 },
    ]);
    const lines = filterPurchasableCartLines(snapshot.lines, [
      variant(40),
      variant(41, { availableForSale: false }),
    ]);
    expect(lines).toEqual([{ merchandiseId: variantGid(40), quantity: 2 }]);
  });
});
