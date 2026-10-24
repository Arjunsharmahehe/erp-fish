import { toolDefinition, type AnyServerTool } from "@tanstack/ai";
import { TinyFish } from "@tiny-fish/sdk";
import * as z from "zod";
import { MIN_TEXT_LENGTH } from "shared";
import {
  FETCH_URL_TOOL,
  FETCH_URL_TOOL_DESCRIPTION,
  WEB_SEARCH_TOOL,
  WEB_SEARCH_TOOL_DESCRIPTION,
} from "./chat";
import { env } from "./env";
import { logger } from "./logger";

const MAX_SEARCH_RESULTS = 5 as const;
const MAX_FETCH_CHARS = 8000 as const;
const MAX_SNIPPET_CHARS = 500 as const;
const MAX_PURPOSE_CHARS = 2000 as const;
const FETCH_MARKDOWN_FORMAT = "markdown" as const;
const MISSING_TINYFISH_KEY_MESSAGE = "missing_tinyfish_api_key" as const;
const FETCH_FAILED_MESSAGE = "fetch_failed" as const;
const TOOLS_LOG_MESSAGE = "planning_tool_completed" as const;

const WebSearchInputSchema = z.object({
  query: z.string().min(MIN_TEXT_LENGTH),
  purpose: z.string().min(MIN_TEXT_LENGTH).max(MAX_PURPOSE_CHARS).optional(),
});

const WebSearchOutputSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string(),
    }),
  ),
  total_results: z.number(),
});

const FetchUrlInputSchema = z.object({
  url: z.string().min(MIN_TEXT_LENGTH),
  purpose: z.string().min(MIN_TEXT_LENGTH).max(MAX_PURPOSE_CHARS).optional(),
});

const FetchUrlOutputSchema = z.object({
  url: z.string(),
  title: z.string().nullable(),
  text: z.string(),
});

function tinyfishClient(): TinyFish {
  const apiKey: string | undefined = env.TINYFISH_API_KEY;
  if (apiKey === undefined) {
    throw new Error(MISSING_TINYFISH_KEY_MESSAGE);
  }
  return new TinyFish({ apiKey });
}

// createPlanningTools builds the executable TinyFish-backed tools for the
// plan-mode agentic run. Empty without keys — the chat route then tells the
// model browsing is unavailable instead of offering tools that cannot run.
export function createPlanningTools(): AnyServerTool[] {
  if (env.TINYFISH_API_KEY === undefined) {
    return [];
  }
  const webSearch = toolDefinition({
    name: WEB_SEARCH_TOOL,
    description: WEB_SEARCH_TOOL_DESCRIPTION,
    inputSchema: WebSearchInputSchema,
    outputSchema: WebSearchOutputSchema,
  }).server(async (args) => {
    const response = await tinyfishClient().search.query({
      query: args.query,
      purpose: args.purpose,
    });
    const results = response.results.slice(0, MAX_SEARCH_RESULTS).map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet.slice(0, MAX_SNIPPET_CHARS),
    }));
    logger.info(
      { tool: WEB_SEARCH_TOOL, resultCount: results.length },
      TOOLS_LOG_MESSAGE,
    );
    return { results, total_results: response.total_results };
  });
  const fetchUrl = toolDefinition({
    name: FETCH_URL_TOOL,
    description: FETCH_URL_TOOL_DESCRIPTION,
    inputSchema: FetchUrlInputSchema,
    outputSchema: FetchUrlOutputSchema,
  }).server(async (args) => {
    const response = await tinyfishClient().fetch.getContents({
      urls: [args.url],
      purpose: args.purpose,
      format: FETCH_MARKDOWN_FORMAT,
    });
    const first = response.results.at(0);
    if (first?.format !== FETCH_MARKDOWN_FORMAT) {
      logger.warn({ tool: FETCH_URL_TOOL, url: args.url }, FETCH_FAILED_MESSAGE);
      throw new Error(FETCH_FAILED_MESSAGE);
    }
    logger.info({ tool: FETCH_URL_TOOL }, TOOLS_LOG_MESSAGE);
    return {
      url: first.url,
      title: first.title,
      text: (first.text ?? "").slice(0, MAX_FETCH_CHARS),
    };
  });
  return [webSearch, fetchUrl];
}
