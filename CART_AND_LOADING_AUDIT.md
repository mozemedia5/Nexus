# Nexus Cart and Page-Loading Audit

**Repository:** `mozemedia5/Nexus` (local checkout at the time of review)
**Audit date:** 5 November 2026
**Scope:** Shopify Storefront cart flow, cart persistence/recovery, product purchase controls, data loading/error handling, and verification status.

## Findings at a glance

The cart is implemented as a Shopify Storefront API cart, not as a browser-only mock. Product adds require a real Shopify ProductVariant GID and a variant Shopify currently reports for sale; cart creation and changes are sent to Shopify, returned line quantities are checked against the requested change, and checkout redirects to a validated HTTPS Shopify host. The code has unit coverage for these core rules.

I found and fixed a concrete cart-retention defect: when Shopify could not be reached while restoring a saved cart, the provider removed the saved cart snapshot. I also fixed a product detail loader that could remain on “Loading product details…” forever when Shopify returned no product or the request failed. The app-level error page no longer displays a raw JavaScript stack trace; it now logs the caught exception, component stack, and current path to the browser console for diagnosis.

The user-reported live cart cannot be declared fully working yet. The sandbox has no Shopify Storefront domain/token configured, and Vercel access was not connected, so I could not verify production environment variables, inspect current function logs, add an actual live product, or complete checkout. Those are material verification gaps, not evidence that the production cart is broken.

The current source contains no reference to a missing `ye` function, and its routes, imports, typecheck, and production build pass. The exact production render exception therefore remains unconfirmed; the improved error-boundary logging will expose its stack and route in the browser console if it recurs.

The repository had 13 file-based Vercel API entrypoints. Four Cloudinary endpoints now dispatch through one handler, and explicit Vercel rewrites preserve all four existing public URLs. The checked-in API entrypoint count is now 10.

## Cart flow traced

1. The product loader fetches Shopify products and normalizes their variants. `getAvailableVariant` chooses the cheapest valid, available variant by default, while the product page can pass a specific selected variant.
2. The product page calls `addItem(product, variantId, quantity)`. The cart provider validates the selected variant and quantity before making a request.
3. An empty cart uses Shopify `cartCreate`; an existing cart uses `cartLinesAdd`. Quantity changes use `cartLinesUpdate`; removals use `cartLinesRemove`.
4. Cart responses are checked for a cart ID, checkout URL, valid product/variant IDs, positive prices, sensible quantities, and expected line totals. Mutation errors returned by Shopify are surfaced rather than treated as success.
5. The cart ID and a compact variant/quantity snapshot are saved in browser local storage. Shopify remains the source of truth on restore; if the cart has expired, the saved variant IDs are checked against current Shopify availability before rebuilding.
6. Checkout uses Shopify’s returned checkout URL and rejects non-HTTPS or non-Shopify hosts.

The code path is internally coherent and no missing base cart mutation was found. Whether those requests succeed in production depends on Vercel’s public Storefront API environment values, the Shopify store/API version and token, and the live product’s variant/availability data.

## Confirmed defects fixed

### Transient restore failures could erase the saved cart

Before the change, any restore exception removed `liverton-shopify-cart`. That catch included temporary network failures and Shopify API outages, not only malformed data or a confirmed expired cart. The persistence effect could then remove the snapshot as well. A shopper returning after an outage could lose the recovery data before Shopify became reachable again.

The provider now retains the snapshot when restoration fails transiently. If the shopper adds an item after that failed restore, the provider attempts to revalidate and merge still-purchasable saved lines with the new item instead of silently replacing the old cart. Invalid snapshots are still discarded, and a successful update replaces the snapshot with the confirmed Shopify cart.

### Product details could display a loading state indefinitely

`getProduct()` previously logged Shopify errors and returned `null`, while the product page did not have an explicit loading-complete state for a null result. A failed fetch or missing product could therefore be indistinguishable from a request still in progress. The data helper now surfaces request errors to the page, and the page has explicit loading, missing-product, and error branches with catalogue navigation.

### Unexpected render errors exposed implementation detail

The global error boundary printed the caught JavaScript stack trace in the page. It now shows a user-facing recovery message with “Try Again” and “Return Home” actions instead.

