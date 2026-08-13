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
- `POST /render-extract`: Returns hardcoded JSON extraction schema.
