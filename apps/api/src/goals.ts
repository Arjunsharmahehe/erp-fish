import { SPACE, type JobInput } from "shared";
import type { SiteProfile } from "./site";

export interface QaPair {
  question: string;
  answer: string;
}

const GOAL_ON = "On" as const;
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
const EMPTY_HINTS = "" as const;

// Basics preamble: every run starts from its module entry page, so the goal
// text teaches the ERP interaction pattern once instead of per step. Site
// differences (URLs, credentials) arrive via SiteProfile, never here.
const GUIDANCE_ROLE =
  "You are operating a live ERP web app in a real browser tab." as const;
const GUIDANCE_LOGIN =
  "If a login page appears, sign in and continue; otherwise keep working in the current session." as const;
const GUIDANCE_SCOPE =
  "Do all work in the module page you were given. Never create suppliers, items, or warehouses: masters already exist." as const;
const GUIDANCE_BLOCKED =
  'If a required master is missing or the page blocks you, return {"question": "…"} JSON asking what to use instead of guessing.' as const;
const GUIDANCE_EXACT =
  "Use exact quantities, rates, and references from the task. Never round, convert, or invent document IDs." as const;
const GUIDANCE_FINISH = "Finish with ONLY the required JSON result object." as const;

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
  entryUrl: string;
  search: string;
  create: string;
  middle: string[];
  returnClause: string;
}

function buildGoal(request: {
  input: JobInput;
  learned: string;
  site: SiteProfile;
  args: GoalArgs;
}): string {
  const body: string[] = [
    GOAL_ON,
    request.args.entryUrl,
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
  const sections: string[] = [
    [
      GUIDANCE_ROLE,
      GUIDANCE_LOGIN,
      GUIDANCE_SCOPE,
      GUIDANCE_BLOCKED,
      GUIDANCE_EXACT,
      GUIDANCE_FINISH,
    ].join(SPACE),
  ];
  if (request.site.hints !== EMPTY_HINTS) {
    sections.push(request.site.hints);
  }
  if (request.learned === EMPTY_LEARNED) {
    return [...sections, ...body].join(SPACE);
  }
  return [GOAL_LEARNED_PREFIX, request.learned, ...sections, ...body].join(SPACE);
}

export function buildPoGoal(request: {
  input: JobInput;
  learned: string;
  site: SiteProfile;
}): string {
  return buildGoal({
    input: request.input,
    learned: request.learned,
    site: request.site,
    args: {
      entryUrl: request.site.poUrl,
      search: GOAL_SEARCH_PO,
      create: GOAL_ELSE_CREATE_PO,
      middle: [
        request.input.invoice_json.supplier,
        GOAL_WITH_ITEMS,
        JSON.stringify(request.input.invoice_json.items),
      ],
      returnClause: GOAL_RETURN_PO,
    },
  });
}

export function buildSoGoal(request: {
  input: JobInput;
  learned: string;
  site: SiteProfile;
  purchaseOrderId: string;
}): string {
  return buildGoal({
    input: request.input,
    learned: request.learned,
    site: request.site,
    args: {
      entryUrl: request.site.soUrl,
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
  site: SiteProfile;
  purchaseOrderId: string;
  salesOrderId: string;
}): string {
  return buildGoal({
    input: request.input,
    learned: request.learned,
    site: request.site,
    args: {
      entryUrl: request.site.stockUrl,
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
