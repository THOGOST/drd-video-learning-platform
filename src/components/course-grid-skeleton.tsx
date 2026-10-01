"use client";

// هيكل تحميل رمادي متحرك لكروت الكورسات (Skeleton Loaders)
// يعطي إحساس فخامة بدل اللودر الدائري — بنفس تخطيط CourseCard تمامًا.

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export function CourseCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: "easeOut" }}
      className="rounded-xl border bg-card overflow-hidden"
      aria-hidden="true"
    >
      <Skeleton className="aspect-video rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-1.5 flex-1" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </motion.div>
  );
}

export function CourseGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}
