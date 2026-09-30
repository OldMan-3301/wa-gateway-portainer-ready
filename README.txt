WA Gateway - Portainer-ready
============================

Purpose
-------
Adapter between an AAA/billing system that can only call a GET/POST URL and OpenWA.

AAA configuration
-----------------
SMS API Url:
https://wa-gateway.openwa.tofan.dev/send?

API Method:
POST

POST Parameters:
auth_key = YOUR_GATEWAY_API_KEY
dst = {dst}
text = {text}
country_code = 93

Use 93 for Afghanistan. Change country_code if the customers use another
country. Click Save before Test.

The gateway also accepts dst and text from the query string, a JSON body, or
a form body. A manual GET test can still pass the key in the query string:

https://wa-gateway.openwa.tofan.dev/send?key=YOUR_GATEWAY_API_KEY&dst=9370XXXXXXXXX&text=Auth%20test

Accepted authentication (one is required):
- POST field auth_key
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

dst, text, and country_code may be query parameters, a JSON body, or a form body.
Authentication may be the auth_key field, a Bearer token, X-Gateway-Key, or the key query parameter.

Security note
-------------
Prefer Authorization: Bearer or X-Gateway-Key. The query-string key remains available
for the manual GET test, but query strings may appear in proxy and access logs.
Use a dedicated random secret and do not reuse your OpenWA API key. Keep HTTPS
enabled in Nginx Proxy Manager.
