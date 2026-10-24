import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import type { Database } from "bun:sqlite";
import { extractText, getDocumentProxy } from "unpdf";
import { AGENT, AgentDocumentSchema } from "shared";
import { readSessionUser } from "./auth";

const CONFIG_BAD_REQUEST = 400;
const CONFIG_TOO_LARGE = 413;
const DOCUMENT = Object.freeze({ contentType: "Content-Type", fileName: "X-File-Name", pdf: "application/pdf", text: "text/plain", json: "application/json", badRequest: CONFIG_BAD_REQUEST, tooLarge: CONFIG_TOO_LARGE, invalid: "Add a readable PDF, text, or JSON file smaller than 10 MB.", defaultName: "document.pdf", mergePages: true });
export function createAgentDocumentRouter(db: Database) {
  return new Hono()
    .use(AGENT.paths.document, bodyLimit({ maxSize: AGENT.maxFileBytes, onError: () => { throw new HTTPException(DOCUMENT.tooLarge, { message: DOCUMENT.invalid }); } }))
    .post(AGENT.paths.document, async (c) => {
      await readSessionUser(c, db);
      try {
        const type = c.req.header(DOCUMENT.contentType);
        const name = decodeURIComponent(c.req.header(DOCUMENT.fileName) ?? DOCUMENT.defaultName);
        let text: string;
        if (type === DOCUMENT.pdf) {
          const pdf = await getDocumentProxy(new Uint8Array(await c.req.arrayBuffer()));
          text = (await extractText(pdf, { mergePages: DOCUMENT.mergePages })).text;
        } else if (type === DOCUMENT.text || type === DOCUMENT.json) text = await c.req.text();
        else throw new Error(DOCUMENT.invalid);
        return c.json(AgentDocumentSchema.parse({ name, text }));
      } catch { throw new HTTPException(DOCUMENT.badRequest, { message: DOCUMENT.invalid }); }
    });
}
