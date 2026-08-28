import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";
import { loadAppData } from "@/lib/data";

export default async function Home() {
  const data = await loadAppData();
  return (
    <Suspense>
      <Dashboard data={data} />
    </Suspense>
  );
}
