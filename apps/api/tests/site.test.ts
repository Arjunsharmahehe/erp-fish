import { expect, test } from "bun:test";
import { DEMO_ERP_HOST, DEMO_INSTRUCTION, DEMO_INVOICE, type JobInput } from "shared";
import { buildPoGoal } from "../src/goals";
import { resolveSiteProfile, type SiteProfile } from "../src/site";

const MOCK_HOST = "https://demo-erp.fukumean.me" as const;
const MOCK_PROFILE_ID = "profile-mock-test" as const;

function mockInput(): JobInput {
  return {
    invoice_json: DEMO_INVOICE,
    instruction: DEMO_INSTRUCTION,
    erp_host: MOCK_HOST,
    profile_id: MOCK_PROFILE_ID,
  };
}

test("unknown host resolves to the Frappe default paths", () => {
  const site: SiteProfile = resolveSiteProfile(DEMO_ERP_HOST, null);
  expect(site.poUrl).toBe(`${DEMO_ERP_HOST}/app/purchase-order`);
});

test("mock host resolves to the demo buying paths", () => {
  const site: SiteProfile = resolveSiteProfile(MOCK_HOST, MOCK_HOST);
  expect(site.poUrl).toBe(`${MOCK_HOST}/buying/purchase-orders`);
});

test("trailing-slash host still matches the mock", () => {
  const site: SiteProfile = resolveSiteProfile("https://demo-erp.fukumean.me/", MOCK_HOST);
  expect(site.poUrl).toBe(`${MOCK_HOST}/buying/purchase-orders`);
});

test("po goal points at the site entry url", () => {
  const site: SiteProfile = resolveSiteProfile(MOCK_HOST, MOCK_HOST);
  const goal: string = buildPoGoal({ input: mockInput(), learned: "", site });
  expect(goal).toContain(site.poUrl);
});
