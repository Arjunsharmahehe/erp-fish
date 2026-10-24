export const EVENT_STARTED = "started" as const;
export const EVENT_PO_COMPLETED = "po_completed" as const;
export const EVENT_PO_REUSED = "po_reused" as const;
export const EVENT_SO_COMPLETED = "so_completed" as const;
export const EVENT_SO_REUSED = "so_reused" as const;
export const EVENT_STOCK_COMPLETED = "stock_completed" as const;
export const EVENT_STOCK_REUSED = "stock_reused" as const;
export const EVENT_WAITING = "waiting" as const;
export const EVENT_MEMORY_HIT = "memory_hit" as const;
export const EVENT_COMPLETED = "completed" as const;
export const EVENT_FAILED = "failed" as const;

export type JobEventType =
  | typeof EVENT_STARTED
  | typeof EVENT_PO_COMPLETED
  | typeof EVENT_PO_REUSED
  | typeof EVENT_SO_COMPLETED
  | typeof EVENT_SO_REUSED
  | typeof EVENT_STOCK_COMPLETED
  | typeof EVENT_STOCK_REUSED
  | typeof EVENT_WAITING
  | typeof EVENT_MEMORY_HIT
  | typeof EVENT_COMPLETED
  | typeof EVENT_FAILED;

export interface JobEvent {
  type: JobEventType;
  jobId: string;
  taskId?: string;
  orderId?: string;
  reason?: string;
  at: string;
}

export type EmitFn = (event: Omit<JobEvent, "at">) => void;
