import { z } from "zod";

const MIN_TEXT = 1;
const MAX_INPUT = 12000;
const MAX_ELEMENTS = 150;
const MAX_TEXT = 24000;
export const BROWSER = Object.freeze({
  local: "local", remote: "tinyfish", production: "production",
  settings: "/api/auth/browser", frame: "/api/jobs/:id/browser", stop: "/api/jobs/:id/stop",
  forbidden: "Local browser sessions are disabled in this deployment.",
  missing: "Install Chromium and configure the local browser before starting a task.",
  interrupted: "The local browser stopped before the result was confirmed. Check the ERP before continuing.",
  stopped: "The local browser was stopped. Check the ERP for any changes before starting another request.",
  unavailable: "The local browser could not complete this step. Check the ERP and the browser configuration.",
  noFrame: "This local browser session is no longer live.",
  scope: "This action must stay in the connected ERP. Ask the user if another site is required.",
  stale: "That element is no longer available. Read the page again before acting.",
  credentialField: "Use the secure sign-in tool for login fields. Never send credentials to the model.",
  draftBlocked: "This request permits drafts only. Finalizing actions are blocked.",
  invalidAction: "Supply the fields required by the selected browser action.",
  maxElements: MAX_ELEMENTS, maxText: MAX_TEXT,
});
export const BrowserProviderSchema = z.enum([BROWSER.remote, BROWSER.local]);
export const DeploymentModeSchema = z.enum([BROWSER.local, BROWSER.production]);
export const BrowserSettingsUpdateSchema = z.object({ local: z.boolean() }).strict();
export const BrowserSettingsSchema = z.object({ local_allowed: z.boolean(), local_forced: z.boolean(), provider: BrowserProviderSchema, preference: BrowserProviderSchema });
export const BrowserPreferenceRowSchema = z.object({ provider: BrowserProviderSchema });
export const BrowserColumnSchema = z.object({ name: z.string() });
const ref = z.string().min(MIN_TEXT);
export const BrowserActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read") }),
  z.object({ action: z.literal("navigate"), url: z.url() }),
  z.object({ action: z.literal("click"), ref }),
  z.object({ action: z.literal("fill"), ref, value: z.string().max(MAX_INPUT) }),
  z.object({ action: z.literal("select"), ref, value: z.string().max(MAX_INPUT) }),
  z.object({ action: z.literal("press"), ref, key: z.enum(["Enter", "Tab", "Escape", "ArrowDown", "ArrowUp"]) }),
  z.object({ action: z.literal("sign_in"), username_ref: ref, password_ref: ref }),
]);
// OpenAI-compatible providers require an object at the top level of tool parameters.
export const BrowserToolInputSchema = z.object({
  action: z.enum(["read", "navigate", "click", "fill", "select", "press", "sign_in"]),
  ref: ref.optional(), url: z.url().optional(), value: z.string().max(MAX_INPUT).optional(),
  key: z.enum(["Enter", "Tab", "Escape", "ArrowDown", "ArrowUp"]).optional(),
  username_ref: ref.optional(), password_ref: ref.optional(),
}).superRefine((input, context) => {
  if (!BrowserActionSchema.safeParse(input).success) context.addIssue({ code: "custom", message: BROWSER.invalidAction });
});
export const BrowserElementSchema = z.object({ ref, tag: z.string(), type: z.string(), label: z.string(), value: z.string(), options: z.array(z.object({ label: z.string(), value: z.string() })) });
export const BrowserFrameSchema = z.object({ url: z.string(), text: z.string(), elements: BrowserElementSchema.array() });
export const LocalBrowserRunSchema = z.object({ id: z.string(), status: z.enum(["running", "completed", "failed"]), result_json: z.string().nullable(), error: z.string().nullable() });
export const BrowserCookiesRowSchema = z.object({ encrypted_cookies: z.string() });
export const BrowserCookiesSchema = z.array(z.object({ name: z.string(), value: z.string(), domain: z.string(), path: z.string(), expires: z.number(), httpOnly: z.boolean(), secure: z.boolean(), sameSite: z.enum(["Strict", "Lax", "None"]), partitionKey: z.string().optional() }));
export type BrowserProvider = z.infer<typeof BrowserProviderSchema>;
export type BrowserAction = z.infer<typeof BrowserActionSchema>;
