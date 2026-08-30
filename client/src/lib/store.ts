/* LongTail Parisian Atelier Editorial — product taxonomy, cart vocabulary, and formatters. */

export type ProductCategory = "beds" | "walks" | "treats" | "travel";

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  categoryLabel: string;
  tag?: string;
  material: string;
  image: string;
  alt: string;
};

export const productCategories = [
  { value: "all", label: "All Collections" },
  { value: "beds", label: "Cozy Beds" },
  { value: "walks", label: "Daily Walks" },
  { value: "treats", label: "Gourmet Treats" },
] as const;

export const products: Product[] = [
  {
    id: "velvet-chaise-lounge",
    name: "Velvet Chaise Lounge",
    description: "Luxurious cream velvet with gold accents",
    price: 299,
    category: "beds",
    categoryLabel: "Cozy Beds",
    tag: "Best Seller",
    material: "Premium",
    image: "/manus-storage/product-bed1_1848c5b8.jpg",
    alt: "Velvet chaise lounge with gold accents",
  },
  {
    id: "linen-daybed",
    name: "Linen Daybed",
    description: "Natural linen with brass legs",
    price: 249,
    category: "beds",
    categoryLabel: "Cozy Beds",
    material: "Artisan",
    image: "/manus-storage/product-bed2_abb60c69.jpg",
    alt: "Natural linen daybed with brass legs",
  },
  {
    id: "cognac-leather-set",
    name: "Cognac Leather Set",
    description: "Handcrafted leather harness & leash",
    price: 189,
    category: "walks",
    categoryLabel: "Daily Walks",
    tag: "New",
    material: "Handmade",
    image: "/manus-storage/product-harness1_ab7d2d40.jpg",
    alt: "Handcrafted cognac leather harness and leash",
  },
  {
    id: "premium-walk-collection",
    name: "Premium Walk Collection",
    description: "Multiple leather finishes available",
    price: 159,
    category: "walks",
    categoryLabel: "Daily Walks",
    material: "Classic",
    image: "/manus-storage/product-harness2_a2d62e6b.jpg",
    alt: "Premium leather dog accessories in multiple finishes",
  },
  {
    id: "artisanal-treats",
    name: "Artisanal Treats",
    description: "Organic snacks in luxury packaging",
    price: 89,
    category: "treats",
    categoryLabel: "Gourmet Treats",
    material: "Organic",
    image: "/manus-storage/product-treats1_e0f3ffdf.jpg",
    alt: "Artisanal treats in luxury packaging",
  },
  {
    id: "luxury-treat-collection",
    name: "Luxury Treat Collection",
    description: "Premium variety pack",
    price: 129,
    category: "treats",
    categoryLabel: "Gourmet Treats",
    material: "Gourmet",
    image: "/manus-storage/product-treats2_ba69ce18.jpg",
    alt: "Luxury variety pack of gourmet treats",
  },
  {
    id: "premium-cushion",
    name: "Premium Cushion",
    description: "Memory foam comfort",
    price: 179,
    category: "beds",
    categoryLabel: "Cozy Beds",
    material: "Comfort",
    image: "/manus-storage/product-bed2_abb60c69.jpg",
    alt: "Premium cushion in a calm luxury interior",
  },
  {
    id: "travel-set",
    name: "Travel Set",
    description: "Portable luxury accessories",
    price: 219,
    category: "travel",
    categoryLabel: "Travel",
    material: "Travel",
    image: "/manus-storage/product-harness2_a2d62e6b.jpg",
    alt: "Portable luxury accessories for travel",
  },
];

export const formatPrice = (price: number) => `$${price.toLocaleString("en-US")}`;

export const getProduct = (id: string) => products.find((product) => product.id === id);