## Cart/UI behavior and constraints found

- The product detail page disables “Add to Cart” when no valid available variant is selected. Its variant selector labels unavailable variants as disabled.
- Quantity is restricted to whole numbers from 1 to 250 per variant, matching the client’s Shopify cart constraints.
- The cart drawer renders Shopify-returned lines and subtotal, supports quantity changes/removal, and displays mutation errors. Checkout is disabled for invalid prices.
- Product queries currently ask Shopify for only the first **20 variants** per product. A product with more than 20 variants may have a valid purchasable option that this UI never receives. This is a known implementation ceiling to address if the Nexus catalog uses products with more than 20 variants.
- Cart queries request only the first **100 lines**. This is sufficient for ordinary carts, but the response validation assumes the returned connection represents the entire cart. If the store permits carts beyond 100 distinct lines, additional pagination would be needed before those very large carts are reliably represented.
- The current price validation rejects zero-priced variants. If Nexus intentionally sells free products, this rule will classify them as unavailable; the current tests explicitly assert that behavior. It is not a blocker for normal positive-priced products, but free items need an explicit business decision.
- The cart’s operation lock rejects overlapping changes with a “cart is updating” message rather than queueing clicks. The drawer disables controls while busy, which limits user-facing races.

## Page loading/error audit

- **Product details:** fixed as described above. A missing product or failed Shopify request now reaches a finite, user-visible state.
- **Home/catalogue product data:** the product and collection helpers catch many Shopify errors, log them, and return empty arrays. This prevents a React crash, but it can make a Shopify outage look like “No products are available yet” or an empty collection rather than a service error. Improving that distinction requires a consistent result/error contract across the storefront data layer and the home/catalogue UI; it is separate from the cart mutation path.
- **Global render errors:** the page-level fallback is now safer and provides recovery actions.
- **Cart network errors:** cart actions already show the failure in the cart drawer. Cart restoration now preserves the snapshot when the failure is transient.

## Required production configuration and manual verification

The Firebase Admin service account is **not** the credential used by the storefront cart. The cart calls Shopify’s **Storefront API** from the browser. For the cart to accept products, Vercel needs a store domain (`SHOPIFY_STORE_DOMAIN` or `VITE_SHOPIFY_STORE_DOMAIN`) and a public Storefront API token (`SHOPIFY_STOREFRONT_API_ACCESS_TOKEN` or `SHOPIFY_STOREFRONT_ACCESS_TOKEN`). The token is exposed in the browser and must be a public Storefront token, never an Admin or private Storefront token. `SHOPIFY_API_VERSION` is optional; the code defaults to `2026-07`.

For Firebase Authentication/Firestore in the browser, set either `VITE_FIREBASE_CONFIG_JSON` containing `apiKey`, `authDomain`, `projectId`, and `appId`, or those required fields individually as `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`. The server-side Firebase Admin APIs use `FIREBASE_SERVICE_ACCOUNT_JSON`. The user reports this service-account variable already exists in Vercel; I could not inspect Vercel to confirm it. Reviews also require `SHOPIFY_ADMIN_ACCESS_TOKEN` with Shopify Admin `read_orders` access to verify paid purchases. That Admin token must remain server-only.

After Vercel access is available, the production verification checklist is:

1. Confirm production Storefront domain, public Storefront token, and API version are set for the correct Vercel project and redeployed after any changes.
2. Open a known in-stock product that has a valid positive-price Shopify variant; add it once and confirm the Shopify response appears as a cart line with the expected selected variant and price.
3. Increase/decrease quantity, remove the item, reload the page, and confirm persisted cart recovery.
4. Test an expired cart or invalid variant and verify the app shows a clear recovery/error message without duplicating items.
5. Follow the cart checkout button and confirm it reaches the expected Shopify-hosted checkout with the same product and quantity. Do not submit a payment to test this.
6. Review Vercel function/build logs and browser network responses for Shopify 401/403, GraphQL errors, CORS, missing environment values, or throttling.
7. If the user’s “cart error” specifically refers to a production console message, capture its request URL, status code, and response body; that identifies whether the failure is a Shopify Storefront request or an unrelated API call.

