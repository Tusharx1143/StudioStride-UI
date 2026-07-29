/**
 * StudioStride Express BFF (Backend for Frontend)
 *
 * Handles Strava OAuth token exchange (client secret never reaches the browser),
 * proxies all /api/strava/* requests to the Strava API with the user's access token,
 * and serves the built frontend in production.
 *
 * ── Dev ──  Run alongside `npm run dev` (Vite on :3000).
 *            Vite proxies /api/* requests to this server on :3001.
 *
 * ── Prod ─  `npm run build && npm run start`.
 *            Express serves dist/ as static files and handles /api/* on the same port.
 */

import crypto from "crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import path from "path";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

import "dotenv/config";

const {
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
  APP_URL = "http://localhost:3000",
  PORT = process.env.NODE_ENV === "production" ? (process.env.PORT ?? "8080") : "3001",
  NODE_ENV = "development",
} = process.env;

if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
  console.error(
    "❌ Missing STRAVA_CLIENT_ID and/or STRAVA_CLIENT_SECRET. " +
      "Copy .env.example to .env and fill in your Strava API application credentials."
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_OAUTH_BASE = "https://www.strava.com/oauth";
const REDIRECT_URI = `${APP_URL}/api/auth/callback`;
const SCOPES = "activity:read_all,profile:read_all";
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const TOKEN_REFRESH_MARGIN_S = 60; // refresh if expires_at is within 60 s

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch seconds
  athlete: Record<string, unknown>;
}

interface TokenStoreEntry {
  tokens: TokenSet;
}

// ---------------------------------------------------------------------------
// In-memory token store
// ---------------------------------------------------------------------------

class TokenStore {
  private store = new Map<string, TokenStoreEntry>();

  create(tokens: TokenSet): string {
    const sessionId = crypto.randomUUID();
    this.store.set(sessionId, { tokens });
    return sessionId;
  }

  get(sessionId: string): TokenSet | undefined {
    return this.store.get(sessionId)?.tokens;
  }

  delete(sessionId: string): void {
    this.store.delete(sessionId);
  }

  /** Refresh the access token via Strava if it is close to expiry. */
  async refresh(sessionId: string): Promise<TokenSet | null> {
    const entry = this.store.get(sessionId);
    if (!entry) return null;

    const now = Math.floor(Date.now() / 1000);
    if (entry.tokens.expires_at > now + TOKEN_REFRESH_MARGIN_S) {
      return entry.tokens; // still fresh
    }

    try {
      const res = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: entry.tokens.refresh_token,
        }),
      });

      if (!res.ok) {
        console.warn("Token refresh failed:", res.status, await res.text());
        this.delete(sessionId);
        return null;
      }

      const body = (await res.json()) as TokenSet;
      entry.tokens = body;
      return body;
    } catch (err) {
      console.error("Token refresh error:", err);
      this.delete(sessionId);
      return null;
    }
  }
}

const tokenStore = new TokenStore();

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());

// ── Dev CORS ──────────────────────────────────────────────────────────────

if (NODE_ENV === "development") {
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", APP_URL);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (_req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
}

// ── Simple cookie parser ──────────────────────────────────────────────────

function getCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(name + "=")) {
      return decodeURIComponent(trimmed.slice(name.length + 1));
    }
  }
  return undefined;
}

function setCookie(res: Response, name: string, value: string, maxAgeMs: number): void {
  res.setHeader(
    "Set-Cookie",
    `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}${NODE_ENV === "production" ? "; Secure" : ""}`
  );
}

