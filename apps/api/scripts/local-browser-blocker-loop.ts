import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { AGENT, BROWSER, BrowserSettingsSchema, AgentRunViewSchema, AuthResponseSchema, DEMO_INVOICE, DEMO_PO_ID, DEMO_WAREHOUSE } from "shared";
import { logger } from "../src/logger";

const PORT = 3022;
const POLL_MS = 1000;
const DEADLINE_MS = 180000;
const PASSWORD_BYTES = 24;
const MAX_LOOKUPS = 8;
const MAX_BROWSER_ACTIONS = 16;
const REDIRECT = 303;
const BAD_REQUEST = 400;
const CONFIG = Object.freeze({
  zero: 0, one: 1, port: PORT, poll: POLL_MS, deadline: DEADLINE_MS, passwordBytes: PASSWORD_BYTES, maxLookups: MAX_LOOKUPS, maxActions: MAX_BROWSER_ACTIONS,
  signup: "/api/auth/signup", onboard: "/api/onboarding", model: "/api/auth/model", credentials: "/api/auth/settings/credentials",
  root: "/", form: "/new", draft: "/draft", record: "/record", unrelated: "/sales-order",
  method: "POST", patch: "PATCH", put: "PUT", get: "GET", json: "application/json", html: "text/html; charset=utf-8",
  cookie: "set-cookie", separator: ";", encoding: "base64", contentType: "Content-Type",
  username: "fixture-user", password: "fixture-secret", alternate: "Overflow Warehouse",
  warehouseField: "warehouse", invoiceField: "reference", supplierField: "supplier",
  missing: "Warehouse is required. Select the correct delivery location.",
  instruction: "Create a Purchase Order from the attached invoice. Save as draft only.",
  document: "frozen-invoice.json", questionPattern: /warehouse|delivery|location/iu,
  started: "local_blocker_loop_started", passed: "local_blocker_loop_passed",
  docker: "docker", logs: "logs", since: "--since", pipe: "pipe", newline: "\n", stepMarker: '"msg":"local_browser_step"',
});
const settings = createEnv({ server: {
  TEST_API_URL: z.url(), TEST_ERP_HOST: z.string().default("host.docker.internal"),
  TEST_API_CONTAINER: z.string().min(CONFIG.one).default("erp-fish-local-check-api-1"),
  OPENAI_BASE_URL: z.url(), OPENAI_MODEL: z.string().min(CONFIG.one), OPENAI_API_KEY: z.string().min(CONFIG.one),
}, runtimeEnv: process.env });
const counts: { writes: number; unrelatedVisits: number; lookups: number } = { writes: CONFIG.zero, unrelatedVisits: CONFIG.zero, lookups: CONFIG.zero };
let saved = false;
let cookie = "";

