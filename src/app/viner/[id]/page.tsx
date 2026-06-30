import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { TastingList } from "./tasting-list"
import { TastingFormDialog } from "./tasting-form-dialog"
import { DeleteButton } from "@/app/_components/delete-button"
import { ImageLightbox } from "@/app/_components/image-lightbox"
import { CellarToggle } from "@/app/_components/cellar-toggle"
import { SuggestWineButton } from "@/app/_components/suggest-wine-button"
import { AddToListButton } from "@/app/_components/add-to-list-button"
import { ModeLogo, ModeText, ModeTypeLabel } from "@/app/_components/mode-text"

type Params = Promise<{ id: string }>

export default async function WineDetailPage({ params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) notFound()

  const userId = parseInt(session.user.id)
  const { id } = await params
  const wineId = parseInt(id)

  const wine = await prisma.wine.findUnique({
    where: { id: wineId },
    include: { user: true, tastings: { orderBy: { date: "desc" } } },
  })

  if (!wine) notFound()

  const isOwner = wine.userId === userId

  let canEdit = isOwner
  let canView = isOwner

  if (!canEdit) {
    if (wine.sharedListId) {
      const isMember = await prisma.sharedListMember.findUnique({
        where: { sharedListId_userId: { sharedListId: wine.sharedListId, userId } },
      })
      if (isMember) {
        canEdit = true
        canView = true
      }
    }

    if (!canView) {
      const isEditor = await prisma.listShare.findUnique({
        where: { ownerId_editorId: { ownerId: wine.userId, editorId: userId } },
      })
      if (isEditor) {
        canEdit = true
        canView = true
      }
    }

    if (!canView) {
      const isFriend = await prisma.friend.findFirst({
        where: {
          status: "accepted",
          OR: [
            { requesterId: userId, addresseeId: wine.userId },
            { requesterId: wine.userId, addresseeId: userId },
          ],
        },
      })
      if (isFriend) canView = true
    }
  }

  if (!canView) notFound()

  const backHref = isOwner ? "/" : `/venner/${wine.userId}`

  return (
    <div className="flex flex-col flex-1">
      <div className="relative">
        <div
          className={`relative px-4 pt-1 pb-20 ${wine.image ? "" : "bg-wine-gradient"}`}
          style={wine.image ? {
            backgroundImage: `url(${wine.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          } : undefined}
        >
          {wine.image && (
            <div className="absolute inset-0 bg-gradient-to-b from-wine-950/75 via-wine-900/65 to-wine-950/85" />
          )}
          <div className="relative z-10">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm text-wine-200 hover:text-white transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Tilbake
            </Link>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight text-white">{wine.name}</h1>
                <p className="text-base text-wine-200/90 mt-1">
                  {wine.producer}
                  {wine.vintage && `, ${wine.vintage}`}
                </p>
              </div>
              {wine.image ? (
                <ImageLightbox src={wine.image} />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                  <ModeLogo className="w-10 h-10 opacity-40" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {wine.type && (
                <span className="text-xs px-3 py-1 rounded-full bg-white/15 text-wine-100 border border-white/10 backdrop-blur-sm">
                  <ModeTypeLabel type={wine.type} />
                </span>
              )}
              {wine.varietal && (
                <span className="text-xs px-3 py-1 rounded-full bg-white/15 text-wine-100 border border-white/10 backdrop-blur-sm">
                  {wine.varietal}
                </span>
              )}
              {wine.country && (
                <span className="text-xs px-3 py-1 rounded-full bg-white/15 text-wine-100 border border-white/10 backdrop-blur-sm">
                  {wine.country}
                </span>
              )}
              {wine.region && (
                <span className="text-xs px-3 py-1 rounded-full bg-white/15 text-wine-100 border border-white/10 backdrop-blur-sm">
                  {wine.region}
                </span>
              )}
            </div>

            {wine.notes && (
              <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3.5 text-sm text-wine-100/90 leading-relaxed border border-white/5">
                {wine.notes}
              </div>
            )}

            {canEdit && (
              <div className="mt-3">
                <CellarToggle wineId={wine.id} initialInCellar={wine.inCellar} initialQuantity={wine.quantity} />
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex justify-center translate-y-1/2">
          <div className="bg-white rounded-2xl border border-cream-200 shadow-lg shadow-wine-900/5 px-4 py-2 inline-flex items-center gap-3">
            {canEdit && (
              <>
                <AddToListButton wineId={wine.id} wineName={wine.name} />
                <span className="w-px h-5 bg-cream-200" />
                <SuggestWineButton wineId={wine.id} wineName={wine.name} />
                {canEdit && (
                  <>
                    <span className="w-px h-5 bg-cream-200" />
                    <Link
                      href={`/viner/${wine.id}/rediger`}
                      className="text-sm font-medium text-wine-600 hover:text-wine-800 transition-colors px-3.5 py-1.5 rounded-xl hover:bg-wine-50"
                    >
                      Rediger
                    </Link>
                    <span className="w-px h-5 bg-cream-200" />
                    <DeleteButton wineId={wine.id} wineName={wine.name} tastingCount={wine.tastings.length} />
                  </>
                )}
              </>
            )}
            {!canEdit && (
              <>
                <AddToListButton wineId={wine.id} wineName={wine.name} />
                <span className="w-px h-5 bg-cream-200" />
                <SuggestWineButton wineId={wine.id} wineName={wine.name} />
                <span className="text-sm text-wine-400 px-3.5 py-1.5">
                  {wine.user.name ?? wine.user.email} sin <ModeText wine="vin" beer="øl" />
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 mt-14 pb-24 space-y-4">
        <section className="bg-white rounded-2xl border border-cream-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-wine-900 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-wine-500" />
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
