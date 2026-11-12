import { describe, expect, it } from "vitest";
import {
  mergeAvailableCartLines,
  parseCartSnapshot,
} from "@/contexts/CartContext";
import {
  addCartLines,
  addQuantities,
  applyShopifyCountryContext,
  assertCartQuantities,
  assertGraphqlErrors,
  assertShopifyCart,
  assertUserErrors,
  buildShopifyCartInput,
  createCartForCountry,
  filterPurchasableCartLines,
  formatPrice,
  getAvailableVariant,
  isPurchasableVariant,
  normalizeProduct,
  removedCartQuantities,
  sortProductsAvailableFirst,
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
    buyerIdentity: { countryCode: "US" },
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
          cost: {
            amountPerQuantity: { amount: "20.00", currencyCode: "USD" },
            totalAmount: { amount: "40.00", currencyCode: "USD" },
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
        variant(7, { price: { amount: "1e2", currencyCode: "USD" } })
      )
    ).toBe(false);
    expect(
      isPurchasableVariant(
        variant(8, { price: { amount: "10.00", currencyCode: "ZZZ" } })
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

  it("moves unavailable products after available ones without changing their relative order", () => {
    const availableFirst = {
      ...productWith([variant(30)]),
      id: "gid://shopify/Product/301",
      name: "Available first",
    };
    const unavailableFirst = {
      ...productWith([variant(31, { availableForSale: false })]),
      id: "gid://shopify/Product/302",
      name: "Unavailable first",
    };
    const availableSecond = {
      ...productWith([variant(32)]),
      id: "gid://shopify/Product/303",
      name: "Available second",
    };
    const unavailableSecond = {
      ...productWith([variant(33, { availableForSale: false })]),
      id: "gid://shopify/Product/304",
      name: "Unavailable second",
    };
    const original = [
      unavailableFirst,
      availableFirst,
      unavailableSecond,
      availableSecond,
    ];

    expect(sortProductsAvailableFirst(original)).toEqual([
      availableFirst,
      availableSecond,
      unavailableFirst,
      unavailableSecond,
    ]);
    expect(original).toEqual([
      unavailableFirst,
      availableFirst,
      unavailableSecond,
      availableSecond,
    ]);
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
  it("accepts matching USD product and cart presentment prices", () => {
    expect(assertShopifyCart(cartFixture())).toBeTruthy();
  });

  it.each(["CAD", "EUR"])(
    "accepts a USD catalog variant returned in %s presentment currency",
    currencyCode => {
      const cart = cartFixture({
        lines: {
          nodes: [
            {
              ...cartFixture().lines.nodes[0],
              cost: {
                amountPerQuantity: { amount: "27.00", currencyCode },
                totalAmount: { amount: "54.00", currencyCode },
              },
            },
          ],
        },
        cost: { subtotalAmount: { amount: "54.00", currencyCode } },
      });
      expect(assertShopifyCart(cart)).toBe(cart);
    }
  );

  it("rejects missing or cross-currency presentment line prices", () => {
    const line = cartFixture().lines.nodes[0];
    expect(() =>
      assertShopifyCart(
        cartFixture({
          lines: { nodes: [{ ...line, cost: undefined }] },
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
                cost: {
                  amountPerQuantity: { amount: "20.00", currencyCode: "CAD" },
                  totalAmount: { amount: "40.00", currencyCode: "CAD" },
                },
              },
            ],
          },
        })
      )
    ).toThrow(/invalid quantity or price/i);
  });

  it("preserves available saved lines while merging a new product after a restore outage", () => {
    expect(
      mergeAvailableCartLines(
        [
          { merchandiseId: variantGid(1), quantity: 2 },
          { merchandiseId: variantGid(2), quantity: 1 },
        ],
        [
          { merchandiseId: variantGid(1), quantity: 1 },
          { merchandiseId: variantGid(3), quantity: 1 },
        ]
      )
    ).toEqual([
      { merchandiseId: variantGid(1), quantity: 3 },
      { merchandiseId: variantGid(2), quantity: 1 },
      { merchandiseId: variantGid(3), quantity: 1 },
    ]);
  });

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
            cost: {
              amountPerQuantity: { amount: "5.00", currencyCode: "USD" },
              totalAmount: { amount: "5.00", currencyCode: "USD" },
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

describe("Shopify country-aware cart mutations", () => {
  it.each(["US", "UG", "CA", "FR"])(
    "includes the active %s buyer country when creating a cart",
    async countryCode => {
      const line = {
        ...cartFixture().lines.nodes[0],
        quantity: 1,
        cost: {
          amountPerQuantity: { amount: "20.00", currencyCode: "USD" },
          totalAmount: { amount: "20.00", currencyCode: "USD" },
        },
      };
      const responseCart = cartFixture({
        buyerIdentity: { countryCode },
        lines: { nodes: [line] },
        cost: { subtotalAmount: { amount: "20.00", currencyCode: "USD" } },
      });
      let requestQuery = "";
      let requestVariables: Record<string, unknown> = {};
      const request = async <T>(
        query: string,
        variables: Record<string, unknown> = {}
      ): Promise<T> => {
        requestQuery = query;
        requestVariables = variables;
        return {
          cartCreate: { cart: responseCart, userErrors: [] },
        } as T;
      };

      const result = await createCartForCountry(
        variantGid(1),
        countryCode,
        1,
        request
      );

      expect(requestQuery).toContain("mutation CartCreate");
      expect(requestVariables).toEqual({
        input: {
          lines: [{ merchandiseId: variantGid(1), quantity: 1 }],
          buyerIdentity: { countryCode },
        },
      });
      expect(result.lines.nodes[0].quantity).toBe(1);
      expect(result.lines.nodes[0].cost.totalAmount).toEqual({
        amount: "20.00",
        currencyCode: "USD",
      });
      expect(result.cost.subtotalAmount).toEqual({
        amount: "20.00",
        currencyCode: "USD",
      });
    }
  );

  it("rejects malformed country codes and applies Shopify's country directive safely", () => {
    expect(buildShopifyCartInput([], "UG")).toEqual({
      lines: [],
      buyerIdentity: { countryCode: "UG" },
    });
    expect(() => buildShopifyCartInput([], "USA")).toThrow(/two-letter/i);
    expect(
      applyShopifyCountryContext(
        "query Product($handle: String!) { productByHandle(handle: $handle) { id } }",
        "UG"
      )
    ).toBe(
      "query Product($handle: String!) @inContext(country: UG) { productByHandle(handle: $handle) { id } }"
    );
    expect(() =>
      applyShopifyCountryContext("query Product { shop { name } }", "UGA")
    ).toThrow(/two-letter/i);
  });

  it("creates multi-quantity carts with matching line totals and subtotal", async () => {
    const line = {
      ...cartFixture().lines.nodes[0],
      quantity: 3,
      cost: {
        amountPerQuantity: { amount: "20.00", currencyCode: "USD" },
        totalAmount: { amount: "60.00", currencyCode: "USD" },
      },
    };
    const responseCart = cartFixture({
      lines: { nodes: [line] },
      cost: { subtotalAmount: { amount: "60.00", currencyCode: "USD" } },
    });
    const request = async <T>(): Promise<T> =>
      ({ cartCreate: { cart: responseCart, userErrors: [] } }) as T;

    const result = await createCartForCountry(variantGid(1), "US", 3, request);
    expect(result.lines.nodes[0].quantity).toBe(3);
    expect(result.lines.nodes[0].cost.totalAmount.amount).toBe("60.00");
    expect(result.cost.subtotalAmount.amount).toBe("60.00");
  });

  it("rejects invalid variant IDs and nonpositive quantities before any mutation request", async () => {
    let requestCount = 0;
    const request = async <T>(): Promise<T> => {
      requestCount += 1;
      throw new Error("request must not run");
    };

    await expect(
      createCartForCountry("gid://shopify/Product/1", "US", 1, request)
    ).rejects.toThrow(/valid product/i);
    await expect(
      createCartForCountry(variantGid(1), "US", 0, request)
    ).rejects.toThrow(/quantity/i);
    await expect(
      createCartForCountry(variantGid(1), "US", 1.5, request)
    ).rejects.toThrow(/quantity/i);
    expect(requestCount).toBe(0);
  });

  it("adds a second product to an existing market-aware cart and validates the whole cart", async () => {
    const current = cartFixture();
    const firstLine = current.lines.nodes[0];
    const secondLine: typeof firstLine = {
      ...firstLine,
      id: "gid://shopify/CartLine/2",
      quantity: 1,
      merchandise: {
        ...firstLine.merchandise,
        id: variantGid(2),
        title: "Option 2",
        price: { amount: "5.00", currencyCode: "USD" },
      },
      cost: {
        amountPerQuantity: { amount: "5.00", currencyCode: "USD" },
        totalAmount: { amount: "5.00", currencyCode: "USD" },
      },
    };
    const updated = cartFixture({
      lines: { nodes: [firstLine, secondLine] },
      cost: { subtotalAmount: { amount: "45.00", currencyCode: "USD" } },
    });
    let requestVariables: Record<string, unknown> = {};
    const request = async <T>(
      _query: string,
      variables: Record<string, unknown> = {}
    ): Promise<T> => {
      requestVariables = variables;
      return { cartLinesAdd: { cart: updated, userErrors: [] } } as T;
    };

    const result = await addCartLines(
      current.id,
      [{ merchandiseId: variantGid(2), quantity: 1 }],
      current,
      request,
      "US"
    );

    expect(requestVariables).toEqual({
      cartId: current.id,
      lines: [{ merchandiseId: variantGid(2), quantity: 1 }],
    });
    expect(result.lines.nodes).toHaveLength(2);
    expect(result.cost.subtotalAmount).toEqual({
      amount: "45.00",
      currencyCode: "USD",
    });
  });

  it("rebuilds a pre-market cart into the active country before adding lines", async () => {
    const current = cartFixture({ buyerIdentity: null });
    const firstLine = current.lines.nodes[0];
    const secondLine: typeof firstLine = {
      ...firstLine,
      id: "gid://shopify/CartLine/2",
      quantity: 1,
      merchandise: {
        ...firstLine.merchandise,
        id: variantGid(2),
        title: "Option 2",
        price: { amount: "5.00", currencyCode: "USD" },
      },
      cost: {
        amountPerQuantity: { amount: "5.00", currencyCode: "USD" },
        totalAmount: { amount: "5.00", currencyCode: "USD" },
      },
    };
    const updated = cartFixture({
      buyerIdentity: { countryCode: "UG" },
      lines: { nodes: [firstLine, secondLine] },
      cost: { subtotalAmount: { amount: "45.00", currencyCode: "USD" } },
    });
    let requestQuery = "";
    let requestVariables: Record<string, unknown> = {};
    const request = async <T>(
      query: string,
      variables: Record<string, unknown> = {}
    ): Promise<T> => {
      requestQuery = query;
      requestVariables = variables;
      return { cartCreate: { cart: updated, userErrors: [] } } as T;
    };

    const result = await addCartLines(
      current.id,
      [{ merchandiseId: variantGid(2), quantity: 1 }],
      current,
      request,
      "UG"
    );

    expect(requestQuery).toContain("mutation CartCreate");
    expect(requestVariables).toEqual({
      input: {
        lines: [
          { merchandiseId: variantGid(1), quantity: 2 },
          { merchandiseId: variantGid(2), quantity: 1 },
        ],
        buyerIdentity: { countryCode: "UG" },
      },
    });
    expect(result.buyerIdentity?.countryCode).toBe("UG");
    expect(result.lines.nodes).toHaveLength(2);
  });

  it("does not treat a zero-line cart or Shopify user error as a successful add", async () => {
    const emptyCart = cartFixture({
      lines: { nodes: [] },
      cost: { subtotalAmount: { amount: "0.00", currencyCode: "USD" } },
    });
    const emptyRequest = async <T>(): Promise<T> =>
      ({ cartCreate: { cart: emptyCart, userErrors: [] } }) as T;
    await expect(
      createCartForCountry(variantGid(1), "US", 1, emptyRequest)
    ).rejects.toThrow(/does not match/i);

    const errorRequest = async <T>(): Promise<T> =>
      ({
        cartCreate: {
          cart: null,
          userErrors: [{ code: "INVALID", message: "market unavailable" }],
        },
      }) as T;
    await expect(
      createCartForCountry(variantGid(1), "UG", 1, errorRequest)
    ).rejects.toThrow("market unavailable");
  });
});
