import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';

/**
 * Runs the same logic as the Vercel serverless functions in `api/*.ts`
 * directly inside the Vite dev server, so the SMTP admin page works in
 * local/preview dev (`vite --host`) — not only after a real Vercel deploy.
 *
 * Once deployed to Vercel, this plugin is inert (dev-only via `apply: 'serve'`)
 * and the actual `api/*.ts` serverless functions take over unchanged.
 */

/** Routes whose handler signature is `(authHeader, body)` — admin-protected endpoints. */
const AUTHED_ROUTES: Record<string, keyof Awaited<ReturnType<ViteDevServer['ssrLoadModule']>>> = {
  '/api/send-email': 'handleSendEmail',
  '/api/verify-smtp': 'handleVerifySmtp',
  '/api/check-dns': 'handleCheckDns',
};

/** Routes whose handler signature is `(body)` only — public, unauthenticated endpoints. */
const PUBLIC_ROUTES: Record<string, keyof Awaited<ReturnType<ViteDevServer['ssrLoadModule']>>> = {
  '/api/voices': 'handleVoices',
  '/api/text-to-voice': 'handleTextToVoice',
  '/api/send-verification-code': 'handleSendVerificationCode',
  '/api/verify-code': 'handleVerifyCode',
  '/api/send-reset-code': 'handleSendResetCode',
  '/api/verify-reset-code': 'handleVerifyResetCode',
  '/api/reset-password': 'handleResetPassword',
};

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        const isAuthed = url && url in AUTHED_ROUTES;
        const isPublic = url && url in PUBLIC_ROUTES;
        if (!url || (!isAuthed && !isPublic)) return next();

        if (url === '/api/text-to-voice' && req.method === 'POST') {
          try {
            const body = await readJsonBody(req);
            const upstream = await fetch('https://littlevoiceapi.littleblog.online/text-to-voice', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
            return sendJson(res, upstream.status, await upstream.json());
          } catch (error) {
            return sendJson(res, 502, { error: error instanceof Error ? error.message : 'Text-to-voice API unavailable.' });
          }
        }
        if (url === '/api/voices' && req.method === 'GET') {
          try {
            const language = new URL(req.url ?? '/', 'http://localhost').searchParams.get('language') ?? 'bn';
            const upstream = await fetch(`https://littlevoiceapi.littleblog.online/api/voices?language=${encodeURIComponent(language)}`, { headers: { Accept: 'application/json' } });
            return sendJson(res, upstream.status, await upstream.json());
          } catch (error) {
            return sendJson(res, 502, { error: error instanceof Error ? error.message : 'Voice API unavailable.' });
          }
        }
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });

        try {
          const mod = await server.ssrLoadModule('/api/_lib/handlers.ts');
          const body = await readJsonBody(req);

          if (isAuthed) {
            const handlerName = AUTHED_ROUTES[url];
            const handlerFn = mod[handlerName] as (
              authHeader: string | null | undefined,
              body: Record<string, unknown>,
            ) => Promise<{ status: number; body: unknown }>;
            const authHeader = (req.headers.authorization as string | undefined) ?? null;
            const { status, body: responseBody } = await handlerFn(authHeader, body);
            return sendJson(res, status, responseBody);
          }

          const handlerName = PUBLIC_ROUTES[url];
          const handlerFn = mod[handlerName] as (
            body: Record<string, unknown>,
          ) => Promise<{ status: number; body: unknown }>;
          const { status, body: responseBody } = await handlerFn(body);
          return sendJson(res, status, responseBody);
        } catch (err) {
          console.error('[api-dev-server]', err);
          sendJson(res, 500, { error: err instanceof Error ? err.message : 'Internal server error.' });
        }
      });
    },
  };
}
