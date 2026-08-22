import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, View } from "react-native";
import { Icon } from "./Icon";
import { Text } from "./Text";
import { color, radius, shadow, space, motion, borderWidth } from "./tokens";

type Toast = { id: number; message: string; tone: "success" | "error" };

const ToastContext = createContext<(message: string, tone?: "success" | "error") => void>(() => {});

/** `const toast = useToast(); toast("Order #1043 created")`. */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, tone: "success" | "error" = "success") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4000);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", right: space[6], bottom: space[6], gap: space[2] }}
      >
        {toasts.map((toast) => (
          <ToastRow key={toast.id} toast={toast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast }: { toast: Toast }) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: motion.durationSlow,
      useNativeDriver: true,
    }).start();
  }, [enter]);

  const success = toast.tone === "success";

  return (
    <Animated.View
      // Announced rather than only shown: a toast nobody hears is a toast that
      // did not happen for anyone using a screen reader.
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        flexDirection: "row",
        alignItems: "center",
        gap: space[2],
        maxWidth: 380,
        paddingHorizontal: space[3],
        paddingVertical: space[2],
        backgroundColor: color.surfaceRaised,
        borderRadius: radius.md,
        borderWidth: borderWidth.hairline,
        borderColor: color.border,
        ...shadow.overlay,
      }}
    >
      <Icon
        name={success ? "check" : "alert"}
        size={15}
        color={success ? color.successForeground : color.dangerForeground}
      />
      <Text variant="body" style={{ flex: 1 }}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}
