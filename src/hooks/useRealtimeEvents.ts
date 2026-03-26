"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeEvent } from "@/features/realtime/schemas";

type Transport = "sse" | "poll" | "none";

const MAX_EVENTS = 50;
const POLL_INTERVAL_MS = 5_000;
const RECONNECT_DELAYS = [1_000, 2_000, 4_000, 8_000, 16_000];

function detectTransport(): Transport {
  if (typeof window === "undefined") return "none";
  const env = process.env.NEXT_PUBLIC_REALTIME_TRANSPORT;
  if (env === "sse") return "sse";
  if (env === "poll") return "poll";
  // Auto-detect: use polling on Vercel (NEXT_PUBLIC_ vars are inlined at build time)
  if (process.env.NEXT_PUBLIC_VERCEL === "1") return "poll";
  return "sse";
}

interface UseRealtimeEventsOptions {
  onEvent?: (event: RealtimeEvent) => void;
  enabled?: boolean;
}

interface UseRealtimeEventsReturn {
  events: RealtimeEvent[];
  connected: boolean;
  transport: Transport;
}

export function useRealtimeEvents(options: UseRealtimeEventsOptions = {}): UseRealtimeEventsReturn {
  const { onEvent, enabled = true } = options;
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const transport = detectTransport();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const addEvent = useCallback((event: RealtimeEvent) => {
    setEvents((prev) => {
      const next = [...prev, event];
      return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next;
    });
    onEventRef.current?.(event);
  }, []);

  // SSE transport
  useEffect(() => {
    if (!enabled || transport !== "sse") return;

    let retryCount = 0;
    let es: EventSource | null = null;
    let disposed = false;

    function connect() {
      if (disposed) return;
      es = new EventSource("/api/realtime/sse");

      es.onopen = () => {
        setConnected(true);
        retryCount = 0;
      };

      es.addEventListener("mutation", (e: MessageEvent) => {
        try {
          const event: RealtimeEvent = JSON.parse(e.data);
          addEvent(event);
        } catch {
          // Ignore malformed events
        }
      });

      es.addEventListener("notification", (e: MessageEvent) => {
        try {
          const event: RealtimeEvent = JSON.parse(e.data);
          addEvent(event);
        } catch {
          // Ignore malformed events
        }
      });

      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (disposed) return;
        const delay = RECONNECT_DELAYS[Math.min(retryCount, RECONNECT_DELAYS.length - 1)];
        retryCount++;
        setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      disposed = true;
      es?.close();
      setConnected(false);
    };
  }, [enabled, transport, addEvent]);

  // Polling transport
  useEffect(() => {
    if (!enabled || transport !== "poll") return;

    let disposed = false;
    let cursor = Date.now();

    async function poll() {
      try {
        const res = await fetch(`/api/realtime/poll?after=${cursor}`);
        if (!res.ok) {
          setConnected(false);
          return;
        }
        const data = await res.json();
        setConnected(true);
        if (data.events?.length > 0) {
          for (const event of data.events) {
            addEvent(event);
          }
          cursor = data.cursor;
        }
      } catch {
        setConnected(false);
      }
    }

    // Initial poll
    poll();
    const interval = setInterval(() => {
      if (!disposed) poll();
    }, POLL_INTERVAL_MS);

    return () => {
      disposed = true;
      clearInterval(interval);
      setConnected(false);
    };
  }, [enabled, transport, addEvent]);

  return { events, connected, transport };
}
