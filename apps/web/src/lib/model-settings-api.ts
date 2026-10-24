import { z } from "zod";
import { MODEL_SETTINGS, ModelSettingsStateSchema, ModelSettingsUpdateSchema, type ModelSettingsUpdate } from "shared";
import { api } from "./api";
import { MODEL_COPY } from "./model-settings-config";
const ErrorMessageSchema = z.enum(MODEL_SETTINGS);
async function decode(response: Pick<Response, "ok" | "text" | "json">) {
  if (!response.ok) {
    const error = ErrorMessageSchema.safeParse(await response.text());
    throw new Error(error.success ? error.data : MODEL_COPY.failed);
  }
  return ModelSettingsStateSchema.parse(await response.json());
}
export async function fetchModelSettings() { return decode(await api.api.auth.model.$get()); }
export async function saveModelSettings(input: ModelSettingsUpdate) { return decode(await api.api.auth.model.$patch({ json: ModelSettingsUpdateSchema.parse(input) })); }
export async function resetModelSettings() { return decode(await api.api.auth.model.$delete()); }
