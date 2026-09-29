WA Gateway - Portainer-ready
============================

Purpose
-------
Adapter between an AAA/billing system that can only call a GET/POST URL and OpenWA.

AAA configuration
-----------------
Use:

API URL:
https://wa-gateway.openwa.tofan.dev/send?key=YOUR_GATEWAY_API_KEY&dst={dst}&text={text}

API Method:
GET

The gateway accepts the authentication secret in the `key` query parameter.
It also continues to accept the X-Gateway-Key header or Bearer token.

IMPORTANT: use a URL-safe gateway key. Generate one with:
openssl rand -hex 32

Portainer environment variables
--------------------------------
OPENWA_API_KEY       Existing OpenWA API key
OPENWA_SESSION_ID    UUID of the active OpenWA session
GATEWAY_API_KEY      New random secret shared with the AAA server

Do NOT put real secrets in GitHub.

Network
-------
The gateway uses the existing external Docker network `openwa-network` and connects
internally to `http://openwa-api:2785`. No host port is published.

Endpoints
---------
GET /health
GET /ready
GET /send?key=...&dst=...&text=...
POST /send?key=... with JSON body {"dst":"...","text":"..."}

Security note
-------------
The query-string key is supported because the upstream AAA service does not provide
custom HTTP headers. Query strings may appear in proxy/access logs, so use a dedicated
random secret and do not reuse your OpenWA API key. Keep HTTPS enabled in Nginx Proxy
Manager. If the AAA service later supports custom headers, prefer X-Gateway-Key.
