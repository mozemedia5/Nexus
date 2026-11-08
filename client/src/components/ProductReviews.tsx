import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Star } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase";
import { useStoreAccount } from "@/hooks/useStoreAccount";

type Review = {
  id: string;
  rating: number;
  title: string;
  body: string;
  reviewerName: string;
  createdAt: string;
};

export default function ProductReviews({ productHandle }: { productHandle: string }) {
  const { profile } = useStoreAccount();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const average = useMemo(() => reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0, [reviews]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productHandle)}/reviews`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not load product reviews.");
      setReviews(Array.isArray(payload.reviews) ? payload.reviews : []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load product reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadReviews(); }, [productHandle]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const user = getFirebaseAuth()?.currentUser;
    if (!user) {
      setError("Please sign in with the account used for your purchase.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/products/${encodeURIComponent(productHandle)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, title, body }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save your review.");
      setNotice(payload.message || "Your review has been saved.");
      setTitle("");
      setBody("");
      await loadReviews();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="product-reviews" aria-labelledby="product-reviews-title">
      <div className="product-reviews-heading">
        <div>
          <span className="eyebrow">Customer feedback</span>
          <h2 id="product-reviews-title">Reviews</h2>
        </div>
        {!loading && reviews.length > 0 && (
          <div className="product-reviews-rating" aria-label={`${average.toFixed(1)} out of 5 stars from ${reviews.length} reviews`}>
            <Star size={16} fill="currentColor" /> <strong>{average.toFixed(1)}</strong> <span>({reviews.length})</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="product-reviews-skeleton" aria-label="Loading reviews"><i /><i /><i /></div>
      ) : reviews.length ? (
        <div className="product-reviews-list">
          {reviews.map(review => (
            <article key={review.id} className="product-review-card">
              <div className="product-review-stars" aria-label={`${review.rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} fill={index < review.rating ? "currentColor" : "none"} />)}
              </div>
              <strong>{review.title}</strong>
              <p>{review.body}</p>
              <small>{review.reviewerName} · Verified purchase · {new Date(review.createdAt).toLocaleDateString()}</small>
            </article>
          ))}
        </div>
      ) : (
        <p className="product-reviews-empty">No reviews yet. Verified buyers can be the first to share their experience.</p>
      )}

      <div className="product-review-form-wrap">
        <h3>Share your experience</h3>
        {profile ? (
          <form className="product-review-form" onSubmit={submit}>
            <label>Rating
              <span className="product-review-rating-input" role="radiogroup" aria-label="Your rating">
                {Array.from({ length: 5 }, (_, index) => {
                  const value = index + 1;
                  return <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} star${value === 1 ? "" : "s"}`} onClick={() => setRating(value)}><Star size={20} fill={value <= rating ? "currentColor" : "none"} /></button>;
                })}
              </span>
            </label>
            <label htmlFor="product-review-title">Review title</label>
            <input id="product-review-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={80} required placeholder="What should other shoppers know?" />
            <label htmlFor="product-review-body">Your review</label>
            <textarea id="product-review-body" value={body} onChange={event => setBody(event.target.value)} maxLength={1500} required rows={4} placeholder="Tell us about your experience with this product." />
            <button type="submit" disabled={submitting}>{submitting ? "Verifying purchase…" : "Submit review"}</button>
            <small>Only verified purchasers with a paid order can submit. Your review is checked against your signed-in email.</small>
          </form>
        ) : (
          <p className="product-reviews-signin"><Link href={`/login?returnTo=${encodeURIComponent(`/products/${productHandle}`)}`}>Sign in</Link> with the account used for your purchase to write a review.</p>
        )}
        {error && <p className="product-review-error" role="alert">{error}</p>}
        {notice && <p className="product-review-notice" role="status">{notice}</p>}
      </div>
    </section>
  );
}