function clearCookie(res: Response, name: string): void {
  res.setHeader(
    "Set-Cookie",
    `${name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
  );
}

// ---------------------------------------------------------------------------
// Helper: fetch from Strava
// ---------------------------------------------------------------------------

/** Thin wrapper so the name `stravaRes` doesn't collide with Express's Response. */
async function stravaFetch(
  pathname: string,
  queryString: string,
  accessToken: string
): Promise<globalThis.Response> {
  const url = `${STRAVA_API_BASE}${pathname}?${queryString}&access_token=${accessToken}`;
  return fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------

/**
 * GET /api/auth/login
 *
 * Redirect the user to Strava's OAuth authorization page.
 */
app.get("/api/auth/login", (_req: Request, res: Response) => {
  const url = `${STRAVA_OAUTH_BASE}/authorize` +
    `?client_id=${STRAVA_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&approval_prompt=auto` +
    `&scope=${encodeURIComponent(SCOPES)}`;

  res.redirect(302, url);
});

/**
 * GET /api/auth/callback
 *
 * Strava redirects here after the user authorizes (or denies).
 * Exchange the ?code for tokens, create a session, set a cookie,
 * and redirect the browser to the SPA.
 */
app.get("/api/auth/callback", async (req: Request, res: Response) => {
  const { code, error, scope } = req.query;

  if (error) {
    console.warn("OAuth error from Strava:", error);
    res.redirect(302, `/?error=${encodeURIComponent(String(error))}`);
    return;
  }

  if (!code || typeof code !== "string") {
    console.warn("OAuth callback missing code");
    res.redirect(302, "/?error=missing_code");
    return;
  }

  try {
    const exchangeRes = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!exchangeRes.ok) {
      const text = await exchangeRes.text();
      console.error("Token exchange failed:", exchangeRes.status, text);
      res.redirect(302, "/?error=token_exchange_failed");
      return;
    }

    const body = (await exchangeRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
      athlete: Record<string, unknown>;
    };

    const sessionId = tokenStore.create({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_at: body.expires_at,
      athlete: body.athlete,
    });

    setCookie(res, "sid", sessionId, COOKIE_MAX_AGE_MS);
    console.log(`✅ New session ${sessionId.slice(0, 8)}… for athlete ${(body.athlete as Record<string, unknown>)?.id ?? "?"}`);
    res.redirect(302, "/home");
  } catch (err) {
    console.error("Token exchange error:", err);
    res.redirect(302, "/?error=token_exchange_error");
  }
});

/**
 * POST /api/auth/refresh
 *
 * Explicitly refresh the current session's tokens.
 * Used by the client if it detects an auth problem.
 */
app.post("/api/auth/refresh", async (req: Request, res: Response) => {
  const sid = getCookie(req, "sid");
  if (!sid) {
    res.status(401).json({ error: "no_session" });
    return;
  }

  const tokens = await tokenStore.refresh(sid);
  if (!tokens) {
    res.status(401).json({ error: "refresh_failed" });
    return;
  }

  res.json({ status: "ok" });
});

/**
 * POST /api/auth/logout
 *
 * Delete the session and clear the cookie.
 */
app.post("/api/auth/logout", (req: Request, res: Response) => {
  const sid = getCookie(req, "sid");
  if (sid) {
    tokenStore.delete(sid);
    console.log(`🚪 Session ${sid.slice(0, 8)}… logged out`);
  }
  clearCookie(res, "sid");
  res.json({ status: "ok" });
});

// ---------------------------------------------------------------------------
// Strava API proxy
// ---------------------------------------------------------------------------

/**
 * All methods on /api/strava/*
 *
 * 1. Read the sid cookie → resolve TokenSet.
 * 2. If the token is expired, refresh it (one attempt).
 * 3. Forward the request to Strava at /api/v3/{path} with the Bearer token.
 * 4. On 401 from Strava, try a single token refresh + retry.
 * 5. Return the Strava response to the client.
 */
app.all("/api/strava/*", async (req: Request, res: Response) => {
  const sid = getCookie(req, "sid");

  if (!sid) {
    res.status(401).json({ error: "no_session", message: "Not authenticated. Please log in." });
    return;
  }

  let tokens = tokenStore.get(sid);
  if (!tokens) {
    res.status(401).json({ error: "session_expired", message: "Session expired. Please log in again." });
    return;
  }

  // Refresh if close to expiry
  const now = Math.floor(Date.now() / 1000);
  if (tokens.expires_at <= now + TOKEN_REFRESH_MARGIN_S) {
    const refreshed = await tokenStore.refresh(sid);
    if (!refreshed) {
      res.status(401).json({ error: "token_refresh_failed", message: "Token refresh failed. Please log in again." });
      return;
    }
    tokens = refreshed;
  }

  // The part after /api/strava (e.g. /athlete, /athlete/activities, /athletes/123/stats)
  const stravaPath = req.path.replace(/^\/api\/strava/, "") || "/";
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();

  let stravaRes = await stravaFetch(stravaPath, queryString, tokens.access_token);

  // Single retry on 401 (token might have just expired after our check)
  if (stravaRes.status === 401) {
    const refreshed = await tokenStore.refresh(sid);
    if (refreshed) {
      tokens = refreshed;
      stravaRes = await stravaFetch(stravaPath, queryString, tokens.access_token);
    }
  }

  if (!stravaRes.ok) {
    const text = await stravaRes.text();
    console.warn(`Strava API error ${stravaRes.status} for ${stravaPath}:`, text.slice(0, 200));
    res.status(stravaRes.status).json({
      error: "strava_api_error",
      status: stravaRes.status,
      detail: text,
    });
    return;
  }

  const data = await stravaRes.json();
  res.json(data);
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ---------------------------------------------------------------------------
// Production static file serving
// ---------------------------------------------------------------------------

if (NODE_ENV === "production") {
  const distDir = path.resolve(__dirname, "..", "dist");
  app.use(express.static(distDir));

  // SPA fallback — serve index.html for any non-API path
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(distDir, "index.html"));
  });

  console.log(`📦 Serving static files from ${distDir}`);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const port = Number(PORT);
app.listen(port, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║          StudioStride — Express BFF              ║
╠══════════════════════════════════════════════════╣
║  Environment  : ${NODE_ENV.padEnd(18)}║
║  Port         : ${String(port).padEnd(18)}║
║  OAuth callback: ${REDIRECT_URI.padEnd(18)}║${NODE_ENV === "development" ? `\n║  Vite proxy   : :3000 → :${port}${" ".repeat(9)}║` : ""}
╚══════════════════════════════════════════════════╝
  `);
});
