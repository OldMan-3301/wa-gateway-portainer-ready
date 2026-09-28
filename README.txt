PORTAINER DEPLOYMENT

1. Ensure the existing Docker network is named: openwa-network
2. In Portainer: Stacks -> Add stack -> Upload
3. Upload this ZIP file.
4. Set these environment variables in Portainer:
   OPENWA_API_KEY       = your OpenWA API key
   OPENWA_SESSION_ID    = your OpenWA session UUID
   GATEWAY_API_KEY      = a long random secret you create
5. Deploy the stack.

NPM:
Domain: wa-gateway.openwa.tofan.dev
Scheme: http
Forward Hostname/IP: wa-gateway
Forward Port: 3000
Attach NPM to openwa-network.

External API:
GET https://wa-gateway.openwa.tofan.dev/send?dst={dst}&text={text}
Header: X-Gateway-Key: YOUR_GATEWAY_API_KEY

Health:
GET /health
Ready:
GET /ready
