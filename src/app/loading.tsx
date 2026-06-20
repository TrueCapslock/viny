import { SearchFilterSkeleton, WineCardSkeletonList } from "@/app/_components/skeletons"

export default function HomeLoading() {
  return (
    <div className="flex flex-col flex-1">
      <div className="px-4 pt-4 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-7 w-28 bg-cream-200 animate-pulse rounded-md" />
          <div className="h-5 w-16 bg-cream-200 animate-pulse rounded-full" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-28 bg-cream-200 animate-pulse rounded-full" />
          <div className="h-7 w-36 bg-cream-200 animate-pulse rounded-full" />
        </div>
        <SearchFilterSkeleton />
      </div>
      <div className="flex-1 px-4 pb-4">
        <WineCardSkeletonList count={5} />
      </div>
    </div>
  )
}
