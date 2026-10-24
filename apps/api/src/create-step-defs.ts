import {
  TASK_KIND_PO,
  TASK_KIND_SO,
  TASK_KIND_STOCK,
  type AgentResultIds,
  type JobInput,
} from "shared";
import {
  EVENT_PO_COMPLETED,
  EVENT_PO_REUSED,
  EVENT_SO_COMPLETED,
  EVENT_SO_REUSED,
  EVENT_STOCK_COMPLETED,
  EVENT_STOCK_REUSED,
} from "./events";
import { buildPoGoal, buildSoGoal, buildStockGoal, withQa } from "./goals";
import { mustId } from "./queries";
import type { AgentPort, StepDef } from "./types";

interface StepDefRequest {
  agent: AgentPort;
  parsed: JobInput;
  learned: string;
  collected: AgentResultIds;
}

function poStepDef(request: StepDefRequest): StepDef {
  return {
    kind: TASK_KIND_PO,
    completedEvent: EVENT_PO_COMPLETED,
    reusedEvent: EVENT_PO_REUSED,
    run: (qa) =>
      request.agent.runPurchaseOrder({
        goal: withQa(buildPoGoal(request.parsed, request.learned), qa),
      }),
  };
}

function soStepDef(request: StepDefRequest): StepDef {
  return {
    kind: TASK_KIND_SO,
    completedEvent: EVENT_SO_COMPLETED,
    reusedEvent: EVENT_SO_REUSED,
    run: (qa) =>
      request.agent.runSalesOrder({
        goal: withQa(
          buildSoGoal({
            input: request.parsed,
            learned: request.learned,
            purchaseOrderId: mustId(request.collected.purchase_order_id),
          }),
          qa,
        ),
        purchaseOrderId: mustId(request.collected.purchase_order_id),
      }),
  };
}

function stockStepDef(request: StepDefRequest): StepDef {
  return {
    kind: TASK_KIND_STOCK,
    completedEvent: EVENT_STOCK_COMPLETED,
    reusedEvent: EVENT_STOCK_REUSED,
    run: (qa) =>
      request.agent.runStockEntry({
        goal: withQa(
          buildStockGoal({
            input: request.parsed,
            learned: request.learned,
            purchaseOrderId: mustId(request.collected.purchase_order_id),
            salesOrderId: mustId(request.collected.sales_order_id),
          }),
          qa,
        ),
        purchaseOrderId: mustId(request.collected.purchase_order_id),
        salesOrderId: mustId(request.collected.sales_order_id),
      }),
  };
}

export function createStepDefs(request: StepDefRequest): StepDef[] {
  return [poStepDef(request), soStepDef(request), stockStepDef(request)];
}
