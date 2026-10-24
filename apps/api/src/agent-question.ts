import { AskQuestionSchema, LEARNING } from "shared";

const QUESTION = Object.freeze({ lines: /\r?\n/u, option: /^\s*(\d+)[.)]\s+(.+)\s*$/u, number: 1, label: 2, first: 0, start: 1, minimum: 2, separator: "\n" });
const CHOICE_INTENT = /\b(?:choose|select|pick)\s+(?:one|an?\s+(?:option|answer))\b|\bwhich\b[^\n?]*\?|\bshould\s+(?:I|we)\b/iu;
const MULTIPLE_DETAILS = /\b(?:both|all|each|steps?|multiple)\b/iu;
const PromptSchema = AskQuestionSchema.pick({ question: true, choices: true });

export function agentQuestion(question: string, choices: string[]) {
  const parsed = PromptSchema.parse({ question, choices: [...new Set(choices)] });
  if (parsed.choices.length) return parsed;
  const lines = parsed.question.split(QUESTION.lines);
  const options = lines.flatMap((line, index) => {
    const match = QUESTION.option.exec(line);
    const label = match?.[QUESTION.label]?.trim();
    return label ? [{ index, number: Number(match?.[QUESTION.number]), label }] : [];
  });
  const first = options.at(QUESTION.first);
  if (!first || options.length < QUESTION.minimum || options.length > LEARNING.maxChoices) return parsed;
  if (!options.every((option, index) => option.number === index + QUESTION.start && option.index === first.index + index)) return parsed;
  const introduction = lines.slice(QUESTION.first, first.index).join(QUESTION.separator);
  if (!CHOICE_INTENT.test(introduction) || MULTIPLE_DETAILS.test(introduction)) return parsed;
  const context = lines.filter((_line, index) => index < first.index || index >= first.index + options.length).join(QUESTION.separator).trim();
  return PromptSchema.parse({ question: context || parsed.question, choices: [...new Set(options.map((option) => option.label))] });
}
