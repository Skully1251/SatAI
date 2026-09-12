/**
 * Sat AI — spatial analysis backend.
 *
 * Serves the map XAI contract defined in /backend/shared. Run with:
 *   npm run dev   (watch mode, http://localhost:4000)
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { analyzeRouter } from './routes/analyze';

const PORT = Number(process.env.PORT ?? 4000);

const app = express();

app.use(cors()); // the Expo web dev server runs on a different port
app.use(express.json({ limit: '1mb' })); // drawn regions are small payloads

app.use(analyzeRouter);

app.listen(PORT, () => {
  console.log(`🌿 Sat AI spatial-analysis backend listening on http://localhost:${PORT}`);
  console.log(`   POST /v1/map/analyze   GET /health`);
});