## Validation run

- `pnpm test`: **passed** — 18 tests covering product/variant validation, cart response validation, GraphQL/user errors, duplicate quantity handling, update/remove quantity expectations, expired-cart revalidation, saved-cart merging, Cloudinary API dispatch and authorization, route rewrites, and the 10-function ceiling.
- `pnpm check`: **passed** — TypeScript.
- `pnpm build`: **passed**. Vite still reports a large JavaScript chunk warning; this did not fail the build.
- `git diff --check`: **passed**.
- Production Shopify cart/checkout: **not run** because the sandbox has no Shopify Storefront credentials and Vercel was not authorized.

## Files changed for the earlier cart and loading fixes

- `client/src/contexts/CartContext.tsx` — preserve/merge cart snapshot through transient Shopify restore errors.
- `client/src/lib/store.ts` — propagate product fetch errors to the product detail screen.
- `client/src/pages/ProductDetail.tsx` — finite loading, missing-product and error states.
- `client/src/components/ErrorBoundary.tsx` — safe fallback without raw stack trace.

Other earlier changes add the Vercel interactions/reviews handlers, Gemini error handling, review UI, and gallery/loading presentation improvements.

## Follow-up code changes on 5 November 2026

- `api/cloudinary-router.ts` consolidates the four Cloudinary handlers while retaining per-action method, authorization, capability, validation, status, and cache behavior.
- `vercel.json` rewrites the original four Cloudinary URLs to the consolidated handler and leaves the SPA fallback last.
- `client/src/components/ErrorBoundary.tsx` logs render exceptions and component context without showing stack traces to shoppers.
- `client/src/lib/cloudinaryRouter.test.ts` verifies dispatcher behavior, the rewrite map, and the function-count ceiling.

The production Shopify cart, live Vercel deployment, and deployment logs still need verification against connected production services. The production build also continues to report an oversized JavaScript chunk warning; this is a performance warning and did not fail the build.

## Production cart incident follow-up — 8 November 2026

### Confirmed production response

The production catalogue exposed live Shopify products, so I tested an actual published product through the production storefront and captured the live Storefront API response (not a mock). For the first product, Shopify reported the variant as available with 228 units available and a catalog price of USD 88.69. The storefront sent a cart-create request with quantity 1. Shopify returned HTTP 200, no top-level GraphQL errors, and an empty `userErrors` array, but the cart response contained quantity 0, a line total of USD 0.00, and a subtotal of USD 0.00. A subsequent `cartLinesAdd` of quantity 1 to that test cart also returned quantity 0 and USD 0.00 with no errors. No checkout or payment was submitted.

This confirms the live response fails the strict positive-quantity/price validation, so rejecting it is correct. It does **not** confirm a base-versus-presentment currency mismatch: the observed variant price, line unit price, line total, and subtotal were all USD. The production API response is internally inconsistent with both the requested quantity and the variant's availability/price. The live cart cannot be reported as fixed until Shopify returns a valid cart line or its underlying Storefront API/store configuration is corrected.

### Code and tests added in this follow-up

- `client/src/lib/store.ts` now accepts differing catalog/base and presentment currencies, while requiring valid positive decimal money values, supported currency codes, valid variant IDs, positive integer cart quantities, presentment-consistent line prices/totals, complete cart data, and a secure Shopify checkout URL. It logs sanitized GraphQL, mutation, and invalid-cart diagnostics without logging credentials, cart IDs, or request variables.
- `client/src/contexts/CartContext.tsx` uses Shopify's returned line total for the line display.
- `client/src/components/CartDrawer.tsx` distinguishes a failed cart action from a confirmed empty cart.
- `client/src/lib/store.test.ts` covers USD catalog/cart pricing, USD-to-CAD/EUR presentment, malformed money, missing/cross-currency line prices, invalid quantities, and GraphQL/user errors.

Current local validation: `pnpm test` passes (22 tests across 2 files), `pnpm check` passes, and the production build completes. Formatting was applied; a final full verification is pending after the last diagnostic edit. Vercel OAuth authorization is still pending, so deployment status must not be represented as verified until authorization and deployment checks complete.
