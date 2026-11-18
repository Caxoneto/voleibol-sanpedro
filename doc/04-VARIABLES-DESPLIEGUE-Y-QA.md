# Variables de Entorno, Despliegue en Netlify y QA

## 1. Variables de Entorno (`process.env`)

> **Seguridad**: Nunca almacenar valores reales en código ni en archivos versionados. En local usar `.env.local` (ignorado por Git) y en producción las *Environment Variables* cifradas de Netlify.

| Variable | Uso | Obligatoria en Prod |
| :--- | :--- | :---: |
| `DATABASE_URL` | Cadena de conexión PostgreSQL Neon (con `-pooler` y `sslmode=require`). | Sí |
| `DATA_ENCRYPTION_KEY` | Clave maestra para cifrado AES-256-GCM y blind index. | Sí |
| `CONSENT_INTEGRITY_SECRET` | Secreto HMAC-SHA256 para sellado probatorio `v1`/`v2`/`v3`. | Sí |
| `OTP_PEPPER` | Pimienta criptográfica para hash de códigos OTP (`otp-v2`). | Sí |
| `ADMIN_SESSION_SECRET` | Secreto de firma para cookies de sesión `/admin/*`. | Sí |
| `INTRANET_SESSION_SECRET` | Secreto de firma para sesiones de la Intranet (obligatoria en prod si distinta de `ADMIN_SESSION_SECRET`). | Opcional |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Credenciales de acceso al panel `/admin/consentimientos`. | Sí |
| `STREAMING_ADMIN_PASSWORD` | Clave de gestión del estado de streaming (`/api/streaming`). | Sí |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (o `ZOHO_SMTP_PASS`) | Salida SMTP oficial (`info@voleibolsanpedro.es`, Zoho Mail EU). | Sí |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciales OAuth2 Google para acceso a la Intranet. | Opcional |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Credenciales OAuth2 Microsoft tenant `common` para acceso a la Intranet. | Opcional |
| `NETLIFY_CRON_SECRET` | Secreto para proteger las tareas programadas de Netlify (avisos de pagos, etc.). | Opcional |
| `CLUB_BANK_IBAN` | IBAN bancario del club para domiciliaciones y avisos de pago. | Opcional |
| `CONSENT_CLUB_CC_EMAIL` | Copia opcional de secretaría en envíos de consentimiento. | Opcional |
| `NEXT_PUBLIC_SITE_URL` | URL base canónica (`https://voleibolsanpedro.es`). | Sí |
| `NEXT_PUBLIC_CLUB_RAED_NUMBER` | Número oficial de inscripción en el **RAED** (Junta de Andalucía). *Pendiente de asignar con el número oficial del club.* | Pendiente |
| `ALLOW_DEMO_PLAYERS` | Muestra jugadores `demo-*` / `p-test-prueba` en local/pruebas (`true`/`false`). | Solo dev |
| `ALLOW_DEV_CONSOLE_OTP` | Loguea OTP en consola en desarrollo si no hay SMTP (`false` en prod). | Solo dev |
| `NETLIFY`, `URL`, `DEPLOY_PRIME_URL` | Variables inyectadas automáticamente por el runtime de Netlify. | Automática |

---

## 2. Almacenamiento Local y Cookies (`localStorage`)

* [`src/components/CookieConsent.tsx`](../src/components/CookieConsent.tsx) utiliza la clave `localStorage` **`cdv_cookie_consent_v2`**.
* La cola offline de asistencia en `/club/asistencia` utiliza la clave **`cdv_attendance_offline_queue_v1`** para sincronización móvil-first.
* El portal emplea únicamente cookies y almacenamiento técnico necesario conforme al **Art. 22.2 LSSI-CE** (sin analítica ni publicidad comportamental).

---

## 3. Particularidades de Netlify y Runtime

* **Zona horaria**: `netlify.toml` define `TZ = "UTC"`. Toda lógica de negocio con fechas, rangos de jornada, filtros de calendario y sellado de horas en PDF/emails debe convertir explícitamente a **`Europe/Madrid`**.
* **Optimización de créditos**:
  * Validar siempre primero en local (`http://localhost:3000`).
  * **Nunca** ejecutar `netlify deploy --prod` tras un `git push` si Auto-Deploy por Git está activo (duplicaría el consumo de créditos).
  * **Nunca** hacer `git push` ni deploy a producción sin aprobación explícita del usuario.

---

## 3. Cookies y Privacidad (`LSSI-CE`)

* [`src/components/CookieConsent.tsx`](../src/components/CookieConsent.tsx) utiliza la clave `localStorage` **`cdv_cookie_consent_v2`**.
* El portal emplea únicamente cookies/almacenamiento técnico necesario (sin analítica ni publicidad comportamental), por lo que el banner es **puramente informativo** conforme al **Art. 22.2 LSSI-CE** (sin toggles ficticios de preferencias).
* Si en el futuro se cambia el texto o esquema de consentimiento de cookies, incrementar siempre la versión de la clave (`_v3`, etc.).

---

## 4. Checklist Técnico Obligatorio de Verificación (Pre-Deploy)

Antes de solicitar o ejecutar un despliegue a producción:

1. **TypeScript y Build**:
   * `npx tsc --noEmit --pretty false` -> exit `0`.
   * `npm run build` -> exit `0` sin errores de tipos, lint ni generación estática. *(Nota: no ejecutar `npm run build` mientras `npm run dev` esté usando `.next` en Windows; parar primero o ejecutarlo en limpio).*
2. **Pruebas de Integridad, PDF y Seguridad API**:
   * Generación de PDF en 1 página A4 (`pdf-consent.ts`) para los 5 perfiles (14–17, blanco, +18, legado mixto, nombres largos) y simetría HMAC `v2`/`v3`.
   * Integridad de censo/consentimientos (`integrityAlerts: 0`).
   * Flujos de OTP por propósito (`SIGN` / `RECEIPT` / `REVOKE`), bloqueo `SHREDDED`, rechazo `400` ante booleanos ausentes y exención de `mode: 'inspect'` en `failBucket`.
   * Pruebas de Intranet (`/acceso`, `/club`, `/mi-club`) con RBAC y cifrado.
3. **QA Visual E2E en Desktop (`1440x900`) y Mobile (`375x812`)**:
   * `scrollWidth <= clientWidth` en todas las rutas públicas, `/autorizaciones`, `/acceso`, `/club`, `/mi-club`, `/privacidad`, `/cookies` y `/admin/consentimientos`.
   * Imágenes cargadas (`naturalWidth > 0`) y `0` errores JS inesperados en consola.
   * Control de red: sin bucles infinitos de `useEffect`/`fetch` en modales o filtros.
