# vibecheck-mockup

Mock extraction service for VibeCheck live demo.

## Setup & Run

```bash
npm install
npm start
```

Runs by default on port `3001` (or `process.env.PORT`).

## Endpoints

- `GET /health`: Health check endpoint.
- `POST /render-extract`: Accepts a non-empty `html` string and returns the hardcoded JSON extraction schema after a 500 ms mock processing delay.

Example request:

```bash
curl -X POST http://localhost:3001/render-extract \
  -H "Content-Type: application/json" \
  -d "{\"html\":\"<main>Login</main>\"}"
```

The service can be checked with the example request above.
