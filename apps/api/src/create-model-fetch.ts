import { request as httpsRequest, type RequestOptions } from "node:https";
import type { IncomingMessage } from "node:http";
import { HTTPException } from "hono/http-exception";
import { MODEL_SETTINGS } from "shared";
import { resolveModelEndpoint } from "./resolve-model-endpoint";

const REDIRECT_START = 300;
const REDIRECT_END = 400;
const BAD_GATEWAY = 502;
const HTTPS_PORT = 443;
const HOST_HEADER = "host";
const ACCEPT_ENCODING = "accept-encoding";
const IDENTITY_ENCODING = "identity";
const REQUEST_TIMEOUT = 120000;
const MIN_RESPONSE_STATUS = 200;
const MAX_RESPONSE_STATUS = 599;

function responseHeaders(message: IncomingMessage) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(message.headers)) {
    if (Array.isArray(value)) for (const item of value) headers.append(name, item);
    else if (value !== undefined) headers.set(name, value);
  }
  return headers;
}
function responseStream(message: IncomingMessage) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      message.on("data", (chunk: Buffer) => {
        if (!Buffer.isBuffer(chunk)) { message.destroy(new Error(MODEL_SETTINGS.requestFailed)); return; }
        controller.enqueue(new Uint8Array(chunk)); message.pause();
      });
      message.on("end", () => { controller.close(); });
      message.on("error", (error: Error) => { controller.error(error); });
    },
    pull() { message.resume(); },
    cancel() { message.destroy(); },
  });
}
function sendRequest(options: RequestOptions, body: ArrayBuffer) {
  return new Promise<Response>((resolve, reject) => {
    const request = httpsRequest(options, (message) => {
      try {
        const status = message.statusCode ?? BAD_GATEWAY;
        // Never forward the provider credential to a redirect target.
        if (status < MIN_RESPONSE_STATUS || status > MAX_RESPONSE_STATUS || (status >= REDIRECT_START && status < REDIRECT_END)) throw new Error(MODEL_SETTINGS.requestFailed);
        const headers = responseHeaders(message);
        resolve(new Response(responseStream(message), { status, headers }));
      } catch {
        message.destroy();
        reject(new HTTPException(BAD_GATEWAY, { message: MODEL_SETTINGS.requestFailed }));
      }
    });
    request.on("error", reject);
    request.setTimeout(REQUEST_TIMEOUT, () => { request.destroy(new Error(MODEL_SETTINGS.requestFailed)); });
    request.end(Buffer.from(body));
  });
}
export function createModelFetch(endpoint: string) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const incoming = new Request(input, init);
    if (incoming.url !== endpoint) throw new HTTPException(BAD_GATEWAY, { message: MODEL_SETTINGS.requestFailed });
    const resolved = await resolveModelEndpoint(endpoint);
    const headers = Object.fromEntries(incoming.headers); headers[HOST_HEADER] = resolved.url.host; headers[ACCEPT_ENCODING] = IDENTITY_ENCODING;
    // Connect to the checked IP, retaining the provider's hostname for TLS and Host.
    return sendRequest({ hostname: resolved.address, servername: resolved.hostname, port: resolved.url.port || HTTPS_PORT, path: resolved.url.pathname, method: incoming.method, headers, signal: incoming.signal }, await incoming.arrayBuffer());
  };
}
