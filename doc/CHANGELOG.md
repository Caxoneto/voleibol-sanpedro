# Changelog de Arquitectura, Normativa y Correcciones

Este registro documenta el estado consolidado del proyecto y los cambios recientes para evitar que futuros agentes reviertan decisiones ya consensuadas.

---

## 2026-11-24 — Remediación Integral: Seguridad (F-01 a F-10), Web/SEO/Rendimiento y Sistema de Diseño Impeccable

* **Seguridad de Autenticación y OAuth (`src/app/acceso/page.tsx`, `api/intranet/auth/*`)**:
  * Desactivación definitiva y bloqueo de Microsoft OAuth multi-tenant (`tenant common`), dejando **Google OAuth** como único proveedor externo activo junto a correo/usuario + contraseña y enlace mágico SMTP.
  * Helper compartido `isMemberBlockedByPendingApproval` aplicado uniformemente en login, enlace mágico y callback de Google OAuth; protección anti-DoS en login y endurecimiento de endpoints cron (`check-reminders`, `payments/send-reminders`) rechazando con `401` cualquier `x-cron-secret` inválido sin fallback a sesión.
* **Cifrado RGPD y Solicitudes de Auto-Inscripción (`src/app/api/intranet/registration/*`, `src/lib/consent-store.ts`)**:
  * Añadida la columna `pending_payload_enc` en `intranet_registration_requests` (cifrado AES-256-GCM con AAD `reg_pending:<athleteId>`) para aislar los datos propuestos de auto-registro hasta su aprobación administrativa (`approve_registration`) sin corromper censo ni consentimientos activos.
  * Generación de tokens de enlaces de categoría con `>= 128` bits (`crypto.randomBytes(16).toString('base64url')`).
  * Endurecimiento de `shredPlayerCryptoKey()` (Art. 17 RGPD) para purgar y anonimizar atómicamente también `intranet_athletes` (`status = 'SHREDDED'`), `intranet_sessions`, `intranet_guardianships`, `intranet_athlete_teams`, `intranet_registration_requests` y PII de pagador en `intranet_enrollments` conservando importes contables y respetando las bitácoras WORM.
* **SEO, Rendimiento y Optimizaciones de Cliente (`src/app/noticias/[slug]`, `src/lib/public-content.ts`, `layout.tsx`, `sitemap.ts`, `robots.ts`, `next.config.mjs`)**:
  * Conversión de `/noticias/[slug]` a **Server Component** (`generateStaticParams`, `generateMetadata`, JSON-LD `NewsArticle`, `lucide-react` a través de `CopyLinkButton`).
  * Nuevo módulo seguro para cliente `src/lib/public-content.ts` (editorial, patrocinadores, cánticos y wallpapers sin arrastrar dependencias de servidor).
  * Nuevos `layout.tsx` de metadatos SEO (`canonical` + `openGraph`) en las 8 rutas públicas cliente y `robots: { index: false, follow: false }` en rutas privadas y de autenticación; sitemap ampliado con `/proteccion-menor`, `robots.ts` y `netlify.toml` con directivas `Disallow` / `X-Robots-Tag: noindex, nofollow` para `/club/`, `/mi-club/`, `/acceso`, `/inscripcion/` y `/api/intranet/*`, `Referrer-Policy: no-referrer` en `/autorizaciones`, `/inscripcion`, `/acceso`, y dominio `https://www.ligaafade.es` añadido a CSP y `remotePatterns`.
  * Optimización de imágenes en origen con `sharp` manteniendo `images: { unoptimized: true }` (0 créditos CDN Netlify).
* **Accesibilidad Impeccable y Componentes UI (`IntranetModal`, `CategoryTeamSelectorBar`, formularios)**:
  * Focus trap, retorno de foco y geometría brutalista `0px` (`shadow-brutal-dark`) en modales y paneles clave.
  * Asociación estricta `<label htmlFor>` en formularios de `/mi-club*` y `/club/*`, prevención de modificación de mayoría de edad por menores y aislamiento de alcance `EQUIPO`.

## 2026-11-19 — Soporte de inicio de sesión por nombre de usuario en `/acceso`

* **Cambio**: `/acceso` (`#login-email` como `type="text"`) y `POST /api/intranet/auth/login` permiten ahora iniciar sesión tanto mediante correo electrónico como mediante nombre de usuario/alias local registrado en `intranet_users` manteniendo el rate limiting por IP y por identificador.

---

## 2026-11-18 (Rev. Seguridad) — Auditoría `/security-audit` y Endurecimiento de la Intranet

