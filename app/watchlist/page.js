import AppShell from "@/components/AppShell";
import WatchlistScreen from "@/components/screens/WatchlistScreen";

export default function WatchlistPage() {
  return (
    <AppShell title="Watchlist" activeTab="profile">
      <WatchlistScreen />
    </AppShell>
  );
}
