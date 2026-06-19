import Link from "next/link";
import Icon from "@/components/Icon";

const tabs = [
  { href: "/", id: "home", label: "Home", icon: "home" },
  { href: "/reels", id: "reels", label: "Reels", icon: "reels" },
  { href: "/log", id: "log", label: "Log", icon: "log" },
  { href: "/explore", id: "explore", label: "Explore", icon: "search" },
  { href: "/profile", id: "profile", label: "Profile", icon: "profile" }
];

export default function BottomNav({ activeTab }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={activeTab === tab.id ? "active" : ""}
          aria-current={activeTab === tab.id ? "page" : undefined}
        >
          <Icon name={tab.icon} />
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
