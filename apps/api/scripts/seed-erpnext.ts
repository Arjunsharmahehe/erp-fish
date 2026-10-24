import { createEnv } from "@t3-oss/env-core";
import pino from "pino";
import * as z from "zod";
import {
  DEMO_COMPANY_ABBR,
  DEMO_COMPANY_NAME,
  DEMO_CUSTOMER,
  DEMO_ITEM_1,
  DEMO_ITEM_2,
  DEMO_SUPPLIER,
  DEMO_WAREHOUSE,
  MIN_TEXT_LENGTH,
  SPACE,
  CONTENT_TYPE_HEADER,
} from "shared";

const DEFAULT_ADMIN_USER = "Administrator" as const;
const DEFAULT_CURRENCY = "INR" as const;
const DEFAULT_COUNTRY = "India" as const;
const DEFAULT_SUPPLIER_TYPE = "Company" as const;
const DEFAULT_CUSTOMER_TYPE = "Company" as const;
const DEFAULT_CUSTOMER_GROUP = "All Customer Groups" as const;
const DEFAULT_ITEM_GROUP = "All Item Groups" as const;
const DEFAULT_STOCK_UOM = "Nos" as const;
const IS_STOCK_ITEM = 1 as const;
const LOGIN_PATH = "/api/method/login" as const;
const RESOURCE_PATH = "/api/resource" as const;
const FILTER_EQUALS = "=" as const;
const NAME_FIELD = "name" as const;
const JSON_MIME = "application/json" as const;
const COOKIE_HEADER = "Cookie" as const;
const SET_COOKIE_SID_MARKER = "sid=" as const;
const LOGGER_LEVEL = "info" as const;
const METHOD_POST = "POST" as const;
const SEED_LOG_MESSAGE = "seed_ensure" as const;
const SEED_DONE_MESSAGE = "seed_done" as const;
const SEED_LOGIN_FAILED_MESSAGE = "seed_login_failed" as const;

const DOCTYPE_SUPPLIER = "Supplier" as const;
const DOCTYPE_CUSTOMER = "Customer" as const;
const DOCTYPE_ITEM = "Item" as const;
const DOCTYPE_WAREHOUSE = "Warehouse" as const;
const DOCTYPE_COMPANY = "Company" as const;

const FIELD_SUPPLIER_NAME = "supplier_name" as const;
const FIELD_SUPPLIER_TYPE = "supplier_type" as const;
const FIELD_CUSTOMER_NAME = "customer_name" as const;
const FIELD_CUSTOMER_TYPE = "customer_type" as const;
const FIELD_CUSTOMER_GROUP = "customer_group" as const;
const FIELD_ITEM_CODE = "item_code" as const;
const FIELD_ITEM_NAME = "item_name" as const;
const FIELD_ITEM_GROUP = "item_group" as const;
const FIELD_STOCK_UOM = "stock_uom" as const;
const FIELD_IS_STOCK_ITEM = "is_stock_item" as const;
const FIELD_WAREHOUSE_NAME = "warehouse_name" as const;
const FIELD_COMPANY = "company" as const;
const FIELD_COMPANY_NAME = "company_name" as const;
const FIELD_ABBR = "abbr" as const;
const FIELD_DEFAULT_CURRENCY = "default_currency" as const;
const FIELD_COUNTRY = "country" as const;
const FIELD_USR = "usr" as const;
const FIELD_PWD = "pwd" as const;

const env = createEnv({
  server: {
    SEED_ERP_BASE_URL: z.string().min(MIN_TEXT_LENGTH),
    SEED_ADMIN_USER: z.string().min(MIN_TEXT_LENGTH).default(DEFAULT_ADMIN_USER),
    SEED_ADMIN_PASSWORD: z.string().min(MIN_TEXT_LENGTH),
  },
  runtimeEnv: process.env,
});

const logger = pino({ level: LOGGER_LEVEL });

class SeedHttpError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(status: number, path: string) {
    super([status, path].join(SPACE));
    this.status = status;
    this.path = path;
  }
}

const FrappeListResponseSchema = z.object({
  data: z.array(z.object({ [NAME_FIELD]: z.string() })),
});

const FrappeDocResponseSchema = z.object({
  data: z.object({ [NAME_FIELD]: z.string() }).passthrough(),
});

