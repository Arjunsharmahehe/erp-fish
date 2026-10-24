import type { JobEvent, JobEventType } from "../src/orchestrator";

export function eventTypes(events: JobEvent[]): JobEventType[] {
  return events.map((event) => event.type);
}
