# Arquitectura, Rutas, Componentes y Fuentes de Datos

## 1. Estructura General (`src/`)

```text
src/
├── middleware.ts              # Seguridad de rutas, protección de cabeceras y validación de origen/host
├── app/                       # App Router de Next.js 14 (páginas y Route Handlers API)
├── components/                # Componentes UI compartidos (Navbar, Footer, Modales, SignaturePad, CookieConsent, Intranet)
└── lib/                       # Lógica de dominio, Neon SQL, criptografía, PDF, SMTP, scrapers, validadores e Intranet
```

---

## 2. Mapa de Páginas (`src/app/`)

### Públicas
| Ruta | Archivo | Función |
| :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | Portada oficial: Hero con partidos en directo/próximos, carrusel, resumen de competición y patrocinadores. |
| `/partidos` | `src/app/partidos/page.tsx` | Resultados y próximos partidos FAVB/AFADE con polling escalonado y modal de acta. |
| `/calendario` | `src/app/calendario/page.tsx` | Calendario de jornada/temporada con badge `LIVE`, descarga `.ics` y acceso a actas. |
| `/clasificacion` | `src/app/clasificacion/page.tsx` | Clasificaciones oficiales FAVB por categoría y reglas de clasificación. |
| `/plantillas` | `src/app/plantillas/page.tsx` | Plantillas de equipos con filtro `?categoria=...` (`useSearchParams` + `Suspense`) y protección de privacidad en menores. |
| `/noticias` y `/noticias/[slug]` | `src/app/noticias/page.tsx`, `src/app/noticias/[slug]/page.tsx` | Crónicas y noticias del club (con anonimización de dorsales/menores cuando aplica). |
| `/fan-zone` | `src/app/fan-zone/page.tsx` | Votación MVP del partido (`"FanVote"`) y comunidad. |
| `/patrocinio` | `src/app/patrocinio/page.tsx` | Dossier y formulario de contacto para patrocinadores. |
| `/autorizaciones` | `src/app/autorizaciones/page.tsx` | Portal oficial de autorizaciones (flujo estándar y acceso directo `?directToken=`), firma electrónica simple OTP + PDF. |
| `/acceso` | `src/app/acceso/page.tsx` | Acceso unificado a la Intranet y Zona de Deportistas (contraseña, enlace mágico SMTP, OAuth2 Google/Microsoft tenant `common`, activación de invitaciones `?invite=` y configuración inicial del Presidente; sin 2FA). |

### Legales y Cumplimiento
| Ruta | Archivo | Contenido |
| :--- | :--- | :--- |
| `/privacidad` | `src/app/privacidad/page.tsx` | Política de privacidad RGPD/LOPDGDD (incluye origen Art. 14, purga OTP 24h y exención de DPD Art. 37 RGPD). |
| `/cookies` | `src/app/cookies/page.tsx` | Política de cookies técnicas (Art. 22.2 LSSI-CE). |
| `/aviso-legal` | `src/app/aviso-legal/page.tsx` | Datos identificativos del club (CIF, domicilio, registro RAED). |
| `/accesibilidad` | `src/app/accesibilidad/page.tsx` | Declaración de accesibilidad web. |

### Administración y Área Interna
| Ruta | Archivo | Función |
| :--- | :--- | :--- |
| `/admin` | `src/app/admin/page.tsx` | Panel general / acceso de administración y streaming. |
| `/admin/consentimientos` | `src/app/admin/consentimientos/page.tsx` | Gestión integral del censo, estado de firmas, integridad HMAC, envíos masivos/individuales de email, firma presencial, revocación y supresión Art. 17. |
| `/club` | `src/app/club/page.tsx` | Intranet del club (envuelto en `ClubShell` + `src/app/club/layout.tsx`): resumen del staff con acceso adaptado a permisos efectivos. |
| `/club/gobierno` | `src/app/club/gobierno/page.tsx` | Panel exclusivo de Presidencia (invitaciones de staff, asignación múltiple de equipos a entrenadores, matriz editable de 40 permisos por rol, excepciones `ALLOW`/`DENY`, transferencia de presidencia y auditoría). |
| `/club/estructura` | `src/app/club/estructura/page.tsx` | Gestión de temporadas, equipos, pabellones, pistas, horarios semanales con detección de solapes, cierres/festivos y propuestas de horario. |
| `/club/censo` | `src/app/club/censo/page.tsx` | Censo unificado FAVB + `player_census` + `player_consents` + CSV FeelSports, cola de deduplicación, semáforo de cuotas, acceso auditado a PII sensible e invitaciones. |
| `/club/asistencia` | `src/app/club/asistencia/page.tsx` | Pase de lista móvil-first (5 estados, cola offline `cdv_attendance_offline_queue_v1`, invitados, informes y alertas; solo staff). |
| `/club/sustituciones` | `src/app/club/sustituciones/page.tsx` | Solicitudes de sustitución y asignación con override temporal automático de `attendance.take`. |
| `/club/desplazamientos` | `src/app/club/desplazamientos/page.tsx` | Cuadrante técnico interno de jornada por partido (`FAVB_MATCHES`/`AFADE_MATCHES`), expediciones de staff y detector de conflictos horarios. |
| `/club/pagos` | `src/app/club/pagos/page.tsx` | Productos, modalidades, descuentos 100% configurables, inscripciones con prorrateo, cobros manuales, anulación/condonación, recibos PDF, informes con morosidad por antigüedad, histórico CSV FeelSports y envío de avisos por email. |
| `/mi-club` y `/mi-club/onboarding` | `src/app/mi-club/page.tsx`, `src/app/mi-club/onboarding/page.tsx` | Ficha propia o de hijos tutelados, firma/renovación RGPD integrada y consulta de pagos + recibos PDF en solo lectura (incluyendo jugadores 14–17 años; sin datos de asistencia ni cuadrantes internos). |

