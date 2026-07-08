"use client"

import Link from "next/link"
import { forwardRef, type ComponentProps } from "react"
import {
  trackMarketingEvent,
  type MarketingEventName,
  type MarketingPropertyValue,
} from "@/lib/marketing-analytics"

type TrackedLinkProps = ComponentProps<typeof Link> & {
  eventName: MarketingEventName
  eventProperties?: Record<string, MarketingPropertyValue>
}

export const TrackedLink = forwardRef<HTMLAnchorElement, TrackedLinkProps>(
  function TrackedLink({ eventName, eventProperties, onClick, ...props }, ref) {
    return (
      <Link
        {...props}
        ref={ref}
        onClick={(event) => {
          trackMarketingEvent(eventName, eventProperties)
          onClick?.(event)
        }}
      />
    )
  },
)
