import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, usePathname, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useGetSettings } from "@odyssey/api-client";
import { serviceStatus } from "@odyssey/types";
import { AppShell, ToastProvider, color, type NavItem } from "@odyssey/ui";

/**
 * The five surfaces. Only Home is still to come; listing it here rather than
 * hiding it keeps the shell's shape honest about what the product is.
 */
const NAV: NavItem[] = [
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

  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });

  // Holding the frame until the face is ready avoids the reflow that a swap
  // from the system font to Inter would cause on every text node at once.
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
 * The shell, inside the QueryClientProvider so the service pill can read the
 * settings it derives from. Split out rather than inlined because a hook cannot
 * run above the provider that serves it.
 */
function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const query = useGetSettings();
  const settings = query.data?.status === 200 ? query.data.data : undefined;

  /**
   * Derived, never stored — and derived through the same util the Worker uses,
   * so the pill and the backend cannot disagree about whether the door is open.
   */
  const status = settings ? serviceStatus(settings, new Date()) : undefined;

  const label = !status
    ? "Service"
    : status.reason === "not_accepting"
      ? "Not accepting orders"
      : status.isOpen
        ? `Open · ${settings!.prepTimeMinutes} min`
        : "Closed";

  return (
    <AppShell
      items={NAV}
      activeHref={pathname}
      onNavigate={(href) => router.push(href as "/orders")}
      serviceLabel={label}
      serviceOpen={status?.isOpen ?? false}
    >
      {children}
    </AppShell>
  );
}
