import { notFound } from "next/navigation"
import Link from "next/link"
import type { CSSProperties } from "react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { countryFlag } from "@/lib/countries"
import { wineAccess } from "@/lib/access"
import { TastingList } from "./tasting-list"
import { TastingFormDialog } from "./tasting-form-dialog"
import { CellarToggle } from "@/app/_components/cellar-toggle"
import { SuggestWineButton } from "@/app/_components/suggest-wine-button"
import { AddToListButton } from "@/app/_components/add-to-list-button"
import { ModeText, ModeTypeLabel } from "@/app/_components/mode-text"
import { WineOverflowMenu } from "@/app/_components/wine-overflow-menu"
import { Star, Calendar } from "@/app/_components/icons"
import { Chip } from "@/app/_components/chips"

type Params = Promise<{ id: string }>
// Whitelist of paths the back-button accepts as "from" origins. Anything
// else (protocol-relative URLs like "//evil.example", absolute URLs, or
// surfaces the user didn't arrive from) falls back to the legacy
// owner-non-owner default. Mirrors the Link hrefs WineCard emits.
const ALLOWED_FROM_RE =
  /^(?:\/(?:\?.*)?|\/lister\/\d+(?:\?.*)?|\/venner\/\d+(?:\?.*)?)$/

export default async function WineDetailPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Promise<{ from?: string | string[] }>
}) {
  const session = await auth()
  if (!session?.user?.id) notFound()

  const userId = parseInt(session.user.id)
  const { id } = await params
  const wineId = parseInt(id)
  const sp = await searchParams
  const fromInput = Array.isArray(sp.from) ? sp.from[0] : sp.from
  const sanitized =
    typeof fromInput === "string" && ALLOWED_FROM_RE.test(fromInput)
      ? fromInput
      : null

  // v0.15.0 access gate (shared lib access.ts):
  //   edit = owner or wine on caller's MainList (incl. share-merge)
  //   read = edit OR wine on a list caller owns OR friend of owner AND
  //          wine is on owner's MainList (peek)
  const access = await wineAccess(wineId, userId)
  if (access === "none") notFound()
  const canEdit = access === "edit"

  const wine = await prisma.wine.findUnique({
    where: { id: wineId },
    include: { user: true, tastings: { orderBy: { date: "desc" } } },
  })

  if (!wine) notFound()

  // v0.15.0: inCellar + quantity are ListWine-derived, not Wine columns.
  //
  //   - access === "edit"  → caller-perspective: the (caller's MainList,
  //     wine) ListWine row.
  //   - access === "read"  → disambiguate:
  //       * Pinner (caller pinned wine into their Custom List or MainList):
  //         use the caller's own ListWine row.
  //       * Friend-peek (caller is friend of wine.userId AND wine is on
  //         wine.userId's MainList): use the owner's MainList row.
  let inCellar = false
  let quantity = 0
  if (access === "edit") {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { mainListId: true },
    })
    if (me?.mainListId) {
      const lw = await prisma.listWine.findUnique({
        where: { listId_wineId: { listId: me.mainListId, wineId } },
      })
      inCellar = lw?.inCellar ?? false
      quantity = lw?.quantity ?? 0
    }
  } else {
    const ownRow = await prisma.listWine.findFirst({
      where: {
        wineId,
        list: { OR: [{ isMain: true, userId }, { isMain: false, userId }] },
      },
      select: { inCellar: true, quantity: true },
    })
    if (ownRow) {
      inCellar = ownRow.inCellar
      quantity = ownRow.quantity
    } else {
      // Friend-peek fallback: surface owner's MainList values.
      const owner = await prisma.user.findUnique({
        where: { id: wine.userId },
        select: { mainListId: true },
      })
      if (owner?.mainListId) {
        const ownerRow = await prisma.listWine.findUnique({
          where: { listId_wineId: { listId: owner.mainListId, wineId } },
        })
        inCellar = ownerRow?.inCellar ?? false
        quantity = ownerRow?.quantity ?? 0
      }
    }
  }

  // v0.15.0 isOwner gates the legacy back-button default: callers who
  // own the wine go back to "/" (their MainList), non-owners deep-link
  // into /venner/{ownerId} (the peer's MainList).
  const isOwner = wine.userId === userId

  // Prefer the originating list's path when WineCard threaded a `from`
  // query param (cellar / all-viner / lister / friends). Falls back to
  // the legacy owner/non-owner default for surfaces that don't thread
  // `from` (e.g. direct deep-links, header redirects).
  const backHref = sanitized ?? (isOwner ? "/" : `/venner/${wine.userId}`)

  // Tasting summary — average rating + most recent date (tastings are ordered desc by API)
  const tastingsWithRating = wine.tastings.filter((t) => t.rating != null)
  const avgRating =
    tastingsWithRating.length > 0
      ? tastingsWithRating.reduce((sum, t) => sum + (t.rating ?? 0), 0) / tastingsWithRating.length
      : null
  const lastTasting = wine.tastings[0] ?? null

  // Two-stop darkening gradient: light at the centre for the photo,
  // deep dark at the bottom (kept even though the hero no longer hosts
  // overlaid text — gives the photo depth and a richer look near the seam).
  const heroStyle: CSSProperties = wine.image
    ? {
        backgroundImage: `linear-gradient(to top, rgba(15,8,8,0.85) 0%, rgba(15,8,8,0.40) 32%, rgba(15,8,8,0.55) 100%), url(${wine.image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {}

  // Glass-icon button used for the hero top-right action cluster.
  const iconBtnClass =
    "inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/30 hover:bg-black/45 backdrop-blur-sm transition-colors text-white"

  return (
    <div className="flex flex-col flex-1">
      {/* HERO */}
      <header
        className={`relative flex flex-col px-4 pt-2 pb-20 ${wine.image ? "" : "bg-wine-gradient"}`}
        style={{
          minHeight: wine.image ? "35vh" : "26vh",
          ...heroStyle,
        }}
      >
        <div className="relative z-10 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 hover:bg-black/45 backdrop-blur-sm text-sm text-white/95 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Tilbake
            </Link>

            <div className="flex items-center gap-2">
              <SuggestWineButton
                wineId={wine.id}
                wineName={wine.name}
                variant="icon"
                className={iconBtnClass}
              />
              {canEdit && (
                <WineOverflowMenu
                  wineId={wine.id}
                  wineName={wine.name}
                  tastingCount={wine.tastings.length}
                />
              )}
            </div>
          </div>

          <div className="flex-1" />
        </div>

        {/* Bottom CTA pills — split to the two sides, both straddling the hero/bottom-sheet seam */}
        {canEdit && (
          <div className="absolute left-5 bottom-0 translate-y-1/2 z-30">
            <CellarToggle
              wineId={wine.id}
              initialInCellar={inCellar}
              initialQuantity={quantity}
              variant="pill"
            />
          </div>
        )}
        <div className="absolute right-5 bottom-0 translate-y-1/2 z-30">
          <AddToListButton
            wineId={wine.id}
            wineName={wine.name}
            variant="pill"
            label="Legg i liste"
          />
        </div>
      </header>

      {/* BOTTOM SHEET — rounded top, lifts off the hero */}
      <div className="relative z-10 bg-cream-50 rounded-t-3xl px-4 pt-12 pb-24 shadow-xl shadow-wine-900/10">
        {/* Wine identity — name, producer, attribution, two chips (geography + type) */}
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-wine-900 leading-[1.1]">
            {wine.name}
          </h1>
          <p className="text-sm sm:text-base text-wine-600 mt-1 font-medium">
            {wine.producer}
            {wine.vintage && <span className="text-wine-500"> · {wine.vintage}</span>}
          </p>
          {wine.userId !== userId && (
            <p className="text-xs text-wine-400 mt-1">
              {wine.user.name ?? wine.user.email} sin <ModeText wine="vin" beer="øl" />
            </p>
          )}
          {(wine.region || wine.country || wine.type) && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(wine.region || wine.country) && (
                <Chip
                  label={[wine.region, wine.country].filter(Boolean).join(", ")}
                  flag={countryFlag(wine.country)}
                />
              )}
              {wine.type && (
                <Chip label={<ModeTypeLabel type={wine.type} />} />
              )}
            </div>
          )}
        </div>

        {(avgRating !== null || lastTasting) && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-cream-100 border border-cream-200 rounded-2xl p-5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-wine-500 mb-1.5">
                <Star className="w-3.5 h-3.5 text-gold-500" />
                Snittvurdering
              </div>
              <div className="text-xl font-bold text-wine-900 tabular-nums">
                {avgRating !== null ? avgRating.toFixed(1) : <span className="text-wine-400 font-normal">—</span>}
              </div>
            </div>
            <div className="bg-cream-100 border border-cream-200 rounded-2xl p-5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-wine-500 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-wine-500" />
                Sist smakt
              </div>
              <div className="text-xl font-bold text-wine-900">
                {lastTasting ? new Date(lastTasting.date).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" }) : <span className="text-wine-400 font-normal">—</span>}
              </div>
            </div>
          </div>
        )}

        {wine.notes && (
          <div className="mb-5 px-4 py-3.5 bg-white rounded-2xl border border-cream-200 text-sm text-wine-700 leading-relaxed">
            {wine.notes}
          </div>
        )}

        {/* Detaljer — comprehensive field listing including grape type */}
        <section className="bg-white rounded-2xl border border-cream-200 p-5 shadow-sm mb-5">
          <h2 className="text-base font-bold text-wine-900 mb-4">
            Detaljer
          </h2>
          <dl className="space-y-2.5 text-sm">
            {wine.producer && (
              <div className="flex justify-between gap-3">
                <dt className="text-wine-400 shrink-0">Produsent</dt>
                <dd className="text-wine-900 font-medium text-right">{wine.producer}</dd>
              </div>
            )}
            {wine.vintage && (
              <div className="flex justify-between gap-3">
                <dt className="text-wine-400 shrink-0">Årgang</dt>
                <dd className="text-wine-900 font-medium text-right">{wine.vintage}</dd>
              </div>
            )}
            {wine.region && (
              <div className="flex justify-between gap-3">
                <dt className="text-wine-400 shrink-0">Region</dt>
                <dd className="text-wine-900 font-medium text-right">{wine.region}</dd>
              </div>
            )}
            {wine.country && (
              <div className="flex justify-between gap-3">
                <dt className="text-wine-400 shrink-0">Land</dt>
                <dd className="text-wine-900 font-medium text-right">
                  {wine.country}{countryFlag(wine.country) && <span className="ml-1.5">{countryFlag(wine.country)}</span>}
                </dd>
              </div>
            )}
            {wine.type && (
              <div className="flex justify-between gap-3">
                <dt className="text-wine-400 shrink-0">Type</dt>
                <dd className="text-wine-900 font-medium text-right">
                  <ModeTypeLabel type={wine.type} />
                </dd>
              </div>
            )}
            {wine.varietal && (
              <div className="flex justify-between gap-3">
                <dt className="text-wine-400 shrink-0">Drue</dt>
                <dd className="text-wine-900 font-medium text-right">{wine.varietal}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="bg-white rounded-2xl border border-cream-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-wine-900">
              Smaksnotater ({wine.tastings.length})
            </h2>
            {canEdit && <TastingFormDialog wineId={wine.id} />}
          </div>
          <TastingList tastings={wine.tastings} />
        </section>
      </div>
    </div>
  )
}
