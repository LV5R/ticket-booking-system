export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-4">
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex justify-between items-center mt-6">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}
