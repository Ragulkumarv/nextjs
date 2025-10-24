export const dynamic = "force-dynamic";

import LatestInvoices from "@/app/ui/dashboard/latest-invoices";
import { Suspense } from "react";
import { LatestInvoicesSkeleton } from "@/app/ui/skeletons";

export default async function Page() {
  return (
    <main>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
        <Suspense fallback={<LatestInvoicesSkeleton />}>
          <LatestInvoices />
        </Suspense>
      </div>
    </main>
  );
}
