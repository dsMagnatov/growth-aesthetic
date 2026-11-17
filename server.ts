import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Readable } from "stream";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy endpoint to stream Google Drive video smoothly with perfect seeking / range headers
  app.get("/api/video", async (req, res) => {
    const fileId = (req.query.id as string) || "1X94O9QFML--SHmmXLKklcwBKHzgLBd6I";
    try {
      const initialUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      console.log(`[Proxy] Fetching Google Drive metadata for ID: ${fileId}...`);
      const response = await fetch(initialUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      const contentType = response.headers.get("content-type") || "";
      let downloadUrl = initialUrl;
      
      // Safe check for Set-Cookie header array
      const setCookieHeaders = typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : [];
      
      if (contentType.includes("text/html")) {
        const html = await response.text();
        const confirmMatch = html.match(/confirm=([a-zA-Z0-9_\-]+)/);
        if (confirmMatch && confirmMatch[1]) {
          const token = confirmMatch[1];
          downloadUrl = `https://drive.google.com/uc?export=download&confirm=${token}&id=${fileId}`;
          console.log(`[Proxy] Successfully bypassed Drive safety confirmation. Token: ${token}`);
        } else {
          const formMatch = html.match(/name="confirm"\s+value="([^"]+)"/);
          if (formMatch && formMatch[1]) {
            const token = formMatch[1];
            downloadUrl = `https://drive.google.com/uc?export=download&confirm=${token}&id=${fileId}`;
            console.log(`[Proxy] Bypassed with form confirmation key: ${token}`);
          }
        }
      }

      // Prepare headers for the final stream request
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };

      if (setCookieHeaders.length > 0) {
        headers['Cookie'] = setCookieHeaders.map(c => c.split(';')[0]).join('; ');
      }

      // Forward client's HTTP Range header to support scrolling/scrubbing seeks
      const range = req.headers.range;
      if (range) {
        headers['Range'] = range;
        console.log(`[Proxy] Forwarding Range header: ${range}`);
      }

      const streamResp = await fetch(downloadUrl, { headers });

      // Match & copy critical response headers back to browser
      const proxyHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges'
      ];

      res.status(streamResp.status);
      proxyHeaders.forEach(h => {
        const val = streamResp.headers.get(h);
        if (val) {
          res.setHeader(h, val);
        }
      });

      // Default safe header values if omitted by host
      if (!res.getHeader('content-type')) {
        res.setHeader('content-type', 'video/mp4');
      }
      if (!res.getHeader('accept-ranges')) {
        res.setHeader('accept-ranges', 'bytes');
      }

      if (streamResp.body) {
        // Stream chunks flawlessly to client
        const reader = streamResp.body.getReader();
        const stream = new ReadableStream({
          async start(controller) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.close();
          }
        });
        
        const nodeStream = Readable.fromWeb(stream as any);
        nodeStream.pipe(res);
      } else {
        res.status(500).send("Source stream streamResp.body is undefined");
      }
    } catch (err: any) {
      console.error("[Proxy Fatal Error]", err);
      res.status(500).send(`Unable to load Google Drive Video resources: ${err.message}`);
    }
  });

  // Serve static UI / Vite middleware
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
    console.log(`Server fully operational on http://localhost:${PORT}`);
  });
}

startServer();
