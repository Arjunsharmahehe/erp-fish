const AGENT_POLL_MS = 2500;
export const agentUi = Object.freeze({
  vaultTitle: "TinyFish Vault", vaultDescription: "Remote agents sign in with a login from your connected 1Password or Bitwarden vault. TinyFish fills it without exposing the password to the model.",
  vaultReady: "Vault login ready", vaultNeeded: "Vault setup needed", openVault: "Open TinyFish", refreshVault: "Check connection", checkingVault: "Checking…", vaultScoped: "Only the login assigned to your account and this ERP is available to the remote agent.",
  query: "agent-runs", statusQuery: ["agent-status"], pollMs: AGENT_POLL_MS, first: 0, empty: "", accept: ".pdf,.txt,.json", textMime: "text/plain", fileNameHeader: "X-File-Name", pdfExtension: ".pdf", textExtensions: [".txt", ".json"],
  welcome: "Attach a document or describe what to create. The agent will ask for missing details and work in your connected ERP.", attach: "Attach document", attachHint: "Add a PDF, text, or JSON document",
  title: "Agent", description: "Your task, carried out in your ERP.", hint: "The agent can change your ERP. You’ll choose draft or submit before it starts.",
  confirmTitle: "How should the agent finish?", confirmDescription: "Choose what the agent is allowed to do in your connected ERP for this request.",
  draft: "Save as draft", draftHint: "Fill the details and save a draft for you to review.", submit: "Create and submit", submitHint: "Fill the details and finalize the requested forms.",
  startDraft: "Start with draft", startSubmit: "Start and submit",
  answerHint: "Choose an option or write your own answer.", customAnswer: "Write your own answer…", answerRequired: "Choose an option or enter an answer to continue.",
  run: "Start agent", cancel: "Cancel", target: "Connected ERP", fileReady: "Document ready", fileError: "Add a readable PDF, text, or JSON file smaller than 10 MB.",
  starting: "Preparing your ERP session", working: "Working in your ERP", waiting: "Waiting for your answer", complete: "Task completed", failed: "Could not start the agent", uncertain: "Check your ERP", runId: "Browser run", details: "Run details", reply: "Your answer", continue: "Continue agent", continuing: "Continuing…", response: "Agent activity", requestFailed: "The agent request could not be completed.",
  loginTitle: "ERP login", loginDescription: "Store your ERP login securely for browser tasks. Credentials are encrypted on this server and filled directly into your ERP’s login form.",
  username: "ERP username", password: "ERP password", saveLogin: "Save login", savedLogin: "Login saved", noLogin: "Login needed", removeLogin: "Remove saved login", loginHint: "Passwords are never returned to the browser or included in model prompts. Save both fields to replace your login.",
  usernameId: "erp-username", passwordId: "erp-password", saved: "Saved", saving: "Saving…", connectionLabel: "ERP · ",
  resolve: "I checked the ERP", resolveTitle: "Finish reviewing this run?", resolveDescription: "Confirm that you checked for any records it created and that the browser run has stopped. This unlocks the conversation without retrying the task.", resolveConfirm: "Confirm review",
});
