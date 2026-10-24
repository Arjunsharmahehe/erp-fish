import { translations } from "./translations";
const ENGLISH = 0;
export const copyKeys = new Map(translations.map((entry, index) => [entry[ENGLISH], String(index)]));
