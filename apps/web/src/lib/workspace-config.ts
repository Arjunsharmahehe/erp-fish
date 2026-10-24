export const WORKSPACE_COPY = {
  memoryTitle: "Memory", memoryIntro: "Answers you’ve shared, ready for the next time.",
  memoryDetail: "The agent saves useful decisions from your conversations. Review what it remembers and keep it accurate.",
  search: "Search questions, answers, or context", emptyTitle: "A little knowledge goes a long way",
  emptyDescription: "When the agent asks a question, it can remember your answer for future ERP work. Those memories will appear here.",
  noMatches: "No memories match your search.", question: "Question", answer: "Saved answer", context: "Applies to",
  updated: "Updated", actions: "Actions", edit: "Edit memory", remove: "Delete memory",
  editDescription: "Your changes take precedence the next time the agent uses this memory.",
  deleteTitle: "Forget this answer?", deleteDescription: "The agent will stop using this memory and may ask again. The original conversation stays in your history.",
  cancel: "Cancel", save: "Save changes", saving: "Saving…", deleting: "Deleting…",
  source: "View original conversation", jobSource: "View original job", original: "Original question and answer",
  retry: "Try again", loadError: "We couldn’t load this page. Please try again.",
  requestError: "We couldn’t save that change. Please try again.", unavailable: "The service is unavailable. Please try again.",
  invalidResponse: "The service returned an unexpected response.", loading: "Loading…",
  settingsTitle: "Settings", settingsIntro: "Keep your ERP connection ready for work.",
  connection: "ERP connection", connectionDescription: "Your workspace and memories are scoped to this ERP.",
  erpUrl: "ERP URL", erpHint: "Use your ERPNext site’s HTTPS address. Changing it starts a separate memory scope.",
  erpPlaceholder: "https://erp.yourcompany.com", saved: "Changes saved.",
  login: "ERP login", loginDescription: "Use TinyFish’s secure browser profile to change the account used for ERP work.",
  reconnect: "Set up ERP login", reopen: "Change ERP login", check: "Refresh connection",
  checking: "Checking…", preparing: "Preparing…",
  noProvider: "TinyFish isn’t configured on this server yet. You can save your ERP URL now and connect your login later.",
  setupInstructions: "In TinyFish, open Browser Context Profiles, select the profile below, and sign in to your ERP with the account you want to use. Save the profile, then refresh the connection here.",
  profile: "Your browser profile", profileId: "Profile ID", sessionSaved: "Browser session saved",
  sessionMissing: "Sign-in setup needed", verifiedHint: "Saved browser state was found for this ERP. This does not guarantee the session has not expired.",
  vault: "Automatic re-login", vaultDescription: "Update the ERP username and password in your connected 1Password or Bitwarden vault. In TinyFish, use Settings → Vault to connect it. Refresh here to sync changes.",
  vaultReady: "Matching Vault credential available", vaultMissing: "No matching Vault credential found",
  openTinyfish: "Open TinyFish", vaultGuide: "Vault setup guide", privacy: "Passwords stay in your password manager. They are never saved in ERP Fish or sent to the model.",
  answerPrompt: "One detail before we continue", answerHint: "Choose a suggestion or enter your own answer.",
  answerLabel: "Your answer", answerPlaceholder: "Enter the detail the agent needs…",
  answerSubmit: "Continue", answerSubmitting: "Continuing…", answerSaved: "Answer saved",
  resumeFailed: "Your answer was saved. The agent couldn’t continue yet.", resume: "Resume agent",
  resumed: "The agent is continuing with your answer.", waiting: "Answer the question above to continue.",
};
export const WORKSPACE_QUERY = Object.freeze({ memory: ["saved-memories"], settings: ["erp-connection"], questions: "learning-questions" });
export const WORKSPACE_LINKS = { tinyfish: "https://agent.tinyfish.ai", vaultGuide: "https://docs.tinyfish.ai/vault-setup", target: "_blank", rel: "noopener noreferrer" };
export const WORKSPACE_FIELDS = { search: "memory-search", question: "memory-question", answer: "memory-answer", context: "memory-context", host: "erp-host", answerItem: "answer" };
const QUESTION_POLL_MS = 2000;
const MAX_ERROR_LENGTH = 500;
export const WORKSPACE_LIMITS = { first: 0, pollMs: QUESTION_POLL_MS, maxError: MAX_ERROR_LENGTH };
