# LongTail Rebuild — Design Ground Truth

## Reference

Ground-truth reference: https://hc423tpiapnbg.ok.kimi.link/

This rebuild preserves the reference site's warm, editorial luxury pet-lifestyle direction and its three-page information architecture: Home (`/`), Collections (`/products` and `/products.html`), and Heritage (`/about` and `/about.html`). The reference is the source of truth for tone, visual mood, copy hierarchy, navigation labels, cart placement, and image-led storytelling. The rebuild may improve spacing, accessibility, responsive behavior, and interaction clarity without changing the brand premise.

## Chosen Direction: Parisian Atelier Editorial

### Design Movement

Contemporary quiet luxury with art-deco restraint, editorial fashion composition, and European atelier cues. The interface should feel like a printed lookbook translated into a responsive storefront rather than a generic ecommerce grid.

### Core Principles

1. **Material warmth:** parchment, linen, walnut, cognac leather, and antique brass should feel tactile through color, grain, borders, and imagery.
2. **Editorial asymmetry:** favor split compositions, offset captions, full-bleed imagery, and deliberate negative space over centered template blocks.
3. **Quiet confidence:** avoid noisy effects; use refined rules, restrained motion, and confident copy.
4. **Designed for companions:** every interaction must be easy on touch, readable on phones, and visibly supportive of the dachshund lifestyle.

### Color Philosophy

The base is a lightly warm parchment rather than stark white, making the page feel archival and tactile. Espresso text supplies strong readability, while antique brass is reserved for active states, dividers, prices, and brand moments. Muted sage appears sparingly as a secondary grounding tone. The result should feel collected, not decorated.

### Layout Paradigm

Use a flexible editorial frame: a narrow utility rail and header establish the brand, then hero and content sections alternate between full-bleed visual plates, offset text columns, and responsive product matrices. Desktop layouts can breathe into wide compositions; phones collapse into a single reading column with intentional image crops, sticky cart access, and horizontally scrollable category controls.

### Signature Elements

- A small brass hairline rule with a circular terminal used as a recurring section marker.
- Editorial image plates with soft rounded corners only where they reinforce the photograph, otherwise square or lightly clipped edges.
- Fine uppercase metadata, small pill labels, and generous display serif headlines inspired by printed fashion catalogues.

### Interaction Philosophy

Interactions should feel like opening a drawer in a boutique: direct, calm, reversible, and tactile. Buttons visibly press, cards lift slightly, category filters update immediately, mobile navigation slides from the side, and the shopping cart opens as a right-side drawer on desktop or a full-height sheet on phones. All actions have focus states and clear labels.

### Animation

Use short ease-out transitions for hover, focus, filtering, and cart changes. Product cards fade and lift by a few pixels on entrance with subtle stagger; drawers enter from the edge with opacity and translate only. Respect `prefers-reduced-motion`. No decorative infinite motion or autoplay that competes with reading.

### Typography System

Use **DM Serif Display** for brand marks, display headlines, and editorial section titles. Use **Manrope** for navigation, product names, body copy, metadata, and controls. Headlines should be oversized but not crowded; body text should sit around 1rem–1.1rem with comfortable line-height; uppercase metadata uses tracked small sizes.

### Brand Essence

LongTail is a refined lifestyle house for dachshunds and the people who adore them, distinguished by fashion-editorial restraint and considered craftsmanship. Personality: **cultured, warm, exacting**.

### Brand Voice

Headlines are declarative and sensory. CTAs are concise invitations, never hype. Microcopy is calm, specific, and companionable.

Example lines:

- “Made for the long way home.”
- “A little more ceremony for the everyday walk.”

### Wordmark & Logo

Use the generated emblem as a bold dachshund-tail / spine symbol beside a typographic LongTail wordmark. The symbol should remain legible at header and favicon sizes and should never be replaced by a default text glyph.

### Signature Brand Color

**Atelier Brass `#B68A3A`** — an ownable antique-gold tone used with restraint for prices, active navigation, fine rules, and signature icons.

## Functional Scope

The rebuild includes responsive Home, Collections, and Heritage pages; working internal navigation; category filtering; add-to-cart actions; quantity controls; remove actions; cart totals; a checkout button with a clear non-payment placeholder state; mobile navigation; carousel-like featured panels; and visible focus states. Product and image content is static by design because the original site did not expose a backend or live inventory system.
