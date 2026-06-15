"use client"

import { Star } from "@/app/_components/icons"

export function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange?: (rating: number) => void
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star === value ? 0 : star)}
          className={`p-0.5 transition-colors ${
            onChange
              ? "cursor-pointer hover:scale-110"
              : "cursor-default"
          } ${star <= value ? "text-gold-500" : "text-cream-300"}`}
        >
          <Star className="w-5 h-5" />
        </button>
      ))}
    </div>
  )
}

export function StaticStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? "text-gold-500" : "text-cream-300"
          }`}
        />
      ))}
    </div>
  )
}
