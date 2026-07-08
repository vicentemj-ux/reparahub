"use client"

import { useEffect } from "react"
import { trackMarketingEvent, type MarketingEventName } from "@/lib/marketing-analytics"

export function MarketingPageView({ eventName }: { eventName: MarketingEventName }) {
  useEffect(() => {
    trackMarketingEvent(eventName)
  }, [eventName])

  return null
}
