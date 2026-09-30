WA Gateway - Portainer-ready
============================

Purpose
-------
Adapter between an AAA/billing system that can only call a GET/POST URL and OpenWA.

AAA configuration
-----------------
Use POST. Put the destination and message in the URL, and send the gateway key
as a Bearer token. Do not put key= in this URL.

API URL:
https://wa-gateway.openwa.tofan.dev/send?dst={dst}&text={text}

API Method:
POST

POST headers:
Content-Type: application/json
Authorization: Bearer YOUR_GATEWAY_API_KEY

The gateway reads dst and text from the query string or from a JSON or
application/x-www-form-urlencoded body. A manual GET test can still pass the
key in the query string:

https://wa-gateway.openwa.tofan.dev/send?key=YOUR_GATEWAY_API_KEY&dst=9370XXXXXXXXX&text=Auth%20test

Accepted authentication (one is required):
- Authorization: Bearer YOUR_GATEWAY_API_KEY
- X-Gateway-Key: YOUR_GATEWAY_API_KEY
- ?key=YOUR_GATEWAY_API_KEY

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
GET or POST /send

dst and text may be query parameters, a JSON body, or a form body.
Authentication may be a Bearer token, X-Gateway-Key, or the key query parameter.

Security note
-------------
Prefer Authorization: Bearer or X-Gateway-Key. The query-string key remains available
for the manual GET test, but query strings may appear in proxy and access logs.
Use a dedicated random secret and do not reuse your OpenWA API key. Keep HTTPS
enabled in Nginx Proxy Manager.
