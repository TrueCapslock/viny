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
      <div className="bg-wine-gradient px-4 pt-1 pb-20">
        <SkeletonBlock className="h-4 w-16 rounded mb-4" />
        <SkeletonBlock className="h-7 w-2/3 rounded-md mb-1" />
        <SkeletonBlock className="h-5 w-1/3 rounded-md mb-4" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-6 rounded-full w-20" />
          <SkeletonBlock className="h-6 rounded-full w-24" />
          <SkeletonBlock className="h-6 rounded-full w-16" />
        </div>
        <SkeletonBlock className="h-16 rounded-2xl w-full mt-4" />
        <div className="mt-3">
          <SkeletonBlock className="h-10 rounded-xl w-full" />
        </div>
      </div>
      <div className="flex justify-center -mt-4">
        <SkeletonBlock className="h-10 rounded-2xl w-72" />
      </div>
      <div className="flex-1 px-4 mt-14 pb-24">
        <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <SkeletonBlock className="h-5 w-32 rounded" />
            <SkeletonBlock className="h-8 w-8 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
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
