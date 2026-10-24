# 03: Invoice parse slice

**What to build:** Uploading the single demo invoice shows trusted JSON the planner can use. A bad parse asks for a fix instead of creating bad orders.

**Blocked by:** 01-cli-monorepo-scaffold.

**Status:** ready-for-agent

**Seam:** A (Parse) — proposed, confirm before testing. Input invoice bytes via the public parse interface, observe validated JSON or fix request. Never assert on internal text-extraction or prompt strings.

**TDD loop:** Red-green, one behavior at a time, stubbed LLM. Expected values are the frozen demo invoice literal, not recomputed output.

- [ ] Failing test first: known demo PDF bytes return the exact frozen supplier, invoice number, items, quantities, and rates
- [ ] Failing test first: LLM outage or garbage output yields a manual-fix request, never a hallucinated order
- [ ] Manual JSON paste fallback produces the same validated shape through the same interface
- [ ] Uses the pluggable OpenAI-compatible endpoint via env, default opencode go free models
