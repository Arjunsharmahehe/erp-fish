export const CHAT_COPY = {
  copy: "Copy response", copied: "Copied", copyFailed: "Could not copy. Please select and copy the response.",
  activity: "Activity", working: "Working", complete: "Completed", failed: "Failed",
  starting: "Preparing your response…", sources: "Sources", source: "Source",
  planning: { running: "Reviewing your request", complete: "Reviewed your request", error: "Could not finish reviewing" },
  web_search: { running: "Searching the web", complete: "Searched the web", error: "Web search failed" },
  fetch_url: { running: "Reading a web page", complete: "Read a web page", error: "Could not read the page" },
  answer: { running: "Writing your response", complete: "Response ready", error: "Could not complete the response" },
};
const COPIED_FEEDBACK_MS = 2000;
export const CHAT_PRESENTATION = { copiedMs: COPIED_FEEDBACK_MS, first: 0, step: 1 };
export const CHAT_LINK = { target: "_blank", rel: "noopener noreferrer", protocols: ["https:", "http:"] };

export function sourceUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return CHAT_LINK.protocols.includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}
