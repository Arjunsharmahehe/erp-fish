import { translations } from "./translations";
const ENGLISH = 0;
const HINDI = 1;
const TAMIL = 2;
export const messages = {
  en: { ui: Object.fromEntries(translations.map((entry, index) => [String(index), entry[ENGLISH]])) },
  hi: { ui: Object.fromEntries(translations.map((entry, index) => [String(index), entry[HINDI]])) },
  ta: { ui: Object.fromEntries(translations.map((entry, index) => [String(index), entry[TAMIL]])) },
};
