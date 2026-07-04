function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`bg-cream-200 animate-pulse rounded ${className ?? ""}`} />
}

export function WineCardSkeleton() {
  return (
    <div className="block rounded-2xl bg-white border border-cream-200/80 shadow-sm">
      <div className="p-4">
        <div className="flex items-start gap-3.5">
          <SkeletonBlock className="w-14 h-14 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0 pt-0.5 space-y-2">
            <SkeletonBlock className="h-4 rounded w-3/4" />
            <SkeletonBlock className="h-3 rounded w-1/2" />
            <div className="flex gap-1.5 mt-2">
              <SkeletonBlock className="h-4 rounded-full w-14" />
              <SkeletonBlock className="h-4 rounded-full w-16" />
              <SkeletonBlock className="h-4 rounded-full w-12" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-cream-100/80">
          <SkeletonBlock className="h-3 rounded w-24" />
          <SkeletonBlock className="h-3 rounded w-20" />
        </div>
      </div>
    </div>
  )
}

export function WineCardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <WineCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function UserCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-cream-200 p-4 flex items-center gap-3">
      <SkeletonBlock className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <SkeletonBlock className="h-3.5 rounded w-1/3" />
        <SkeletonBlock className="h-2.5 rounded w-1/2" />
      </div>
      <SkeletonBlock className="h-3 rounded w-12 shrink-0" />
    </div>
  )
}

export function SearchFilterSkeleton() {
  return (
    <div className="space-y-2.5">
      <SkeletonBlock className="h-10 rounded-xl w-full" />
      <div className="flex gap-1.5">
        <SkeletonBlock className="h-7 rounded-full w-16" />
        <SkeletonBlock className="h-7 rounded-full w-20" />
        <SkeletonBlock className="h-7 rounded-full w-14" />
        <SkeletonBlock className="h-7 rounded-full w-18" />
        <SkeletonBlock className="h-7 rounded-full w-16" />
      </div>
    </div>
  )
}

export function DetailPageSkeleton() {
  return (
    <div className="flex flex-col flex-1">
      {/* HERO */}
      <header className="bg-wine-gradient relative flex flex-col px-4 pt-2 pb-20" style={{ minHeight: "26vh" }}>
        <div className="relative z-10 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-3">
            <SkeletonBlock className="h-8 w-24 rounded-full" />
            <div className="flex items-center gap-2">
              <SkeletonBlock className="w-9 h-9 rounded-full" />
              <SkeletonBlock className="w-9 h-9 rounded-full" />
            </div>
          </div>
          <div className="flex-1" />
        </div>
        <div className="absolute left-5 bottom-0 translate-y-1/2 z-30">
          <SkeletonBlock className="h-10 w-28 rounded-full" />
        </div>
        <div className="absolute right-5 bottom-0 translate-y-1/2 z-30">
          <SkeletonBlock className="h-10 w-36 rounded-full" />
        </div>
      </header>

      {/* BOTTOM SHEET */}
      <div className="relative z-10 bg-cream-50 rounded-t-3xl px-4 pt-12 pb-24 shadow-xl shadow-wine-900/10">
        {/* Wine identity */}
        <div className="mb-5">
          <SkeletonBlock className="h-7 w-2/3 rounded-md mb-1" />
          <SkeletonBlock className="h-4 w-1/3 rounded-md mt-2" />
          <div className="flex flex-wrap gap-1.5 mt-3">
            <SkeletonBlock className="h-6 rounded-full w-24" />
            <SkeletonBlock className="h-6 rounded-full w-16" />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-cream-100 border border-cream-200 rounded-2xl p-5">
            <SkeletonBlock className="h-3 w-20 rounded mb-2" />
            <SkeletonBlock className="h-6 w-12 rounded-md" />
          </div>
          <div className="bg-cream-100 border border-cream-200 rounded-2xl p-5">
            <SkeletonBlock className="h-3 w-20 rounded mb-2" />
            <SkeletonBlock className="h-6 w-24 rounded-md" />
          </div>
        </div>

        {/* Detaljer */}
        <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-sm mb-5">
          <SkeletonBlock className="h-5 w-16 rounded-md mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex justify-between gap-3">
                <SkeletonBlock className="h-4 w-16 rounded" />
                <SkeletonBlock className="h-4 w-24 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Smaksnotater */}
        <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <SkeletonBlock className="h-5 w-36 rounded-md" />
            <SkeletonBlock className="w-8 h-8 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="flex items-start gap-3">
                <SkeletonBlock className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <SkeletonBlock className="h-3 rounded w-1/4" />
                  <SkeletonBlock className="h-2.5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-wine-gradient text-white px-4 pt-1 pb-10">
        <SkeletonBlock className="h-4 w-16 rounded mb-4" />
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-11 w-11 rounded-xl" />
          <SkeletonBlock className="h-7 w-36 rounded-md" />
        </div>
      </div>
      <div className="flex-1 px-4 -mt-4 pb-24">
        <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-sm">
          <div className="space-y-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i}>
                <SkeletonBlock className="h-3 w-16 rounded mb-1.5" />
                <SkeletonBlock className="h-10 rounded-xl w-full" />
              </div>
            ))}
            <SkeletonBlock className="h-12 rounded-full w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="flex-1 px-4 pt-6 pb-24">
      <div className="text-center mb-8">
        <SkeletonBlock className="w-24 h-24 rounded-2xl mx-auto" />
        <SkeletonBlock className="h-7 w-32 rounded-md mx-auto mt-4" />
        <SkeletonBlock className="h-4 w-48 rounded mx-auto mt-1.5" />
      </div>
      <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-5 space-y-4">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i}>
            <SkeletonBlock className="h-3 w-12 rounded mb-1.5" />
            <SkeletonBlock className="h-10 rounded-xl w-full" />
          </div>
        ))}
        <SkeletonBlock className="h-16 rounded-2xl w-full" />
        <SkeletonBlock className="h-12 rounded-full w-full" />
      </div>
    </div>
  )
}

export function UserDialogSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="bg-cream-50 rounded-xl border border-cream-200 p-3 flex items-center gap-3">
          <SkeletonBlock className="w-9 h-9 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-1">
            <SkeletonBlock className="h-3.5 rounded w-1/3" />
            <SkeletonBlock className="h-2.5 rounded w-1/2" />
          </div>
          <SkeletonBlock className="h-5 w-14 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function HomeSkeleton() {
  return (
    <div className="flex flex-col flex-1">
      <div className="px-4 pt-4 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-7 w-28 rounded-md" />
          <SkeletonBlock className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-7 rounded-full w-24" />
          <SkeletonBlock className="h-7 rounded-full w-32" />
        </div>
        <SearchFilterSkeleton />
      </div>
      <div className="flex-1 px-4 pb-4">
        <WineCardSkeletonList count={5} />
      </div>
    </div>
  )
}

export function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <SkeletonBlock className="h-8 w-24 rounded" />
      <div className="flex items-center gap-2">
        <SkeletonBlock className="w-8 h-8 rounded-full" />
        <SkeletonBlock className="w-8 h-8 rounded-lg" />
      </div>
    </div>
  )
}
