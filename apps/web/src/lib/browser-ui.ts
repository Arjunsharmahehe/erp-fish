const FRAME_INTERVAL = 1500;
export const browserUi = Object.freeze({
  query: "browser-settings", frameQuery: "browser-frame", interval: FRAME_INTERVAL, noCache: 0,
  switchId: "local-browser", usernameId: "local-erp-username", passwordId: "local-erp-password", empty: "",
  title: "Browser session", description: "Choose where the agent operates your ERP.", local: "Local Chromium",
  toggle: "Use local browser", hint: "Run the browser on this machine inside Docker, using your saved AI model.",
  forced: "Local browser is enabled automatically because no TinyFish key is configured.",
  loginTitle: "Local ERP login", loginHint: "Your login is encrypted on this machine. The browser fills it without sending your password to the model.",
  cloudHint: "Page content is sent to your selected model provider. Voice input uses Groq when configured.",
  watch: "View browser", viewerTitle: "Local browser session", viewerHint: "Read-only view. The agent controls this browser; login fields are hidden.",
  opening: "Opening the browser…", live: "Browser is running", ended: "This browser session has ended.", imageAlt: "Live view of the agent’s local Chromium session",
  stop: "Stop browser", stopping: "Stopping…", frameError: "The browser view could not be loaded.",
});
