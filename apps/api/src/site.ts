export interface SiteProfile {
  poUrl: string;
  soUrl: string;
  stockUrl: string;
  hints: string;
}

const TRAILING_SLASHES = /\/+$/;

// Single normalization point: stored and client hosts arrive raw (row
// contract is nullable string, no URL shape), so every use-site goes
// through here instead of exact-matching or concatenating raw values.
export function canonicalHost(erpHost: string): string {
  return erpHost.trim().replace(TRAILING_SLASHES, "");
}

const FRAPPE_PO_PATH = "/app/purchase-order" as const;
const FRAPPE_SO_PATH = "/app/sales-order" as const;
const FRAPPE_STOCK_PATH = "/app/stock-entry" as const;
const FRAPPE_HINTS = "" as const;

const DEMO_PO_PATH = "/buying/purchase-orders" as const;
const DEMO_SO_PATH = "/selling/sales-orders" as const;
const DEMO_STOCK_PATH = "/stock/stock-entries" as const;
const DEMO_HINTS =
  "Use the assigned Vault login or saved browser session. If neither is available, stop and ask for setup." as const;

export function isMockHost(erpHost: string, mockHost: string | null): boolean {
  return mockHost !== null && canonicalHost(erpHost) === canonicalHost(mockHost);
}

export function resolveSiteProfile(erpHost: string, mockHost: string | null): SiteProfile {
  const base: string = canonicalHost(erpHost);
  if (isMockHost(erpHost, mockHost)) {
    return {
      poUrl: `${base}${DEMO_PO_PATH}`,
      soUrl: `${base}${DEMO_SO_PATH}`,
      stockUrl: `${base}${DEMO_STOCK_PATH}`,
      hints: DEMO_HINTS,
    };
  }
  return {
    poUrl: `${base}${FRAPPE_PO_PATH}`,
    soUrl: `${base}${FRAPPE_SO_PATH}`,
    stockUrl: `${base}${FRAPPE_STOCK_PATH}`,
    hints: FRAPPE_HINTS,
  };
}
