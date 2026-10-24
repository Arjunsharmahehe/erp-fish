import { z } from "zod";
import { ErpUrlSchema } from "./connection";
import { MIN_TEXT_LENGTH } from "./base";

export const REMOTE_VAULT = Object.freeze({
  revisionPrefix: "tinyfish-vault:", dashboard: "https://agent.tinyfish.ai/",
  missing: "Connect an ERP login in TinyFish Vault and ask the server owner to assign it to your account.",
  unavailable: "TinyFish Vault could not be checked. Try again shortly.",
  invalid: "The assigned TinyFish Vault login is missing or does not match this ERP domain.",
  localOnly: "Saved local credentials are reserved for local browser execution. Remote sessions use TinyFish Vault.",
});
export const RemoteVaultBindingSchema = z.object({
  user_id: z.uuid(), erp_url: ErpUrlSchema,
  credential_item_id: z.string().trim().min(MIN_TEXT_LENGTH),
}).strict();
export const RemoteVaultBindingsSchema = z.array(RemoteVaultBindingSchema).refine(
  (bindings) => new Set(bindings.map((binding) => JSON.stringify([binding.user_id, binding.erp_url]))).size === bindings.length,
  "Each account and ERP URL must have exactly one TinyFish Vault assignment.",
);
export const RemoteVaultItemsSchema = z.object({ items: z.array(z.object({
  itemId: z.string().min(MIN_TEXT_LENGTH), label: z.string(), domains: z.array(z.string()),
})) });
export type RemoteVaultBinding = z.infer<typeof RemoteVaultBindingSchema>;
