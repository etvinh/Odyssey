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
import { AppShell, ToastProvider, color, type NavItem } from "@odyssey/ui";

/**
 * The five surfaces. Menu and Orders are built; the rest arrive with their
 * backends, and listing them here rather than hiding them keeps the shell's
 * shape honest about what the product is.
 */
const NAV: NavItem[] = [
  { href: "/orders", label: "Orders", icon: "clipboard" },
  { href: "/menu", label: "Menu", icon: "book" },
  { href: "/ui-library", label: "UI library", icon: "layers" },
];

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }),
  );
  const router = useRouter();
  const pathname = usePathname();

  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });

  // Holding the frame until the face is ready avoids the reflow that a swap
  // from the system font to Inter would cause on every text node at once.
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: color.surface }} />;

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppShell
          items={NAV}
          activeHref={pathname}
          onNavigate={(href) => router.push(href as "/orders")}
          serviceLabel="Open · 20 min"
          serviceOpen
        >
          <Slot />
        </AppShell>
      </ToastProvider>
    </QueryClientProvider>
  );
}