* **Control de Acceso y Ámbitos RBAC (`src/lib/intranet/rbac.ts`, `auth/me`, `census`, `ClubShell`)**:
  * Restringida la evaluación de `grant.scope === 'PROPIO'` en `can()` para exigir `athleteId` o `targetUserId` (permitiendo invocación sin sujeto solo en autogestión de staff `substitution.request`), impidiendo escaladas implícitas sobre módulos de staff.
  * Exigido `ctx.isStaff` y alcance efectivo válido en `GET /api/intranet/census`; `/api/intranet/auth/me` expone `staffEffectivePermissions` y `effectivePermissionScopes` filtrados para `ClubShell`.
  * Añadida verificación por equipo sobre expediciones existentes en `upsert_staff_trip` y `delete_staff_trip` (`src/app/api/intranet/trips/route.ts`).
* **Autenticación, Enlaces Mágicos, Invitaciones y OAuth2 (`src/lib/intranet/auth.ts`, `magic`, `invite`, `oauth`, `acceso`)**:
  * Enlaces mágicos apuntando a `/acceso?magic=` y canje exclusivo vía `POST /api/intranet/auth/magic` (`action: 'consume'`) inmune a prefetching `GET` de escáneres de correo, con auditoría `LOGIN_MAGIC_LINK`. `GET /api/intranet/auth/magic` redirige sin consumir el token.
  * Unificada la activación atómica (`claimAndApplyInvitation`) para invitaciones por contraseña y por OAuth2 (incluyendo cuentas pre-creadas `INVITED`, asignación `intranet_team_staff`, `intranet_athletes` / `intranet_guardianships` y revocación de sesiones al cambiar contraseña).
  * Cifrado/autenticación AES-256-GCM de la cookie `cdv_oauth_tx` (`sealOAuthTxCookie` / `unsealOAuthTxCookie`), rate limit por IP y por cuenta en `login`, `magic`, `invite` y `oauth/callback`.
  * Bloqueo explícito (`403`) del endpoint residual `/api/intranet/auth/2fa` mientras 2FA permanezca desactivado.
* **Gobernanza, Pagos, Errores y CSV (`gov`, `payments.ts`, `api-helpers.ts`, `csv-utils.ts`)**:
  * Traspaso de presidencia (`transfer_presidency`) ejecutado en único CTE atómico con rate limit y validación de miembro activo de staff.
  * Validación estricta de pertenencia `athlete_id`, estado abierto y suma de imputaciones en `recordManualPayment` para impedir IDOR financiero cruzado entre deportistas.
  * Sanitización estricta en `handleIntranetApiError` evitando exponer mensajes internos o `NeonDbError` en respuestas `500`, escape HTML en correos de invitación y ampliación anti-Formula Injection CSV (`/^[\\s]*[=+\\-@\\t\\r\\n|]/`).

---

## 2026-11-18 — Sistema Interno de Club (/club), Acceso (/acceso) y Zona de Deportistas (/mi-club)

* **Resumen**: Implementación completa de la Intranet del Club (`/club`), Acceso unificado (`/acceso`) y Zona de Deportistas (`/mi-club`) en la rama `feature/intranet-club` utilizando Neon branch `dev-intranet`.
* **Módulos y Utilidades (`src/lib/intranet/`)**: Añadidos `catalog.ts`, `csv-utils.ts` (con protección contra formula injection `=, +, -, @, \t, \r` y BOM UTF-8), `seed-bootstrap.ts`, `audit.ts`, `rbac.ts`, `auth.ts`, `api-helpers.ts`, `census-sync.ts`, `payments.ts` y `pdf-receipt.ts`.
* **Esquema de Base de Datos (`prisma/schema.prisma`)**: Tablas `intranet_*` para identidad, RBAC, permisos, sesiones, invitaciones, estructura deportiva, censo unificado, asistencia con cola offline (`cdv_attendance_offline_queue_v1`), sustituciones, desplazamientos y pagos.
* **Componentes y UI**:
  * `/acceso`: Acceso con contraseña, enlace mágico SMTP, OAuth2 Google/Microsoft tenant `common`, invitaciones `?invite=` y bootstrap de Presidencia (acceso sin 2FA por decisión del club).
  * `/club`: Intranet por roles y matriz de 40 permisos configurables por Presidencia, gestión de censo, asistencia móvil-first, sustituciones, cuadrantes de partidos, pagos y recibos PDF.
  * `/mi-club`: Portal familiar y de deportistas (incluyendo 14–17 años) para fichas, firma/renovación RGPD y consulta de pagos y recibos en solo lectura.
  * Actualización de `Navbar.tsx` (enlace `/acceso` sustituyendo a FeelSports) y `Footer.tsx` (pie legal compacto en `/club` y `/mi-club`).
  * `src/middleware.ts`: Cabeceras de seguridad `no-store`/`noindex` para proteger `/acceso`, `/club`, `/mi-club` y `/api/intranet/*`.

---

## 2026-11-17 — Aviso informativo RGPD en Actas con Menores Anonimizados

