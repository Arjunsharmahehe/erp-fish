# Cloudflare Tunnel (demo machine only)

Exposes local ERPNext (`http://localhost:8080`) to the TinyFish cloud
browser on a stable public HTTPS URL. TinyFish Profiles stay valid across
runs only while this URL never changes.

## Install

`cloudflared` is a single binary (no daemon needed for quick tunnels).
Install it on the demo machine with the OS package manager, then verify:

```bash
cloudflared --version
```

## Prove reachability (quick tunnel, random URL)

```bash
cloudflared tunnel --url http://localhost:8080
```

Open the printed `https://….trycloudflare.com` URL in a browser: the ERPNext
login page must load. This proves the path TinyFish will use. Stop it when
done — quick URLs are random per run.

## Freeze the demo URL (named tunnel, once)

1. `cloudflared tunnel login` (one-time, opens Cloudflare dashboard auth).
2. `cloudflared tunnel create erpnext-demo` — prints the tunnel ID.
3. Route DNS: `cloudflared tunnel route dns erpnext-demo erp.example.com`
   (use a domain you control; this is the frozen URL).
4. Serve it with `infra/tunnel/cloudflared.yml` (tunnel ID + hostname filled):

```bash
cloudflared tunnel --config infra/tunnel/cloudflared.yml run erpnext-demo
```

Never restart this tunnel mid-demo: Browser Context Profiles bind to the
frozen hostname, and a fresh URL invalidates them.

## Wire into erp-fish

- `ERP_BASE_URL` (api env) = the frozen `https://` URL.
- TinyFish Profile setup-session + Vault both target that URL (ticket 02
  live proof, keyed phase).
