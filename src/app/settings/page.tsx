import { Settings } from "@/components/Settings";
import { loadAppData } from "@/lib/data";

export default async function SettingsPage() {
  const data = await loadAppData();
  return <Settings data={data} />;
}
