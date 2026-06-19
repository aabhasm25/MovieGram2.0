import AppShell from "@/components/AppShell";
import MessagesScreen from "@/components/screens/MessagesScreen";

export default function MessagesPage() {
  return (
    <AppShell title="Messages" activeTab="messages">
      <MessagesScreen />
    </AppShell>
  );
}
