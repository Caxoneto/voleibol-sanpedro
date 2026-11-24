type Config = {
  schedule: string;
};

export const config: Config = {
  schedule: '0 9 6-10 * *',
};

export default async function handler() {
  const baseUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.NEXT_PUBLIC_SITE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const cronSecret = process.env.NETLIFY_CRON_SECRET?.trim() || '';

  if (!baseUrl) {
    console.error('[monthly-payment-reminders] Falta la variable de entorno URL.');
    return new Response(JSON.stringify({ ok: false, error: 'Missing URL' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!cronSecret) {
    console.error('[monthly-payment-reminders] Falta la variable de entorno NETLIFY_CRON_SECRET.');
    return new Response(
      JSON.stringify({ ok: false, error: 'NETLIFY_CRON_SECRET no configurado' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const endpoint = `${baseUrl}/api/intranet/payments/send-reminders`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret,
      },
      body: JSON.stringify({ mode: 'monthly_overdue' }),
    });

    const bodyText = await res.text();
    if (!res.ok) {
      console.error(`[monthly-payment-reminders] Error HTTP ${res.status}: ${bodyText}`);
      return new Response(bodyText, {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[monthly-payment-reminders] Recordatorios mensuales procesados: ${bodyText}`);
    return new Response(bodyText, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[monthly-payment-reminders] Error al invocar send-reminders:', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Fetch failed invoking send-reminders' }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
