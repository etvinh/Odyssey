import { useFonts } from "expo-font";
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from "@expo-google-fonts/ibm-plex-sans";
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGetSettings } from "@odyssey/api-client";
import { serviceStatus } from "@odyssey/shared";
import { Slot, usePathname, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AppShell, ToastProvider, color, type NavItem } from "@odyssey/ui";

/** The five surfaces of the product, in the order a manager works through them. */
const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/orders", label: "Orders", icon: "clipboard" },
  { href: "/menu", label: "Menu", icon: "book" },
  { href: "/crm", label: "Customers", icon: "users" },
  { href: "/settings", label: "Settings", icon: "sliders" },
  { href: "/ui-library", label: "UI library", icon: "layers" },
];

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }),
  );

  const [fontsLoaded] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  // Holding the frame until the faces are ready avoids the reflow that a swap
  // from the system font would cause on every text node at once.
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: color.surface }} />;

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Shell>
          <Slot />
        </Shell>
      </ToastProvider>
    </QueryClientProvider>
  );
}

/**
 * Split out so the router and query hooks run inside the providers above — a
 * hook cannot read a provider it is rendered beside.
 */
function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const query = useGetSettings();
  const settings = query.data?.status === 200 ? query.data.data : undefined;

  /**
   * Derived, never stored — and through the same util the Worker uses, so the
   * sidebar and the backend cannot disagree about whether the door is open.
   */
  const status = settings ? serviceStatus(settings, new Date()) : undefined;

  /** The pill holds one word; the reason goes on the line beneath it. */
  const label = !status ? "Checking…" : status.isOpen ? "Open" : "Closed";

  const detail = !status
    ? undefined
    : status.reason === "not_accepting"
      ? "Not accepting orders"
      : status.isOpen
        ? `${settings!.prepTimeMinutes} min prep time`
        : "Outside opening hours";

  return (
    <AppShell
      items={NAV}
      activeHref={pathname}
      onNavigate={(href) => router.push(href as "/orders")}
      serviceLabel={label}
      serviceDetail={detail}
      serviceOpen={status?.isOpen ?? false}
    >
      {children}
    </AppShell>
  );
}
