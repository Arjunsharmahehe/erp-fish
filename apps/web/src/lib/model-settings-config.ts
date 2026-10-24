export const MODEL_COPY = {
  title: "AI model", description: "Bring your own OpenAI-compatible model for the agent and invoice processing.",
  url: "Completion URL", urlPlaceholder: "https://api.openai.com/v1/chat/completions",
  urlHint: "Use a public HTTPS endpoint. You can paste the full completion URL or the API base URL.",
  model: "Model ID", modelPlaceholder: "Enter your provider's model code", modelHint: "Choose a model that supports tool calling and JSON output.",
  key: "API key", keyPlaceholder: "Enter your provider API key", savedKeyPlaceholder: "Saved securely · leave blank to keep",
  keyHint: "Stored encrypted on the server. Your saved key is never sent back to this page.",
  save: "Save model", saving: "Saving…", saved: "Model connection saved. Your next request will use it.",
  reset: "Remove my connection", resetHint: "Remove your saved key and return to the server default, if available.", resetSaved: "Personal model connection removed.",
  server: "Using the server's default model. Save your own connection to override it.",
  personal: "Your saved model will be used for this account.", none: "Add a model connection to start using the agent.",
  failed: "Could not save model settings. Check the URL, model ID, and API key.", loading: "Loading model settings…",
};
export const MODEL_FIELDS = { url: "model-completion-url", model: "model-id", key: "model-api-key" };
