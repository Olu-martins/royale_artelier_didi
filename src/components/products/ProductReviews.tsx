import { useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api, { Review, ReviewEligibility, ReviewStatus } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  size?: number;
  onChange?: (value: number) => void;
}

const StarRating = ({ value, size = 16, onChange }: StarRatingProps) => {
  const interactive = Boolean(onChange);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          className={cn(interactive ? "cursor-pointer" : "cursor-default")}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}>
          <Star
            size={size}
            className={
              star <= value ? "fill-accent text-accent" : "text-muted"
            }
          />
        </button>
      ))}
    </div>
  );
};

interface ProductReviewsProps {
  productId: string;
}

const STATUS_COPY: Record<ReviewStatus, string> = {
  pending: "Your review is awaiting approval.",
  approved: "Thanks! Your review has been published.",
  rejected: "Your review was not approved.",
};

const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  const [reviewsPage, setReviewsPage] = useState(1);
  const { data: reviewsResult, isLoading } = useQuery({
    queryKey: ["reviews", productId, reviewsPage],
    queryFn: () => api.getProductReviews(productId, { page: reviewsPage }),
    placeholderData: keepPreviousData,
  });
  const reviews = reviewsResult?.data ?? [];

  const { data: eligibility } = useQuery<ReviewEligibility>({
    queryKey: ["review-eligibility", productId],
    queryFn: () => api.getReviewEligibility(productId),
    enabled: isAuthenticated,
  });

  const submitReview = useMutation({
    mutationFn: () =>
      api.createReview(productId, {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      }),
    onSuccess: () => {
      toast.success("Review submitted — it will appear once approved.");
      setRating(0);
      setTitle("");
      setComment("");
      queryClient.invalidateQueries({
        queryKey: ["review-eligibility", productId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to submit review.");
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (rating < 1) {
      toast.error("Please select a star rating.");
      return;
    }
    if (comment.trim().length < 3) {
      toast.error("Please write a short review.");
      return;
    }
    submitReview.mutate();
  };

  const renderComposer = () => {
    if (!isAuthenticated) {
      return (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <Link to="/login" className="text-accent underline">
            Sign in
          </Link>{" "}
          to write a review. Only verified buyers can review a product.
        </div>
      );
    }

    if (!eligibility) {
      return null;
    }

    if (eligibility.hasReviewed) {
      return (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          {eligibility.reviewStatus
            ? STATUS_COPY[eligibility.reviewStatus]
            : "You've already reviewed this product."}
        </div>
      );
    }

    if (!eligibility.canReview) {
      return (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Only verified buyers can review this product. Purchase it to share
          your experience.
        </div>
      );
    }

    return (
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-border p-5 space-y-4">
        <h4 className="font-medium">Write a review</h4>
        <div>
          <Label className="mb-2 block">Your rating</Label>
          <StarRating value={rating} size={24} onChange={setRating} />
        </div>
        <div>
          <Label htmlFor="review-title">Title (optional)</Label>
          <Input
            id="review-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2"
            placeholder="Summarize your experience"
            maxLength={120}
          />
        </div>
        <div>
          <Label htmlFor="review-comment">Your review</Label>
          <Textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-2 min-h-[100px]"
            placeholder="What did you think of the product?"
            maxLength={2000}
          />
        </div>
        <Button
          type="submit"
          className="btn-primary"
          disabled={submitReview.isPending}>
          {submitReview.isPending ? "Submitting..." : "Submit review"}
        </Button>
      </form>
    );
  };

  return (
    <div className="max-w-2xl space-y-8">
      {renderComposer()}

      <div className="space-y-6">
        {isLoading ? (
          <p className="text-muted-foreground">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-muted-foreground">
            No reviews yet. Be the first to review this product.
          </p>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="border-b border-border pb-6 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <StarRating value={review.rating} />
                <span className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              {review.title && <p className="font-medium">{review.title}</p>}
              <p className="text-muted-foreground mt-1">{review.comment}</p>
              <p className="text-xs text-muted-foreground mt-2">
                — {review.userName}
              </p>
            </div>
          ))
        )}

        {reviewsResult && reviewsResult.totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Page {reviewsResult.page} of {reviewsResult.totalPages} ·{" "}
              {reviewsResult.total} reviews
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={reviewsPage <= 1}
                onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!reviewsResult.hasMore}
                onClick={() => setReviewsPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductReviews;
