"use client";

import { createContext, useContext, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useSnackbar } from "@/components/shared/SnackbarProvider";
import { useRealtimeEvents } from "@/hooks/useRealtimeEvents";
import type { RealtimeEvent } from "@/features/realtime/schemas";

interface RealtimeContextValue {
  events: RealtimeEvent[];
  connected: boolean;
  transport: "sse" | "poll" | "none";
}

const RealtimeContext = createContext<RealtimeContextValue>({
  events: [],
  connected: false,
  transport: "none",
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

export default function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { showSnackbar } = useSnackbar();
  const userEmail = session?.user?.email ?? null;

  const { events, connected, transport } = useRealtimeEvents({
    enabled: !!session?.user,
    onEvent: (event: RealtimeEvent) => {
      // Skip self-notifications — only show events from other users
      if (event.actorEmail && event.actorEmail === userEmail) return;
      showSnackbar(event.summary, "info");
    },
  });

  const contextValue = useMemo(
    () => ({ events, connected, transport }),
    [events, connected, transport],
  );

  return <RealtimeContext.Provider value={contextValue}>{children}</RealtimeContext.Provider>;
}