function page(body: string) {
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><title>Fixture ERP</title></head><body>${body}</body></html>`, { headers: { [CONFIG.contentType]: CONFIG.html } });
}
function details() {
  return `<p>Supplier: ${DEMO_INVOICE.supplier}</p><p>Invoice reference: ${DEMO_INVOICE.invoice_no}</p><p>Currency: INR</p><p>DEMO-ITEM-01: quantity 10, rate 150; DEMO-ITEM-02: quantity 5, rate 200; total 2500</p>`;
}
function orderForm() {
  return page(`<h1>New Purchase Order</h1>${details()}<p>Delivery location is required. The quotation does not specify which warehouse should receive this order.</p><form method="post" action="${CONFIG.draft}"><label>Invoice reference<input name="${CONFIG.invoiceField}" value="${DEMO_INVOICE.invoice_no}"></label><label>Supplier<input name="${CONFIG.supplierField}" value="${DEMO_INVOICE.supplier}"></label><label>Delivery warehouse<select required name="${CONFIG.warehouseField}"><option value="">Choose warehouse</option><option>${DEMO_WAREHOUSE}</option><option>${CONFIG.alternate}</option></select></label><button>Save draft</button></form><a href="${CONFIG.root}">Purchase Orders</a><a href="${CONFIG.unrelated}">Sales Order</a>`);
}
async function fixture(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === CONFIG.unrelated) { counts.unrelatedVisits++; return page(`<h1>Sales Order</h1><a href="${CONFIG.form}">Purchase Order</a>`); }
  if (request.method === CONFIG.method) {
    counts.writes++;
    const data = await request.formData();
    if (data.get(CONFIG.warehouseField) !== DEMO_WAREHOUSE) return new Response(CONFIG.missing, { status: BAD_REQUEST });
    assert.equal(data.get(CONFIG.invoiceField), DEMO_INVOICE.invoice_no);
    assert.equal(data.get(CONFIG.supplierField), DEMO_INVOICE.supplier);
    saved = true;
    return new Response(null, { status: REDIRECT, headers: { Location: CONFIG.record } });
  }
  if (url.pathname === CONFIG.form) return orderForm();
  if (url.pathname === CONFIG.record && saved) return page(`<h1>Purchase Order ${DEMO_PO_ID}</h1><p>Status: Draft</p>${details()}<p>Warehouse: ${DEMO_WAREHOUSE}</p>`);
  counts.lookups++;
  return page(`<h1>Purchase Orders</h1><form><label>Invoice reference<input name="${CONFIG.invoiceField}"></label><label>Supplier<input name="${CONFIG.supplierField}"></label><button>Search</button></form>${saved ? `<a href="${CONFIG.record}">${DEMO_PO_ID} — ${DEMO_INVOICE.invoice_no} — ${DEMO_INVOICE.supplier}</a>` : "<p>No orders found</p>"}<a href="${CONFIG.form}">New Purchase Order</a><a href="${CONFIG.unrelated}">Sales Order</a>`);
}
async function api(path: string, options: { body?: unknown; method?: string } = {}) {
  const response = await fetch(`${settings.TEST_API_URL}${path}`, {
    method: options.method ?? (options.body ? CONFIG.method : CONFIG.get),
    headers: { cookie, [CONFIG.contentType]: CONFIG.json }, body: options.body ? JSON.stringify(options.body) : undefined,
  });
  assert.ok(response.ok, `Harness API failed: ${path} (${String(response.status)})`);
  const nextCookie = response.headers.get(CONFIG.cookie)?.split(CONFIG.separator).at(CONFIG.zero);
  if (nextCookie) cookie = nextCookie;
  const value: unknown = await response.json();
  return value;
}
async function settle(id: string) {
  const deadline = Date.now() + CONFIG.deadline;
  while (Date.now() < deadline) {
    const view = AgentRunViewSchema.parse(await api(`${AGENT.paths.jobs}/${id}`));
    if (view.status !== AGENT.statuses.preparing && view.status !== AGENT.statuses.running) return view;
    await Bun.sleep(CONFIG.poll);
  }
  await api(`${AGENT.paths.jobs}/${id}/stop`, { body: {} });
  throw new Error("Local browser did not pause or finish within the harness deadline.");
}
async function actionCount(input: { since: string; jobId: string; runId: string | null }) {
  const { runId } = input;
  assert.ok(runId);
  const process = Bun.spawn([CONFIG.docker, CONFIG.logs, CONFIG.since, input.since, settings.TEST_API_CONTAINER], { stdout: CONFIG.pipe, stderr: CONFIG.pipe });
  const [output, , exitCode] = await Promise.all([new Response(process.stdout).text(), new Response(process.stderr).text(), process.exited]);
  assert.equal(exitCode, CONFIG.zero, "Cannot read Docker step telemetry for the blocker check.");
  const count = output.split(CONFIG.newline).filter((line) => line.includes(`"jobId":"${input.jobId}"`) && line.includes(`"runId":"${runId}"`) && line.includes(CONFIG.stepMarker)).length;
  assert.ok(count > CONFIG.zero, "No browser step telemetry was captured.");
  return count;
}
async function run() {
  AuthResponseSchema.parse(await api(CONFIG.signup, { body: { email: `blocker-${crypto.randomUUID()}@example.test`, password: randomBytes(CONFIG.passwordBytes).toString(CONFIG.encoding) } }));
  await api(CONFIG.onboard, { body: { erp_host: `http://${settings.TEST_ERP_HOST}:${String(CONFIG.port)}` } });
  await api(CONFIG.model, { method: CONFIG.patch, body: { completion_url: settings.OPENAI_BASE_URL, model: settings.OPENAI_MODEL, api_key: settings.OPENAI_API_KEY } });
  await api(CONFIG.credentials, { method: CONFIG.put, body: { username: CONFIG.username, password: CONFIG.password } });
  assert.equal(BrowserSettingsSchema.parse(await api(BROWSER.settings, { method: CONFIG.patch, body: { local: true } })).provider, BROWSER.local);
  const request = { instruction: CONFIG.instruction, completion_mode: AGENT.modes.draft, document: { name: CONFIG.document, text: JSON.stringify(DEMO_INVOICE) } };
  const since = new Date().toISOString();
  const started = AgentRunViewSchema.parse(await api(AGENT.paths.jobs, { body: request }));
  logger.info({ jobId: started.id }, CONFIG.started);
  const waiting = await settle(started.id);
  assert.equal(waiting.status, AGENT.statuses.waiting);
  assert.match(waiting.question ?? "", CONFIG.questionPattern);
  assert.ok(waiting.choices.some((choice) => choice.includes(DEMO_WAREHOUSE)));
  assert.ok(waiting.choices.some((choice) => choice.includes(CONFIG.alternate)));
  assert.equal(counts.writes, CONFIG.zero);
  assert.equal(counts.unrelatedVisits, CONFIG.zero);
  assert.ok(counts.lookups <= CONFIG.maxLookups);
  const pausedActions = await actionCount({ since, jobId: started.id, runId: waiting.provider_run_id });
  assert.ok(pausedActions <= CONFIG.maxActions, "The browser explored too long before asking its question.");
  await api(`${AGENT.paths.jobs}/${started.id}/answer`, { body: { answer: DEMO_WAREHOUSE } });
  const resumed = await settle(started.id);
  assert.equal(resumed.status, AGENT.statuses.done);
  assert.equal(resumed.records.at(CONFIG.zero)?.id, DEMO_PO_ID);
  assert.equal(resumed.records.at(CONFIG.zero)?.state, "draft");
  const replay = AgentRunViewSchema.parse(await api(AGENT.paths.jobs, { body: { ...request, thread_id: started.thread_id } }));
  const deduped = await settle(replay.id);
  assert.equal(deduped.status, AGENT.statuses.done);
  assert.equal(deduped.records.at(CONFIG.zero)?.id, DEMO_PO_ID);
  assert.equal(deduped.records.at(CONFIG.zero)?.state, "existing");
  assert.equal(counts.writes, CONFIG.one);
  assert.equal(counts.unrelatedVisits, CONFIG.zero);
  logger.info({ jobId: started.id, questionRunId: waiting.provider_run_id, resumedRunId: resumed.provider_run_id, replayJobId: replay.id, replayRunId: deduped.provider_run_id, pausedActions, ...counts }, CONFIG.passed);
}
const server = Bun.serve({ port: CONFIG.port, fetch: fixture });
try { await run(); } finally { await server.stop(true); }