---

## 3. Mapa de API Routes (`src/app/api/`)

### Autorizaciones y Portal Familiar (`/api/consent/*`)
* `POST /api/consent/roster-options` — Lista equipos y opciones de jugadores para el Paso 1 estándar.
* `POST /api/consent/verify` — Verifica identidad en flujo estándar (equipo + deportista + año/fecha nacimiento + últimos 4+letra DNI) y emite `verificationToken`.
* `POST /api/consent/verify-direct-token` — Inspecciona (`mode: 'inspect'`, exento de `failBucket`) o desbloquea (`mode: 'unlock'`) un `?directToken=` validando OTP (`SIGN` o `RECEIPT`). Bloquea fichas `SHREDDED` con `409`/`404`.
* `POST /api/consent/send-otp` — Genera y envía por SMTP (Zoho EU) un código OTP de 6 dígitos ligado al `purpose` (`SIGN`, `REVOKE`, `RECEIPT`).
* `POST /api/consent/submit` — Registra la autorización web (`OTP_EMAIL`), valida booleanos explícitos de Imagen y Desplazamientos, verifica el OTP reciente y firma el hash HMAC `v3`.
* `POST /api/consent/revoke` — Revoca un consentimiento activo (Art. 7.3 RGPD) previa verificación OTP con propósito `REVOKE` (soporta `actionToken` y `directToken`).
* `POST /api/consent/receipt` — Genera/devuelve datos para resguardo PDF oficial (requiere OTP con propósito `RECEIPT`).

### Administración (`/api/admin/*`)
* `POST /api/admin/login` / `POST /api/admin/logout` — Autenticación de sesión administrativa por cookie firmada (`ADMIN_SESSION_SECRET`).
* `GET/POST /api/admin/census` — Consulta y actualización parcial/masiva de datos censales (con protección para no borrar `dni_last5` si el input viene vacío).
* `GET/POST /api/admin/consent` — Dashboard de consentimientos, detalle individual, registro de firma `PRESENCIAL`, revocación o supresión Art. 17 (`shredPlayerCryptoKey`).
* `POST /api/admin/direct-link` — Genera enlace directo `?directToken=` individual (y envío opcional de correo).
* `POST /api/admin/direct-link-batch` — Genera lote de hasta 200 enlaces y envía emails en bloques (omitiendo `isSigned` y `isShredded`).

### Intranet y Portal de Socios (`/api/intranet/*`)
* `/api/intranet/auth/me`, `login`, `logout`, `magic`, `bootstrap`, `invite`, `oauth/[provider]`, `oauth/[provider]/callback` — Gestión de identidad, autenticación multi-canal, OAuth2 tenant `common` e invitaciones (acceso sin 2FA por decisión del club).
* `/api/intranet/gov` — Panel de Presidencia, asignaciones de equipos y matriz RBAC de permisos.
* `/api/intranet/structure` — Temporadas, equipos, pabellones, pistas y horarios.
* `/api/intranet/census` — Sincronización y gestión avanzada del censo unificado y cuotas.
* `/api/intranet/attendance` — Pase de lista y sincronización de cola offline.
* `/api/intranet/substitutions` — Gestión de sustituciones y override temporal.
* `/api/intranet/trips` — Cuadrantes de desplazamientos y expediciones de staff.
* `/api/intranet/payments`, `/api/intranet/payments/receipt/[paymentId]`, `/api/intranet/payments/send-reminders` — Gestión de cobros, productos, recibos PDF e histórico.
* `/api/intranet/member` — Consulta de deportistas y tutores en zona `/mi-club`.

