import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Root endpoint for service info
app.get('/', (req, res) => {
  res.json({ service: 'vibecheck-render-service', status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`vibecheck-render-service listening on port ${PORT}`);
});
