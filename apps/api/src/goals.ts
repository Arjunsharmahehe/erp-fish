import { SPACE, type JobInput } from "shared";

export interface QaPair {
  question: string;
  answer: string;
}

const GOAL_ON = "On" as const;
const GOAL_PURCHASE_ORDER_PATH = "/app/purchase-order" as const;
const GOAL_SALES_ORDER_PATH = "/app/sales-order" as const;
const GOAL_STOCK_ENTRY_PATH = "/app/stock-entry" as const;
const GOAL_SEARCH_PO = "Search existing Purchase Order by" as const;
const GOAL_SEARCH_SO = "Search existing Sales Order by" as const;
const GOAL_SEARCH_STOCK = "Search existing Stock Entry by" as const;
export const GOAL_IF_FOUND = "If found, return its ID and do not create." as const;
const GOAL_ELSE_CREATE_PO = "Else create Purchase Order for supplier" as const;
const GOAL_ELSE_CREATE_SO = "Else create Sales Order with items" as const;
const GOAL_ELSE_CREATE_STOCK = "Else create Stock Entry material transfer with items" as const;
const GOAL_WITH_ITEMS = "with items" as const;
const GOAL_FOLLOWING_INSTRUCTION = "following instruction" as const;
const GOAL_BASED_ON_PO = "based on purchase order" as const;
const GOAL_BASED_ON_SO = "and sales order" as const;
const GOAL_DROPDOWNS =
  "Wait explicitly for slow dynamic dropdown options; retry up to 3 times." as const;
const GOAL_RETURN_PO = "Return JSON {purchase_order_id}." as const;
const GOAL_RETURN_SO = "Return JSON {sales_order_id}." as const;
const GOAL_RETURN_STOCK = "Return JSON {stock_entry_id}." as const;
const GOAL_LEARNED_PREFIX = "Learned answers:" as const;
const GOAL_QA_Q = "Q:" as const;
const GOAL_QA_A = "A:" as const;
const INVOICE_NO_KEY = "invoice_no" as const;
const SUPPLIER_KEY = "supplier" as const;
const NEWLINE = "\n" as const;
const EQUALS = "=" as const;
const PLUS = "+" as const;
export const EMPTY_LEARNED = "" as const;

export function formatQa(question: string, answer: string): string {
  return [GOAL_QA_Q, question, GOAL_QA_A, answer].join(SPACE);
}

export function withQa(goal: string, qa: QaPair | undefined): string {
  if (qa === undefined) {
    return goal;
  }
  return [goal, formatQa(qa.question, qa.answer)].join(NEWLINE);
}

function buildWhere(input: JobInput): string {
  return [
    INVOICE_NO_KEY,
    EQUALS,
    input.invoice_json.invoice_no,
    PLUS,
    SUPPLIER_KEY,
    EQUALS,
    input.invoice_json.supplier,
  ].join(SPACE);
}

interface GoalArgs {
  path: string;
  search: string;
  create: string;
  middle: string[];
  returnClause: string;
}

function buildGoal(request: { input: JobInput; learned: string; args: GoalArgs }): string {
  const body: string[] = [
    GOAL_ON,
    `${request.input.erp_host}${request.args.path}`,
    request.args.search,
    buildWhere(request.input),
    GOAL_IF_FOUND,
    request.args.create,
    ...request.args.middle,
    GOAL_FOLLOWING_INSTRUCTION,
    request.input.instruction,
    GOAL_DROPDOWNS,
    request.args.returnClause,
  ];
  if (request.learned === EMPTY_LEARNED) {
    return body.join(SPACE);
  }
  return [GOAL_LEARNED_PREFIX, request.learned, ...body].join(SPACE);
}

export function buildPoGoal(input: JobInput, learned: string): string {
  return buildGoal({
    input,
    learned,
    args: {
      path: GOAL_PURCHASE_ORDER_PATH,
      search: GOAL_SEARCH_PO,
      create: GOAL_ELSE_CREATE_PO,
      middle: [input.invoice_json.supplier, GOAL_WITH_ITEMS, JSON.stringify(input.invoice_json.items)],
      returnClause: GOAL_RETURN_PO,
    },
  });
}

export function buildSoGoal(request: {
  input: JobInput;
  learned: string;
  purchaseOrderId: string;
}): string {
  return buildGoal({
    input: request.input,
    learned: request.learned,
    args: {
      path: GOAL_SALES_ORDER_PATH,
      search: GOAL_SEARCH_SO,
      create: GOAL_ELSE_CREATE_SO,
      middle: [
        JSON.stringify(request.input.invoice_json.items),
        GOAL_BASED_ON_PO,
        request.purchaseOrderId,
      ],
      returnClause: GOAL_RETURN_SO,
    },
  });
}

export function buildStockGoal(request: {
  input: JobInput;
  learned: string;
  purchaseOrderId: string;
  salesOrderId: string;
}): string {
  return buildGoal({
    input: request.input,
    learned: request.learned,
    args: {
      path: GOAL_STOCK_ENTRY_PATH,
      search: GOAL_SEARCH_STOCK,
      create: GOAL_ELSE_CREATE_STOCK,
      middle: [
        JSON.stringify(request.input.invoice_json.items),
        GOAL_BASED_ON_PO,
        request.purchaseOrderId,
        GOAL_BASED_ON_SO,
        request.salesOrderId,
      ],
      returnClause: GOAL_RETURN_STOCK,
    },
  });
}
