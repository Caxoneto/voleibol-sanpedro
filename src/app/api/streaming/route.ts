import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FIXED_PASSWORD = process.env.STREAMING_ADMIN_PASSWORD || 'yovoley2026';

interface StreamingPayload {
  active: boolean;
  url: string | null;
  startedAt?: string;
}

// Fallback en memoria en caso de no disponer de DATABASE_URL o desconexión
let memoryFallbackState: StreamingPayload = {
  active: false,
  url: null,
};

async function queryNeon<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const hostMatch = connectionString.match(/@([^/:]+)/);
    const host = hostMatch ? hostMatch[1] : 'ep-dark-term-b40s456o-pooler.c-6.us-east-2.aws.neon.tech';

    const res = await fetch(`https://${host}/sql`, {
      method: 'POST',
      headers: {
        'Neon-Connection-String': connectionString,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, params }),
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn('[Streaming API] Fallo al consultar Neon HTTP:', res.status);
      return [];
    }

    const data = await res.json();
    return (data.rows as T[]) || [];
  } catch (err) {
    console.warn('[Streaming API] Aviso conectando con Neon (usando fallback en memoria):', err);
    return [];
  }
}

// GET: Obtener estado actual del streaming
export async function GET() {
  try {
    const rows = await queryNeon<{ key: string; value: unknown }>(
      'SELECT value FROM club_settings WHERE key = $1 LIMIT 1;',
      ['streaming']
    );

    if (rows.length > 0 && rows[0].value) {
      try {
        const val = rows[0].value;
        const parsed =
          typeof val === 'string'
            ? (JSON.parse(val) as StreamingPayload)
            : (val as StreamingPayload);

        if (parsed && typeof parsed === 'object') {
          memoryFallbackState = parsed;
          return NextResponse.json(
            {
              success: true,
              active: !!parsed.active,
              url: parsed.url || null,
              startedAt: parsed.startedAt,
            },
            {
              headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'X-Content-Type-Options': 'nosniff',
              },
            }
          );
        }
      } catch (parseErr) {
        console.error('[Streaming API] Error parseando JSON de Neon:', parseErr);
      }
    }

    // Fallback a memoria
    return NextResponse.json(
      {
        success: true,
        active: memoryFallbackState.active,
        url: memoryFallbackState.url,
        startedAt: memoryFallbackState.startedAt,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (error) {
    console.warn('[Streaming API] Error en GET recuperado con fallback:', error);
    return NextResponse.json(
      {
        success: true,
        active: memoryFallbackState.active,
        url: memoryFallbackState.url,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }
}

// POST: Iniciar o detener la retransmisión
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || (body.url ? 'start' : 'stop');

    if (action === 'start') {
      const { url, password } = body;

      // Validación de contraseña fija
      if (!password || password !== FIXED_PASSWORD) {
        return NextResponse.json(
          {
            success: false,
            error: 'Contraseña de autorización incorrecta.',
          },
          { status: 401 }
        );
      }

      // Validación de URL de YouTube
      if (!url || typeof url !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: 'Debes proporcionar una URL válida de YouTube.',
          },
          { status: 400 }
        );
      }

      const trimmedUrl = url.trim();
      const isYoutube =
        trimmedUrl.includes('youtube.com') ||
        trimmedUrl.includes('youtu.be') ||
        trimmedUrl.startsWith('https://');

      if (!isYoutube) {
        return NextResponse.json(
          {
            success: false,
            error: 'El enlace debe pertenecer a una emisión o vídeo de YouTube.',
          },
          { status: 400 }
        );
      }

      const newState: StreamingPayload = {
        active: true,
        url: trimmedUrl,
        startedAt: new Date().toISOString(),
      };

      // Guardar en Neon
      await queryNeon(
        `INSERT INTO club_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
        ['streaming', JSON.stringify(newState)]
      );

      memoryFallbackState = newState;

      return NextResponse.json({
        success: true,
        message: 'Retransmisión iniciada correctamente.',
        active: true,
        url: trimmedUrl,
        startedAt: newState.startedAt,
      });
    }

    if (action === 'stop') {
      const { password } = body;

      // Validación de contraseña para finalizar
      if (!password || password !== FIXED_PASSWORD) {
        return NextResponse.json(
          {
            success: false,
            error: 'Contraseña de autorización incorrecta.',
          },
          { status: 401 }
        );
      }

      const newState: StreamingPayload = {
        active: false,
        url: null,
      };

      // Guardar en Neon
      await queryNeon(
        `INSERT INTO club_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
        ['streaming', JSON.stringify(newState)]
      );

      memoryFallbackState = newState;

      return NextResponse.json({
        success: true,
        message: 'Retransmisión finalizada correctamente.',
        active: false,
        url: null,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Acción no reconocida.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Streaming API] Error en POST:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor procesando la solicitud.' },
      { status: 500 }
    );
  }
}
