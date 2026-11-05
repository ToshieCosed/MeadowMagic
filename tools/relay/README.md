# Strata relay (Minecraft compat mode)

Browsers cannot open raw Minecraft TCP connections or call the Xbox/Minecraft login endpoints (no CORS), so compat mode talks to this small relay over WebSocket.

## Run
    cd tools/relay && npm install
    MS_CLIENT_ID=<your Azure app id> node relay.mjs        # ws://localhost:25580

## One-time: get a client id
Register your own app at portal.azure.com -> App registrations: account type "Personal Microsoft accounts only" (or any + personal), platform "Mobile and desktop applications" / enable **Allow public client flows**. No secret is needed. Copy the Application (client) id. (Use your own id; do not reuse another launcher's.)

## What it does
Device-code sign-in -> Xbox Live -> XSTS -> Minecraft services -> profile. Only the player name and UUID reach the browser; tokens stay in the relay process. The Microsoft refresh token is saved to `.relay-auth.json` (git-ignored) so the next sign-in is automatic.

## Tests (no Microsoft account needed)
    node test-auth.mjs       # relay against fake endpoints (mock-ms.mjs)
    python tools/tests/phase24_mcauth.py   # the menu + relay together
The real endpoints have not been exercised yet.
