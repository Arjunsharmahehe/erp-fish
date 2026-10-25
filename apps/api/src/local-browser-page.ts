import type { Frame, Locator, Page } from "playwright";
import { BROWSER, BrowserFrameSchema, type ErpCredentials } from "shared";
import { localBrowserConfig as CONFIG } from "./local-browser-config";

export function redactBrowserText(value: string, credentials: ErpCredentials) {
  const secrets = [credentials.username, credentials.password].filter(Boolean).sort((left, right) => right.length - left.length);
  const pattern = secrets.map((secret) => secret.replace(CONFIG.regexSpecial, CONFIG.regexEscape)).join(CONFIG.regexAlternative);
  return pattern ? value.replace(new RegExp(pattern, CONFIG.global), CONFIG.redacted) : value;
}
export function requireErpOrigin(url: string, erpUrl: string) {
  if (new URL(url).origin !== new URL(erpUrl).origin) throw new Error(BROWSER.scope);
}
async function frameSnapshot(frame: Frame, prefix: string) {
  return BrowserFrameSchema.parse(await frame.evaluate(({ config, limits, prefix }) => {
    const nodes = [...document.querySelectorAll(config.elements)].filter((node) => node instanceof HTMLElement && node.getBoundingClientRect().width > limits.zero && node.getBoundingClientRect().height > limits.zero);
    function fieldLabel(node: Element) {
      const field = node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement;
      return field ? node.labels?.[limits.zero]?.textContent : null;
    }
    function labelFor(node: Element) {
      return node.getAttribute(limits.ariaLabel) ?? fieldLabel(node) ?? node.getAttribute(limits.placeholder) ?? node.textContent;
    }
    function valueFor(node: Element) {
      if (node.hasAttribute(config.protectedAttribute)) return config.empty;
      if (node instanceof HTMLInputElement) return node.type === config.password ? config.empty : node.value;
      if (node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) return node.value;
      return config.empty;
    }
    const elements = nodes.slice(limits.zero, limits.elements).map((node, index) => {
      const ref = `${prefix}-${String(index)}`; node.setAttribute(config.attribute, ref);
      const type = node.getAttribute(limits.type) ?? config.empty;
      return { ref, tag: node.tagName.toLowerCase(), type, label: labelFor(node).trim(), value: valueFor(node), options: node instanceof HTMLSelectElement ? [...node.options].map((option) => ({ label: option.label, value: option.value })) : [] };
    });
    return { url: location.href, text: document.body.innerText, elements };
  }, { config: CONFIG, limits: { zero: 0, elements: BROWSER.maxElements, text: BROWSER.maxText, type: "type", ariaLabel: "aria-label", placeholder: "placeholder" }, prefix }));
}
export async function observeBrowser(page: Page, options: { erpUrl: string; credentials: ErpCredentials; refs: Map<string, Locator> }) {
  requireErpOrigin(page.url(), options.erpUrl);
  options.refs.clear();
  const frames = [];
  for (const [index, frame] of page.frames().slice(CONFIG.first, CONFIG.frameLimit).entries()) {
    if (new URL(frame.url()).origin !== new URL(options.erpUrl).origin) continue;
    const snapshot = await frameSnapshot(frame, String(index));
    for (const element of snapshot.elements) options.refs.set(element.ref, frame.locator(`[${CONFIG.attribute}="${element.ref}"]`));
    const redact = (value: string) => redactBrowserText(value, options.credentials);
    frames.push({ ...snapshot, url: redact(snapshot.url), text: redact(snapshot.text).slice(CONFIG.first, BROWSER.maxText), elements: snapshot.elements.map((element) => ({ ...element, label: redact(element.label).slice(CONFIG.first, CONFIG.maxLabel), value: redact(element.value), options: element.options.map((option) => ({ label: redact(option.label), value: redact(option.value) })) })) });
  }
  return { frames };
}