### Competición, Streaming y Públicos
* `GET /api/favb/sync`, `/api/favb/rosters`, `/api/favb/standings`, `/api/favb/match/[id]` — Sincronización y consulta FAVB con caché en `sports_cache` + `rosterCache` + deduplicación `inFlightRostersSync`. `/api/favb/match/[id]` anonimiza menores rivales promocionados a Senior (`person.originCategory`).
* `GET/POST /api/afade/sync` — Sincronización de competición AFADE.
* `GET /api/calendar/ics` — Exportación de calendario en formato iCalendar.
* `GET/POST /api/streaming` — Estado de emisiones en directo y gestión protegida por `STREAMING_ADMIN_PASSWORD`.
* `POST /api/public/mvp-vote` — Voto MVP atómico por partido e IP hash (`ON CONFLICT DO NOTHING`).
* `POST /api/public/press`, `POST /api/public/sponsor` — Formularios públicos de acreditación de prensa y patrocinio.

---

## 4. Componentes y Librerías Clave

* **Componentes (`src/components/`)**:
  * `SignaturePad.tsx`: Lienzo HTML5 de firma manuscrita (trazo negro continuo, responsive con truncado limpio en 375px).
  * `CookieConsent.tsx`: Aviso técnico informativo (`localStorage` clave `cdv_cookie_consent_v2`, conforme Art. 22.2 LSSI-CE, sin switches inoperativos).
  * `StreamingModal.tsx` & `MatchActaModal.tsx`: Modales con `max-h-[90dvh]` y scroll interno seguro en móvil.
  * `Navbar.tsx` & `Footer.tsx`: Cabecera con enlace `/acceso` sustituyendo a FeelSports y pie legal compacto en `/club` y `/mi-club`.
  * `HeroLiveBlock.tsx`, `HeroMatchesCarousel.tsx`, `SponsorBanner.tsx`, `TopMarquee.tsx`.
  * `src/components/intranet/`: Componentes específicos de la Intranet y Zona de Deportistas (shells, tablas, listas de asistencia, paneles de gobierno).
* **Librerías (`src/lib/`)**:
  * `consent-store.ts`: Núcleo de persistencia, validación, HMAC `v1`/`v2`/`v3`, tokenización, revocación y crypto-shredding.
  * `encryption.ts`: Primitivas criptográficas (`encryptData`, `decryptDataStrict`, `generateBlindIndex`, `wrapDek`/`unwrapDek`, `maskDni`).
  * `email-otp.ts`: Retos OTP con propósito vinculado, pool TLS Zoho SMTP, plantillas de invitación, OTP y resguardo PDF.
  * `pdf-consent.ts`: Generación `jspdf` en **1 página A4 exacta** tanto para resguardos digitales/presenciales como para el modelo en blanco.
  * `validators.ts`: Validación DNI/NIE (Módulo 23 + lista demo controlada), pasaporte endurecido, emails y URLs seguras.
  * `rate-limiter.ts`: Limitación de tasa respaldada por Neon (`rate_limits`).
  * `favb-scraper.ts` / `favb-data.ts` / `afade-scraper.ts` / `afade-data.ts` / `data-store.ts`: Datos deportivos y editoriales.
  * `src/lib/intranet/`: Módulos de la Intranet (`catalog.ts`, `csv-utils.ts`, `seed-bootstrap.ts`, `audit.ts`, `rbac.ts`, `auth.ts`, `api-helpers.ts`, `census-sync.ts`, `payments.ts`, `pdf-receipt.ts`).

---

## 5. Cabeceras de Seguridad (`netlify.toml` y `src/middleware.ts`)

* Cabeceras `no-store`/`noindex` añadidas en `src/middleware.ts` para proteger las rutas privadas `/acceso`, `/club`, `/mi-club` y `/api/intranet/*`.
* `Content-Security-Policy` estricta (`object-src 'none'`, `frame-ancestors 'self'`, `upgrade-insecure-requests`).
* `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` restrictiva.
* `Cache-Control: no-store, no-cache, must-revalidate, private` y `X-Robots-Tag: noindex, nofollow` en `/admin/*`, `/autorizaciones/*`, `/club/*`, `/mi-club/*`, `/api/admin/*` y `/api/consent/*`.
