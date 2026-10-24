import { API_PATHS, CHAT_MODE_PLANNING } from "shared";

export const PLAN_ROUTES = {
  landing: "/",
  login: "/login",
  signup: "/signup",
  onboarding: "/onboarding",
  home: "/home",
  memory: "/home/memory",
  settings: "/home/settings",
};

export const PLAN_API = Object.freeze({
  signup: API_PATHS.authSignup,
  login: API_PATHS.authLogin,
  logout: API_PATHS.authLogout,
  me: API_PATHS.authMe,
  onboarding: API_PATHS.onboarding,
  chat: API_PATHS.chat,
  threads: API_PATHS.chatThreads,
});

export const PLAN_COPY = {
  product: "erp-fish",
  pitch: "Plan and run your ERP work from one place.",
  signup: "Sign up",
  login: "Log in",
  email: "Email",
  password: "Password",
  loggingIn: "Logging in…",
  signingUp: "Creating account…",
  authError: "We couldn't complete that request. Check your details and try again.",
  authUnavailable: "The service is unavailable. Try again shortly.",
  unauthorized: "Your email or password is incorrect, or your session has expired. Please log in again.",
  duplicateEmail: "This email is already registered. Log in to continue.",
  notFound: "This conversation is unavailable. Start a new conversation.",
  featureUnavailable: "This feature is not configured yet. You can attach an invoice as JSON or continue without it.",
  invalidResponse: "The service returned an unexpected response. Please try again.",
  invalidInvoiceJson: "This JSON does not match an invoice. Include supplier, invoice_no, and items with name, qty, and rate.",
  unsupportedFile: "This file type is not supported yet. Add a PDF or JSON invoice.",
  onboardingTitle: "Connect your ERP",
  onboardingDescription: "Add your ERP host to start planning. Credentials can wait.",
  erpHost: "ERP host URL",
  erpHostHint: "Use the full HTTPS address of your ERPNext site.",
  erpUsername: "ERP username (optional)",
  erpPassword: "ERP password (optional)",
  credentialsTitle: "ERP credentials",
  credentialsDescription: "Add credentials when your Vault connection is ready, or continue with only the host.",
  hostOnly: "Continue with host only",
  addCredentials: "Add ERP credentials",
  next: "Next",
  back: "Back",
  skipCredentials: "Skip credentials",
  finish: "Finish setup",
  saving: "Saving…",
  chat: "Chat",
  memory: "Memory",
  settings: "Settings",
  recent: "Recent conversations",
  newChat: "New conversation",
  noThreads: "Your conversations will appear here.",
  chatTitle: "Plan your ERP work",
  chatDescription: "Ask about an invoice or outline the task you want to complete.",
  planning: "Planning",
  agent: "Agent",
  agentComing: "Agent mode is coming next. Planning is available now.",
  composeLabel: "Message",
  composePlaceholder: "Ask a question or describe a task…",
  send: "Send",
  sending: "Sending…",
  attach: "Attach PDF or JSON invoice",
  parseFailed: "The invoice could not be read. Check the PDF or JSON and try again.",
  chatFailed: "The message could not be sent. Try again.",
  invoiceReady: "Invoice ready",
  invoiceMissing: "No invoice attached",
  logout: "Log out",
  memoryLater: "Memory management is coming soon.",
  settingsLater: "Connection settings are coming soon.",
  loading: "Loading…",
};

export const PLAN_HTTP = Object.freeze({
  post: "POST",
  get: "GET",
  json: "application/json",
  pdf: "application/pdf",
  contentType: "Content-Type",
  cookie: "Cookie",
  include: "include" satisfies RequestCredentials,
  noStore: "no-store" satisfies RequestCache,
});

export const PLAN_MODE = Object.freeze({
  planning: CHAT_MODE_PLANNING,
  agent: "agent",
});

export const PLAN_LIMITS = {
  firstStep: 0,
  credentialsStep: 1,
  minLength: 1,
  nextOccurrence: 1,
  composerRows: 1,
};

export const THREADS_QUERY_KEY = Object.freeze(["plan-threads"]);

const UNAUTHORIZED_STATUS = 401;
const CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;
const UNAVAILABLE_STATUS = 503;
export const PLAN_STATUS = Object.freeze({ unauthorized: UNAUTHORIZED_STATUS, conflict: CONFLICT_STATUS, notFound: NOT_FOUND_STATUS, unavailable: UNAVAILABLE_STATUS });
export const INVOICE_FILE = Object.freeze({ jsonExtension: ".json", pdfExtension: ".pdf" });
