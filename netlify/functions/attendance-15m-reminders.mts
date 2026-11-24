type Config = {
  schedule: string;
};

export const config: Config = {
  schedule: '*/5 7-23 * * *',
};

export default async function handler(): Promise<Response> {
  const rawBaseUrl =
    process.env.URL?.trim() ||
    process.env.DEPLOY_PRIME_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'https://voleibolsanpedro.es';

  const baseUrl = rawBaseUrl.replace(/\/+$/, '');
  const endpoint = `${baseUrl}/api/intranet/attendance/check-reminders`;

  const cronSecret = process.env.NETLIFY_CRON_SECRET?.trim() || '';
  if (!cronSecret) {
    console.error('[attendance-15m-reminders] Falta la variable de entorno NETLIFY_CRON_SECRET.');
    return new Response(
      JSON.stringify({ ok: false, error: 'NETLIFY_CRON_SECRET no configurado' }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-cron-secret': cronSecret,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
    });

    const bodyText = await res.text().catch(() => '');
    return new Response(
      JSON.stringify({
        ok: res.ok,
        status: res.status,
        endpoint,
        responsePreview: bodyText.slice(0, 500),
      }),
      {
        status: res.ok ? 200 : 502,
        headers: { 'content-type': 'application/json' },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error invocando check-reminders';
    return new Response(
      JSON.stringify({
        ok: false,
        endpoint,
        error: message,
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
