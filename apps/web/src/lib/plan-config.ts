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
  signup: "/api/auth/signup",
  login: "/api/auth/login",
  logout: "/api/auth/logout",
  me: "/api/auth/me",
  onboarding: "/api/onboarding",
  chat: "/api/chat",
  threads: "/api/chat/threads",
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
  attach: "Attach PDF invoice",
  parseFailed: "The invoice could not be read. Check the PDF and try again.",
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
  planning: "planning",
  agent: "agent",
});

export const PLAN_LIMITS = {
  firstStep: 0,
  credentialsStep: 1,
  minLength: 1,
  nextOccurrence: 1,
};

export const THREADS_QUERY_KEY = Object.freeze(["plan-threads"]);
