import type { Tasting } from "@/generated/prisma/client"
import { StaticStars } from "@/app/_components/star-rating"

export function TastingList({ tastings }: { tastings: Tasting[] }) {
  if (tastings.length === 0) {
    return <p className="text-sm text-wine-400 text-center py-6">Ingen smaksnotater registrert ennå</p>
  }

  return (
    <div className="space-y-4">
      {tastings.map((tasting) => (
        <div
          key={tasting.id}
          className="rounded-xl border border-cream-200 bg-cream-50/50 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <time className="text-xs text-wine-400">
              {new Date(tasting.date).toLocaleDateString("nb-NO", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            {tasting.rating ? (
              <StaticStars rating={tasting.rating} />
            ) : null}
          </div>

          <div className="space-y-1.5 text-sm text-wine-800">
            {tasting.nose && (
              <p>
                <span className="font-medium text-wine-500">Duft: </span>
                {tasting.nose}
              </p>
            )}
            {tasting.palate && (
              <p>
                <span className="font-medium text-wine-500">Smak: </span>
                {tasting.palate}
              </p>
            )}
            {tasting.finish && (
              <p>
                <span className="font-medium text-wine-500">Ettersmak: </span>
                {tasting.finish}
              </p>
            )}
            {tasting.foodPairing && (
              <p>
                <span className="font-medium text-wine-500">Mat: </span>
                {tasting.foodPairing}
              </p>
            )}
          </div>

          <div className="flex gap-3 mt-3 text-xs text-wine-400 pt-2 border-t border-cream-200">
            {tasting.pricePaid && <span>{tasting.pricePaid} kr</span>}
            {tasting.location && <span>{tasting.location}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
