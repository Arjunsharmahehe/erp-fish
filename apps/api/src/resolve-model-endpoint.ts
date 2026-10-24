import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { HTTPException } from "hono/http-exception";
import { MODEL_SETTINGS } from "shared";

const BAD_REQUEST = 400;
const IPV4 = 4;
const PREFIX_BITS_3 = 3;
const PREFIX_BITS_4 = 4;
const PREFIX_BITS_8 = 8;
const PREFIX_BITS_10 = 10;
const PREFIX_BITS_12 = 12;
const PREFIX_BITS_15 = 15;
const PREFIX_BITS_16 = 16;
const PREFIX_BITS_23 = 23;
const PREFIX_BITS_24 = 24;
const PREFIX_BITS_32 = 32;
const PRIVATE_V4 = [
  { address: "0.0.0.0", prefix: PREFIX_BITS_8 }, { address: "10.0.0.0", prefix: PREFIX_BITS_8 },
  { address: "100.64.0.0", prefix: PREFIX_BITS_10 }, { address: "127.0.0.0", prefix: PREFIX_BITS_8 },
  { address: "169.254.0.0", prefix: PREFIX_BITS_16 }, { address: "172.16.0.0", prefix: PREFIX_BITS_12 },
  { address: "192.0.0.0", prefix: PREFIX_BITS_24 }, { address: "192.0.2.0", prefix: PREFIX_BITS_24 },
  { address: "192.168.0.0", prefix: PREFIX_BITS_16 }, { address: "198.18.0.0", prefix: PREFIX_BITS_15 },
  { address: "198.51.100.0", prefix: PREFIX_BITS_24 }, { address: "203.0.113.0", prefix: PREFIX_BITS_24 },
  { address: "224.0.0.0", prefix: PREFIX_BITS_4 }, { address: "240.0.0.0", prefix: PREFIX_BITS_4 },
];
const GLOBAL_V6 = { address: "2000::", prefix: PREFIX_BITS_3 };
const PRIVATE_V6 = [{ address: "2001::", prefix: PREFIX_BITS_23 }, { address: "2001:db8::", prefix: PREFIX_BITS_32 }, { address: "2002::", prefix: PREFIX_BITS_16 }];
const blocked = new BlockList();
const globalV6 = new BlockList();
for (const { address, prefix } of PRIVATE_V4) blocked.addSubnet(address, prefix, "ipv4");
for (const { address, prefix } of PRIVATE_V6) blocked.addSubnet(address, prefix, "ipv6");
globalV6.addSubnet(GLOBAL_V6.address, GLOBAL_V6.prefix, "ipv6");
function publicAddress(address: string) {
  return isIP(address) === IPV4 ? !blocked.check(address, "ipv4") : globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}
export async function resolveModelEndpoint(endpoint: string) {
  const url = new URL(endpoint);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  let addresses;
  try { addresses = await lookup(hostname, { all: true, order: "verbatim" }); }
  catch { throw new HTTPException(BAD_REQUEST, { message: MODEL_SETTINGS.invalidUrl }); }
  const [first = null] = addresses;
  if (!first || addresses.some((entry) => !publicAddress(entry.address))) throw new HTTPException(BAD_REQUEST, { message: MODEL_SETTINGS.invalidUrl });
  return { url, hostname, address: first.address };
}
