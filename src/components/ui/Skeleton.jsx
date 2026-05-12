import { cn } from '../../lib/utils';

// Single shimmering block. Compose into rows/cards.
//
//   <Skeleton className="h-4 w-32" />
//   <Skeleton className="h-10 w-full rounded-xl" />
export function Skeleton({ className }) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-md bg-muted/50',
                'before:absolute before:inset-0',
                'before:-translate-x-full',
                'before:animate-[shimmer_1.6s_infinite]',
                'before:bg-gradient-to-r before:from-transparent before:via-white/8 before:to-transparent',
                className
            )}
        />
    );
}

// Convenience wrappers
export function SkeletonText({ className, lines = 1 }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full', className)} />
            ))}
        </div>
    );
}

export function SkeletonCard({ className }) {
    return (
        <div className={cn('bg-card border border-border rounded-2xl p-5 space-y-4', className)}>
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
        </div>
    );
}

// Use for table-like list rows
export function SkeletonRow({ cols = 4 }) {
    return (
        <div className="flex items-center gap-4 py-3">
            {Array.from({ length: cols }).map((_, i) => (
                <Skeleton key={i} className={cn('h-4', i === 0 ? 'w-1/3' : 'flex-1')} />
            ))}
        </div>
    );
}
