import { AgentRunViewSchema, BrowserSettingsSchema } from "shared";
import { api } from "./api";
import { decodeResource } from "./workspace-api";
import { browserUi as COPY } from "./browser-ui";
const MISSING = 404;
export function fetchBrowserSettings() { return decodeResource(() => api.api.auth.browser.$get(), BrowserSettingsSchema); }
export function saveBrowserSettings(local: boolean) { return decodeResource(() => api.api.auth.browser.$patch({ json: { local } }), BrowserSettingsSchema); }
export function stopBrowser(id: string) { return decodeResource(() => api.api.jobs[":id"].stop.$post({ param: { id } }), AgentRunViewSchema); }
export async function fetchBrowserFrame(id: string, signal: AbortSignal) {
  const response = await api.api.jobs[":id"].browser.$get({ param: { id } }, { init: { signal } });
  if (response.status === MISSING) return null;
  if (!response.ok) throw new Error(COPY.frameError);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") resolve(reader.result); else reject(new Error(COPY.frameError)); };
    reader.onerror = () => { reject(new Error(COPY.frameError)); };
    reader.readAsDataURL(blob);
  });
}