* **Diagnóstico**: El refresco en vivo (`/api/favb/match/[id]` -> `updateMatchLiveScore`) sí sincroniza dorsales, capitanes y staff desde `favoley.net`, pero los nombres de jugadoras menores sin autorización `ACTIVE` (`consent_social_media = true`) aparecen anonimizados como `Deportista #dorsal` por la regla obligatoria `default-deny` (RGPD/LOPDGDD).
* **Cambio**: Añadido aviso contextual en [`src/components/MatchActaModal.tsx`](../src/components/MatchActaModal.tsx) cuando hay jugadoras anonimizadas (`Deportista #`), aclarando el motivo de privacidad y enlazando a `/autorizaciones` para nuestro club.

---

## 2026-11-16 — Estado Consolidado y Limpieza Final

### Documentación para Agentes (`doc/` y `AGENTS.md`)
* Creada la carpeta `doc/` (`00-INDEX-AGENTES.md`, `01-ARQUITECTURA-Y-RUTAS.md`, `02-BASE-DE-DATOS-Y-CRIPTOGRAFIA.md`, `03-AUTORIZACIONES-NORMATIVA-Y-FLUJOS.md`, `04-VARIABLES-DESPLIEGUE-Y-QA.md`, `CHANGELOG.md`) y `AGENTS.md` en la raíz como punto de entrada obligatorio para LLMs/agentes.

### Eliminación de etiquetas visibles "Anexo 05" / "Anexo 06"
* **Motivo**: Evitar jerga burocrática innecesaria en interfaz, tabla admin, CSV, correos y PDF, manteniendo la referencia normativa real (*Orden de 18 de noviembre de 2024, BOJA núm. 229*) en la base jurídica.
* **Archivos**: `src/app/admin/consentimientos/page.tsx`, `src/app/autorizaciones/page.tsx`, `src/lib/email-otp.ts`, `src/lib/pdf-consent.ts`, `src/app/privacidad/page.tsx`, `src/app/api/consent/submit/route.ts`, `src/app/api/admin/consent/route.ts`.

### Reset de jugadores de prueba en Neon
* Rehabilitados los **11 jugadores de prueba** (`demo-cm-1..5`, `demo-sf-1..5`, `p-test-prueba`) a estado pendiente (`player_consents`, `player_crypto_keys` y `otp_challenges` limpiados), restaurando `dni_last5` y `birth_date` en `demo-cm-1` (`0001R`, `10/03/2011`) y `demo-cm-3` (`0003A`, `20/06/2010`) manteniendo intacta la tabla inmutable `player_consents_audit`.

### Auditoría Multidisciplinar Consolidada (Legal, AppSec/Backend, UX/PDF/Admin)
* **Neon DDL**:
  * Añadidas `purpose`, `verified_at` a `otp_challenges`.
  * Añadidas `is_minor_14_to_17`, `otp_challenge_id`, `otp_verified_at` a `player_consents` y `player_consents_audit`.
  * Creado índice único `idx_fanvote_match_ip` en `"FanVote"` y migrado `/api/public/mvp-vote` a `ON CONFLICT ("matchId", "ipHash") DO NOTHING`.
* **Seguridad, OTP y Criptografía (`v3`)**:
  * Vinculación criptográfica de `purpose` (`SIGN` | `REVOKE` | `RECEIPT`) en `otp-v2:${purpose}:...` y exigencia de `verified_at IS NOT NULL`.
  * Integridad `v3` en `consent-store.ts` manteniendo retrocompatibilidad `v1`/`v2`.
  * Bloqueo estricto `SHREDDED` (Art. 17 RGPD), bloqueo de nombre `+18` en backend y UI (`readOnly`), TTL de `verificationToken` ampliado a 20 minutos, exención de `mode: 'inspect'` del `failBucket` y preservación de `dni_last5` al editar censo sin reintroducir DNI.
  * Soporte `directToken` en `/api/consent/revoke` y Paso 1B dual (`RECEIPT` vs `REVOKE`) en `/autorizaciones`.
  * Endurecimiento de pasaporte en `src/lib/validators.ts`.
* **Privacidad, PDF y Vistas Públicas**:
  * Anonimización de menores en `/api/favb/match/[id]` (`person.originCategory`) y `INITIAL_ARTICLES[0]`.
  * PDF ajustado con ajuste automático de hasta 2 líneas en `pdf-consent.ts` (1 página A4) y alcance `"de ámbito autonómico y nacional"`.
  * Aviso de cookies técnico `cdv_cookie_consent_v2` (sin toggle ficticio) y actualización de `/privacidad` (purga OTP 24h, Art. 14 RGPD, Art. 37 RGPD sin DPD).
  * Mejoras responsive (`375x812`) y focus traps en `/autorizaciones`, `/admin/consentimientos`, `SignaturePad`, `StreamingModal`, `MatchActaModal`, `/partidos`, `/calendario`, `/plantillas` y `/noticias`.
