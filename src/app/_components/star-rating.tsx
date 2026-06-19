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
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value
        return (
          <button
            key={star}
            type="button"
            disabled={!onChange}
            onClick={() => onChange?.(star === value ? 0 : star)}
            className={`relative transition-all duration-150 ${
              onChange
                ? "cursor-pointer hover:scale-110 active:scale-90"
                : "cursor-default"
            }`}
          >
            <Star
              className={`w-7 h-7 transition-all duration-200 ${
                filled
                  ? "text-gold-500 drop-shadow-sm"
                  : "text-gray-200 hover:text-gray-300"
              }`}
            />
          </button>
        )
      })}
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
            star <= rating ? "text-gold-500" : "text-gray-200"
          }`}
        />
      ))}
    </div>
  )
}
