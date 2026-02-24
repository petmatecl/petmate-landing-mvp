import React from 'react';
import { Skeleton } from '../Shared/Skeleton';

export default function ServiceSkeleton() {
    return (
        <div className="bg-white p-4 rounded-3xl border border-slate-100 flex flex-col h-full shadow-sm animate-pulse">
            {/* Image Skeleton */}
            <Skeleton className="w-full aspect-[4/3] rounded-2xl mb-4" />

            {/* Title & Rating Skeleton */}
            <div className="flex justify-between items-start mb-4">
                <div className="space-y-2 w-2/3">
                    <Skeleton className="h-5 w-full rounded-md" />
                    <Skeleton className="h-5 w-4/5 rounded-md" />
                </div>
                <Skeleton className="h-8 w-16 rounded-xl" />
            </div>

            {/* Provider Skeleton */}
            <div className="flex items-center gap-2 mb-6">
                <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>

            {/* Price Footer Skeleton */}
            <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-end">
                <div className="space-y-1">
                    <Skeleton className="h-3 w-16 rounded-sm" />
                    <Skeleton className="h-6 w-24 rounded-md" />
                </div>
            </div>
        </div>
    );
}
