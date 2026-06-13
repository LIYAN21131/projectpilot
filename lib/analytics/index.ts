import type { AnalyticsEvent, AnalyticsEventName } from "@/types/analytics";

const ANALYTICS_KEY = "projectpilot.analytics";

export function trackEvent(
  name: AnalyticsEventName,
  properties?: AnalyticsEvent["properties"],
) {
  if (typeof window === "undefined") return;

  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: new Date().toISOString(),
  };

  const raw = window.localStorage.getItem(ANALYTICS_KEY);
  const events: AnalyticsEvent[] = raw ? JSON.parse(raw) : [];
  window.localStorage.setItem(ANALYTICS_KEY, JSON.stringify([event, ...events]));
}
