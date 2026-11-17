import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Readable } from "stream";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Cache resolved Google Drive download URLs and cookies per fileId to avoid
  // double-fetching Drive HTML on every HTTP Range seek request
  const driveResolveCache = new Map<
    string,
    { downloadUrl: string; cookie: string; expiresAt: number }
  >();
  const CACHE_TTL_MS = 10 * 60 * 1000;
  const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  async function resolveDriveDownload(fileId: string) {
    const cached = driveResolveCache.get(fileId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    const initialUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    console.log(`[Proxy] Resolving Google Drive URL for ID: ${fileId}...`);
    const response = await fetch(initialUrl, {
      headers: { "User-Agent": USER_AGENT },
    });

    const contentType = response.headers.get("content-type") || "";
    let downloadUrl = initialUrl;

    const setCookieHeaders =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [];
    const cookie =
      setCookieHeaders.length > 0
        ? setCookieHeaders.map((c) => c.split(";")[0]).join("; ")
        : "";

    if (contentType.includes("text/html")) {
      const html = await response.text();
      const confirmMatch = html.match(/confirm=([a-zA-Z0-9_\-]+)/);
      if (confirmMatch && confirmMatch[1]) {
        downloadUrl = `https://drive.google.com/uc?export=download&confirm=${confirmMatch[1]}&id=${fileId}`;
      } else {
        const formMatch = html.match(/name="confirm"\s+value="([^"]+)"/);
        if (formMatch && formMatch[1]) {
          downloadUrl = `https://drive.google.com/uc?export=download&confirm=${formMatch[1]}&id=${fileId}`;
        }
      }
    } else {
      // Cancel unused body so socket can be reused
      await response.body?.cancel().catch(() => {});
    }

    const resolved = {
      downloadUrl,
      cookie,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    driveResolveCache.set(fileId, resolved);
    return resolved;
  }

  // Proxy endpoint to stream Google Drive video smoothly with perfect seeking / range headers
  app.get("/api/video", async (req, res) => {
    const fileId = (req.query.id as string) || "1X94O9QFML--SHmmXLKklcwBKHzgLBd6I";
    const abortController = new AbortController();
    req.on("close", () => {
      abortController.abort();
    });

    try {
      let resolved = await resolveDriveDownload(fileId);

      const makeStreamRequest = async (target: {
        downloadUrl: string;
        cookie: string;
      }) => {
        const headers: Record<string, string> = {
          "User-Agent": USER_AGENT,
        };
        if (target.cookie) {
          headers["Cookie"] = target.cookie;
        }
        if (req.headers.range) {
          headers["Range"] = req.headers.range;
        }
        return fetch(target.downloadUrl, {
          headers,
          signal: abortController.signal,
        });
      };

      let streamResp = await makeStreamRequest(resolved);
      const respContentType = streamResp.headers.get("content-type") || "";

      // If cached token expired and Drive returned HTML or 403, re-resolve once
      if (respContentType.includes("text/html") || streamResp.status >= 400) {
        await streamResp.body?.cancel().catch(() => {});
        driveResolveCache.delete(fileId);
        resolved = await resolveDriveDownload(fileId);
        streamResp = await makeStreamRequest(resolved);
      }

      if (abortController.signal.aborted) {
        await streamResp.body?.cancel().catch(() => {});
        return;
      }

      const finalContentType = streamResp.headers.get("content-type") || "";
      if (finalContentType.includes("text/html")) {
        await streamResp.body?.cancel().catch(() => {});
        res.status(502).send("Google Drive returned HTML instead of video stream");
        return;
      }

      const proxyHeaders = [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
      ];

      res.status(streamResp.status);
      proxyHeaders.forEach((h) => {
        const val = streamResp.headers.get(h);
        if (val) {
          res.setHeader(h, val);
        }
      });

      if (!res.getHeader("content-type")) {
        res.setHeader("content-type", "video/mp4");
      }
      if (!res.getHeader("accept-ranges")) {
        res.setHeader("accept-ranges", "bytes");
      }
      res.setHeader("Cache-Control", "public, max-age=3600");

      if (streamResp.body) {
        const nodeStream = Readable.fromWeb(streamResp.body as any);
        nodeStream.on("error", () => {
          if (!res.headersSent) {
            res.status(500).end();
          } else {
            res.end();
          }
        });
        req.on("close", () => {
          nodeStream.destroy();
        });
        nodeStream.pipe(res);
      } else {
        res.status(500).send("Source stream streamResp.body is undefined");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return;
      }
      console.error("[Proxy Fatal Error]", err);
      if (!res.headersSent) {
        res.status(500).send(`Unable to load Google Drive Video resources: ${err.message}`);
      }
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
