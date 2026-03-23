import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Simple cache for dollar rate
  let cachedDollarRate: any = null;
  let lastFetchTime = 0;
  let pendingFetch: Promise<any> | null = null;
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  const FALLBACK_RATE = { USDBRL: { bid: "5.42" } };

  // API routes
  app.get("/api/dollar-rate", async (req, res) => {
    const now = Date.now();
    
    // Return cache if valid
    if (cachedDollarRate && (now - lastFetchTime < CACHE_DURATION)) {
      return res.json(cachedDollarRate);
    }

    // If a fetch is already in progress, wait for it
    if (pendingFetch) {
      try {
        const data = await pendingFetch;
        return res.json(data);
      } catch (e) {
        // If pending fetch failed, we'll try again below or use fallback
      }
    }

    // Start new fetch
    pendingFetch = (async () => {
      try {
        const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        const data = await response.json();
        cachedDollarRate = data;
        lastFetchTime = Date.now();
        return data;
      } catch (error) {
        console.error("Error proxying dollar rate:", error);
        if (cachedDollarRate) {
          console.warn("API failed, using stale cache");
          return cachedDollarRate;
        }
        console.warn("API failed and no cache, using hardcoded fallback");
        return FALLBACK_RATE;
      } finally {
        pendingFetch = null;
      }
    })();

    const result = await pendingFetch;
    res.json(result);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
