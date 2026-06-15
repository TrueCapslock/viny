import type { Tasting } from "@/generated/prisma/client"
import { StaticStars } from "@/app/_components/star-rating"

export function TastingList({ tastings }: { tastings: Tasting[] }) {
  if (tastings.length === 0) {
    return <p className="text-sm text-wine-400 text-center py-8">Ingen smaksnotater registrert ennå</p>
  }

  return (
    <div className="space-y-3">
      {tastings.map((tasting) => (
        <div
          key={tasting.id}
          className="rounded-xl border border-cream-200 bg-white p-4"
        >
          <time className="block text-xs text-wine-400/80">
            {new Date(tasting.date).toLocaleDateString("nb-NO", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>

          {tasting.rating ? (
            <div className="mt-2">
              <StaticStars rating={tasting.rating} />
            </div>
          ) : null}

          <div className="space-y-2 mt-3 text-sm text-wine-800">
            {tasting.nose && (
              <div>
                <span className="text-xs font-medium text-wine-500 uppercase tracking-wider">Duft</span>
                <p className="mt-0.5">{tasting.nose}</p>
              </div>
            )}
            {tasting.palate && (
              <div>
                <span className="text-xs font-medium text-wine-500 uppercase tracking-wider">Smak</span>
                <p className="mt-0.5">{tasting.palate}</p>
              </div>
            )}
            {tasting.finish && (
              <div>
                <span className="text-xs font-medium text-wine-500 uppercase tracking-wider">Ettersmak</span>
                <p className="mt-0.5">{tasting.finish}</p>
              </div>
            )}
            {tasting.foodPairing && (
              <div>
                <span className="text-xs font-medium text-wine-500 uppercase tracking-wider">Mat</span>
                <p className="mt-0.5">{tasting.foodPairing}</p>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-cream-100 space-y-0.5 text-xs text-wine-400">
            {tasting.pricePaid && <div>{tasting.pricePaid} kr</div>}
            {tasting.location && <div>{tasting.location}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
