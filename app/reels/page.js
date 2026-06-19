import AppShell from "@/components/AppShell";
import ReelsScreen from "@/components/screens/ReelsScreen";

export default function ReelsPage() {
  return (
    <AppShell title="Reels" activeTab="reels">
      <ReelsScreen />
    </AppShell>
  );
}
