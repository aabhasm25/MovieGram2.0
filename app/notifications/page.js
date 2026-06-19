import AppShell from "@/components/AppShell";
import NotificationsScreen from "@/components/screens/NotificationsScreen";

export default function NotificationsPage() {
  return (
    <AppShell title="Notifications" activeTab="notifications">
      <NotificationsScreen />
    </AppShell>
  );
}