async function apiFetch(path: string, sid: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = { [COOKIE_HEADER]: sid };
  if (init?.headers !== undefined) {
    Object.assign(headers, init.headers);
  }
  const res: Response = await fetch(`${env.SEED_ERP_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    throw new SeedHttpError(res.status, path);
  }
  return res;
}

async function login(): Promise<string> {
  const res: Response = await fetch(`${env.SEED_ERP_BASE_URL}${LOGIN_PATH}`, {
    method: METHOD_POST,
    headers: { [CONTENT_TYPE_HEADER]: JSON_MIME },
    body: JSON.stringify({ [FIELD_USR]: env.SEED_ADMIN_USER, [FIELD_PWD]: env.SEED_ADMIN_PASSWORD }),
  });
  if (!res.ok) {
    throw new SeedHttpError(res.status, LOGIN_PATH);
  }
  const cookies: string[] = res.headers.getSetCookie();
  const sid: string | undefined = cookies.find((cookie) => cookie.includes(SET_COOKIE_SID_MARKER));
  if (sid === undefined) {
    throw new Error(SEED_LOGIN_FAILED_MESSAGE);
  }
  return sid;
}

async function ensureDoc(
  sid: string,
  doctype: string,
  keyField: string,
  keyValue: string,
  payload: Record<string, string | number>,
): Promise<string> {
  const filters: string = encodeURIComponent(
    JSON.stringify([[[keyField, FILTER_EQUALS, keyValue]]]),
  );
  const fields: string = encodeURIComponent(JSON.stringify([NAME_FIELD]));
  const found: Response = await apiFetch(
    `${RESOURCE_PATH}/${doctype}?filters=${filters}&fields=${fields}`,
    sid,
  );
  const listed = FrappeListResponseSchema.parse(await found.json());
  const existing = listed.data[0];
  if (existing !== undefined) {
    logger.info({ doctype, name: existing.name }, SEED_LOG_MESSAGE);
    return existing.name;
  }
  const created: Response = await apiFetch(`${RESOURCE_PATH}/${doctype}`, sid, {
    method: METHOD_POST,
    headers: { [CONTENT_TYPE_HEADER]: JSON_MIME },
    body: JSON.stringify(payload),
  });
  const doc = FrappeDocResponseSchema.parse(await created.json());
  logger.info({ doctype, name: doc.data.name }, SEED_LOG_MESSAGE);
  return doc.data.name;
}

const sid: string = await login();
const companyName: string = await ensureDoc(sid, DOCTYPE_COMPANY, FIELD_COMPANY_NAME, DEMO_COMPANY_NAME, {
  [FIELD_COMPANY_NAME]: DEMO_COMPANY_NAME,
  [FIELD_ABBR]: DEMO_COMPANY_ABBR,
  [FIELD_DEFAULT_CURRENCY]: DEFAULT_CURRENCY,
  [FIELD_COUNTRY]: DEFAULT_COUNTRY,
});
await ensureDoc(sid, DOCTYPE_SUPPLIER, FIELD_SUPPLIER_NAME, DEMO_SUPPLIER, {
  [FIELD_SUPPLIER_NAME]: DEMO_SUPPLIER,
  [FIELD_SUPPLIER_TYPE]: DEFAULT_SUPPLIER_TYPE,
});
await ensureDoc(sid, DOCTYPE_CUSTOMER, FIELD_CUSTOMER_NAME, DEMO_CUSTOMER, {
  [FIELD_CUSTOMER_NAME]: DEMO_CUSTOMER,
  [FIELD_CUSTOMER_TYPE]: DEFAULT_CUSTOMER_TYPE,
  [FIELD_CUSTOMER_GROUP]: DEFAULT_CUSTOMER_GROUP,
});
for (const itemCode of [DEMO_ITEM_1, DEMO_ITEM_2]) {
  await ensureDoc(sid, DOCTYPE_ITEM, FIELD_ITEM_CODE, itemCode, {
    [FIELD_ITEM_CODE]: itemCode,
    [FIELD_ITEM_NAME]: itemCode,
    [FIELD_ITEM_GROUP]: DEFAULT_ITEM_GROUP,
    [FIELD_STOCK_UOM]: DEFAULT_STOCK_UOM,
    [FIELD_IS_STOCK_ITEM]: IS_STOCK_ITEM,
  });
}
await ensureDoc(sid, DOCTYPE_WAREHOUSE, FIELD_WAREHOUSE_NAME, DEMO_WAREHOUSE, {
  [FIELD_WAREHOUSE_NAME]: DEMO_WAREHOUSE,
  [FIELD_COMPANY]: companyName,
});

logger.info({ company: companyName }, SEED_DONE_MESSAGE);
