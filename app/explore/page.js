import AppShell from "@/components/AppShell";
import ExploreScreen from "@/components/screens/ExploreScreen";

export default function ExplorePage() {
  return (
    <AppShell title="Explore" activeTab="explore">
      <ExploreScreen />
    </AppShell>
  );
}
