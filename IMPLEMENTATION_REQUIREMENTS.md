# Nexus implementation requirements

Source: `pasted_content.txt` shared by the user plus the user's implementation request. This is an execution record, not a prompt.

## Image search and sign-in
- Image upload for product searching must work.
- Uploaded search images use a temporary Cloudinary session and are deleted after the search request completes.
- The sign-in email field must be visibly large and proportional to the other controls in its container.

## FAQ and delivery
- FAQs must have their own `/faq` page, not only appear on Home.
- Include the supplied FAQ content covering destinations, delivery time, shipping cost, payments, order tracking, cancellations, damaged products, returns/refunds, product authenticity, and contact support.
- Shopify is the source of truth for shipping cost and estimated delivery time at checkout; do not invent rates or dates.

## Cart and checkout
- When a shopper adds a product to cart, show item price, quantity, line total, subtotal, shipping cost, and delivery-time information.
- Until a delivery address and Shopify rate are available, clearly label shipping and delivery as calculated/provided by Shopify at checkout.
- Checkout must remain the Shopify checkout URL.
- Shopify's purchase confirmation and fulfillment/tracking updates should use the email supplied during checkout.

## Order tracking
- Emphasize order tracking in navigation, checkout guidance, FAQ, and the tracking page.
- After fulfillment, show Shopify's carrier, tracking number, tracking URL, fulfillment status, and timeline in the app.
- The tracking page must let a customer securely look up an order with order number plus the checkout email or phone.

## Reviews
- Display product reviews with a Verified purchase label.
- Only a signed-in customer with a verified email and paid Shopify purchase can submit a review.
- Provide clickable 1–5 star controls and persist the selected rating.
