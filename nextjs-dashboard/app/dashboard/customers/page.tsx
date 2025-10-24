export const dynamic = "force-dynamic";

import RevenueChart from "@/app/ui/dashboard/revenue-chart";
import { Suspense } from "react";
import { RevenueChartSkeleton } from "@/app/ui/skeletons";

export default async function Page() {
  return (
    <main>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
        <Suspense fallback={<RevenueChartSkeleton />}>
          <RevenueChart />
        </Suspense>
      </div>
    </main>
  );
}
