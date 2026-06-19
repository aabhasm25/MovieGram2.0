import AppShell from "@/components/AppShell";
import LogScreen from "@/components/screens/LogScreen";

export default function LogPage() {
  return (
    <AppShell title="Log" activeTab="log">
      <LogScreen />
    </AppShell>
  );
}
