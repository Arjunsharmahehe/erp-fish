# Container browser

`chromium-seccomp.json` is the Playwright v1.64.1 profile:
https://github.com/microsoft/playwright/blob/v1.64.1/utils/docker/seccomp_profile.json

Copyright Microsoft Corporation. Licensed under Apache-2.0. The profile extends
Docker's default allowlist with the user namespace calls needed by Chromium's
sandbox. The API runs as the non-root `node` user, with Chromium sandboxing enabled.
Do not substitute privileged containers or `--no-sandbox`.

It also returns ENOSYS (38) for `clone3`, matching Docker's current default
profile, so Bookworm glibc falls back to the permitted `clone` syscall.

The API image installs the browser matching the locked Playwright dependency.
Xvfb provides its display inside the container. The app's authenticated snapshot
endpoint supplies the read-only viewer; no debugging or VNC port is published.
