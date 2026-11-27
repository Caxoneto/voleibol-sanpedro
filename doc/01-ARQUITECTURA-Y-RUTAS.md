# Arquitectura, Rutas, Componentes y Fuentes de Datos

## 1. Estructura General (`src/`)

```text
src/
├── middleware.ts              # Seguridad de rutas, protección de cabeceras y validación de origen/host
├── app/                       # App Router de Next.js 14 (páginas y Route Handlers API)
├── components/                # Componentes UI compartidos (Navbar, Footer, Modales, SignaturePad, ViewportScrollReset, CookieConsent, Intranet)
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
| `/plantillas` | `src/app/plantillas/page.tsx` | Plantillas oficiales de equipos con filtro `?categoria=...` (`useSearchParams` + `Suspense`), cabecera limpia sin redundancias federativas, tarjetas centradas en dorsal/nombre/convocatorias, cuerpo técnico con nombre completo y protección de privacidad en menores. |
| `/noticias` y `/noticias/[slug]` | `src/app/noticias/page.tsx`, `src/app/noticias/[slug]/page.tsx` | Crónicas y noticias del club convertidas a **Server Component** con `generateStaticParams()`, `generateMetadata()`, JSON-LD `NewsArticle` e iconos `lucide-react` (via `src/components/CopyLinkButton.tsx`). |
| `/fan-zone` | `src/app/fan-zone/page.tsx` | Votación MVP del partido (`"FanVote"`) y comunidad. |
| `/patrocinio` | `src/app/patrocinio/page.tsx` | Dossier y formulario de contacto para patrocinadores. |
| `/autorizaciones` | `src/app/autorizaciones/page.tsx` | Portal oficial de autorizaciones (flujo estándar y acceso directo `?directToken=`), firma electrónica simple OTP + PDF (`Referrer-Policy: no-referrer`). |
| `/inscripcion` | `src/app/inscripcion/page.tsx` | Auto-inscripción por enlace de categoría (`?cat=<token>`), soporte familiar multi-hijo (`children[]` bajo usuario único `TUTOR`), detección de menor en `Europe/Madrid`, plan de pago individual por hijo, consentimientos RGPD independientes por hijo y firma OTP (`Referrer-Policy: no-referrer`). |
| `/acceso` | `src/app/acceso/page.tsx` | Acceso unificado (correo o nombre de usuario + contraseña, enlace mágico SMTP y activación `?invite=`; proveedores externos Google y Microsoft OAuth2 desactivados explícitamente y bloqueados en `/api/intranet/auth/oauth/[provider]`; `Referrer-Policy: no-referrer`). |

### Legales y Cumplimiento
| Ruta | Archivo | Contenido |
| :--- | :--- | :--- |
| `/proteccion-menor` | `src/app/proteccion-menor/page.tsx` | Canal público LOPIVI (LO 8/2021 y Orden 18/11/2024): Delegado de Protección, teléfonos de urgencia, Protocolo Interno PDF, Código de Conducta PDF y formulario confidencial de comunicación de incidencias (anónimo o identificado). |
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
| `/club/gobierno` | `src/app/club/gobierno/page.tsx` | Panel de Presidencia: staff compacto con equipos desplegables, matriz simplificada de 14 permisos agrupados (`EQUIPO`/`GLOBAL` válidos), excepciones en español, traspaso de presidencia y auditoría traducida a lenguaje natural con filtro por actor. |
| `/club/estructura` | `src/app/club/estructura/page.tsx` | Módulo **Cuadrante**: cuadrante único semanal del Pabellón Sergio Scariolo (`P1`, `P2`, `P3`) integrando entrenamientos y partidos en casa con filtros por equipo/jornada y edición en modal. |
| `/club/censo` | `src/app/club/censo/page.tsx` | Módulo **Jugadoras/es**: tabla ordenable de plantillas, botones de cabecera con icono y tooltip, y pestaña `Inscripciones y Enlaces` (`?tab=inscripciones`) para enlaces por categoría WhatsApp, tarjetas familiares agrupadas multi-hijo (`family_group_id`), selector autocompletable de hermano (`>= 3` caracteres) para descuentos `2º/3º Hermano` y validación individual de cada hijo/a. |
| `/club/asistencia` | `src/app/club/asistencia/page.tsx` | Pase de lista táctil en modal (`IntranetModal`), entrenador asignado visible y seleccionable en Sesión Extra, informes con resaltado rojo por umbral y modal de periodo al pulsar PDF por jugador/a, y pestaña `Control Entrenadores` con proceso automático a los 15 minutos (`attendance-reminders.ts`) sin envío real en pruebas/cuentas placeholder. |
| `/club/sustituciones` | `src/app/club/sustituciones/page.tsx` | Gestión directa de sustituciones de entrenadores por el personal autorizado con override temporal automático de `attendance.take`. |
| `/club/desplazamientos` | `src/app/club/desplazamientos/page.tsx` | Gestión exclusiva de partidos fuera de casa (`!isClubHome`) con sedes reales (`club-venues-map.ts`), filtro de jornadas en cuadros (amarillo + `<Plane />`), propuesta/confirmación de fecha/hora, hora de salida, asignación de `Entrenador Principal` y `Ayudante` (sin `DELEGATE`), avisos informativos de doble partido y botón `Emitir`. |
| `/club/streaming` | `src/app/club/streaming/page.tsx` | Gestión del streaming en directo (YouTube) y grabaciones en diferido por partido para staff autorizado (`web.streaming`), integrada en la intranet sin contraseña adicional. |
| `/club/pagos` | `src/app/club/pagos/page.tsx` | Productos, modalidades, descuentos configurables (con buscador de hermano vinculado desde 3 caracteres para `2º/3º Hermano`), cuotas asignadas, cobros manuales con correo automático de confirmación y recibo PDF adjunto, anulación/condonación, recibos PDF, botón individual `Enviar aviso` por cargo y envío automático mensual pasado el día 5. |
| `/club/proteccion-menor` | `src/app/club/proteccion-menor/page.tsx` | Registro confidencial de incidencias LOPIVI exclusivo de Presidencia / Delegado de Protección (`isPresident`): lectura descifrada auditada, registro manual (presencial/teléfono/email), gestión en modal de medidas/autoridades/seguimiento/cierre y descarga PDF de 10 secciones. |
| `/mi-club` y `/mi-club/onboarding` | `src/app/mi-club/page.tsx`, `src/app/mi-club/onboarding/page.tsx` | Portal restringido al ámbito propio del deportista o hijos tutelados: panel de estado de solicitudes en vivo (`Pendiente validar` / `Aceptada` / `Rechazada · Subsanable` con motivo y enlace de corrección), selector multi-hijo, equipos asignados, horarios/pistas semanales, historial de **Asistencia**, descuentos/cuotas/recibos PDF en solo lectura y firma/renovación RGPD. |

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
* `/api/intranet/auth/me`, `login`, `logout`, `magic`, `bootstrap`, `invite`, `oauth/[provider]`, `oauth/[provider]/callback` — Gestión de identidad, autenticación multi-canal con enlace mágico consumido por `POST` (`/acceso?magic=`), cookie OAuth `cdv_oauth_tx` sellada por AES-GCM, activación unificada/atómica de invitaciones (`claimAndApplyInvitation`), OAuth2 tenant `common` y rate limiting por IP + cuenta (endpoint `/api/intranet/auth/2fa` bloqueado con `403` mientras 2FA esté desactivado).
* `/api/intranet/gov` — Panel de Presidencia, asignaciones de equipos y matriz RBAC de permisos.
* `/api/intranet/structure` — Temporadas, equipos, pabellones, pistas y horarios.
* `/api/intranet/census` — Gestión del censo de jugadoras/es, fichas deportivas y estado RGPD/cuotas.
* `/api/intranet/registration` — Enlaces de auto-inscripción por categoría (público `GET ?token=`, `send_otp`, `complete_registration` con cruce contra fichas incompletas previas y firma RGPD HMAC `v3`) y gestión administrativa (`create_link`, `toggle_link`, `regenerate_link`, `approve_registration` con envío de correo de alta, `reject_registration`).
* `/api/intranet/attendance` & `/api/intranet/attendance/check-reminders` — Pase de lista con trazabilidad de entrenador (`assigned_coach_id`, `taken_by`, `taken_at`), informes/PDF individual por rango, control histórico de cumplimiento técnico y avisos automáticos a los 15 minutos sin pasar lista (`src/lib/intranet/attendance-reminders.ts` ejecutado automáticamente en `GET /api/intranet/attendance`, ping en `ClubShell.tsx` y cron `netlify/functions/attendance-15m-reminders.mts` cada 5 min). El endpoint `check-reminders` acepta únicamente `POST` (eliminado `GET`), y tanto `check-reminders` como `payments/send-reminders` rechazan con `401` cualquier `x-cron-secret` inválido sin hacer fallback a sesión.
* `/api/intranet/substitutions` — Gestión directa de sustituciones y override temporal.
* `/api/intranet/trips` — Desplazamientos exclusivamente de partidos fuera de casa (`!isClubHome`) con snapshot FAVB/AFADE, sedes reales, propuestas/confirmación de horario, hora de salida y avisos de doble partido.
* `/api/intranet/payments`, `/api/intranet/payments/receipt/[paymentId]`, `/api/intranet/payments/send-reminders` — Gestión de cobros, productos, recibos PDF, envío individual por cargo y recordatorios mensuales automáticos tras el día 5 (cron `netlify/functions/monthly-payment-reminders.mts`).
* `/api/intranet/lopivi` — Expedientes confidenciales LOPIVI (lectura descifrada, registro manual y actualización de fases 6–9; acceso restringido exclusivamente a `isPresident`).
* `/api/intranet/member` — Consulta estricta de ámbito propio en zona `/mi-club` (equipos verificados, horarios de entrenamiento, historial de asistencia propia, cuotas/recibos y descarga del resguardo RGPD).

### Competición, Streaming y Públicos
* `GET /api/favb/sync`, `/api/favb/rosters`, `/api/favb/standings`, `/api/favb/match/[id]` — Sincronización y consulta FAVB de los **25 equipos federados** (más 3 equipos municipales en AFADE = **28 equipos**) con caché en `sports_cache` + `rosterCache`, deduplicación `inFlightRostersSync`, extracción separada por lado en fases compartidas/derbis internos y deduplicación de peticiones de clasificación por fase (`favbId-grupo-fase`). `/api/favb/rosters` muestra nombre e iniciales de apellidos (`formatPlayerNameWithInitials`) respetando el control de fotografía, y `/api/favb/match/[id]` anonimiza `homeRoster`/`awayRoster` en servidor (`formatPlayerNameWithInitials`), aplica caché corta (15s) y `checkNeonRateLimit`.
* `GET/POST /api/afade/sync` — Sincronización de competición AFADE.
* `GET /api/calendar/ics` — Exportación de calendario en formato iCalendar.
* `GET/POST /api/streaming` — Estado de emisiones en directo y grabaciones; mutaciones (`start`, `stop`, `save_recording`, `remove_recording`) autorizadas por sesión staff con permiso `web.streaming` (o sesión administrativa `/admin`) con auditoría en `intranet_audit_logs`, sin contraseña adicional.
* `POST /api/public/mvp-vote` — Voto MVP atómico por partido e IP hash (`ON CONFLICT DO NOTHING`).
* `POST /api/public/press`, `POST /api/public/sponsor` — Formularios públicos de acreditación de prensa y patrocinio.
* `POST /api/public/lopivi-report` — Recepción confidencial de comunicaciones LOPIVI con cifrado AES-256-GCM + AAD, anti-spam honeypot/rate-limit y alerta de aviso sin PII al Delegado de Protección.

---

## 4. Componentes y Librerías Clave

* **Componentes (`src/components/`)**:
  * `SignaturePad.tsx`: Lienzo HTML5 de firma manuscrita (trazo negro continuo, responsive con truncado limpio en 375px).
  * `CookieConsent.tsx`: Aviso técnico informativo (`localStorage` clave `cdv_cookie_consent_v2`, conforme Art. 22.2 LSSI-CE, sin switches inoperativos).
  * `StreamingModal.tsx` & `MatchActaModal.tsx`: Modales con `max-h-[90dvh]` y scroll interno seguro en móvil.
  * `Navbar.tsx` & `Footer.tsx`: Cabecera con enlace `/acceso` sustituyendo a FeelSports y pie legal compacto en `/club` y `/mi-club`.
  * `HeroLiveBlock.tsx`, `HeroMatchesCarousel.tsx`, `SponsorBanner.tsx`, `TopMarquee.tsx`.
  * `src/components/intranet/`: Componentes de la Intranet (`ClubShell.tsx`, `IntranetModal.tsx` para unificación de ventanas modales con `Escape` y bottom-sheet móvil).
* **Librerías (`src/lib/`)**:
  * `consent-store.ts`: Núcleo de persistencia, validación, HMAC `v1`/`v2`/`v3`, tokenización, revocación y crypto-shredding.
  * `encryption.ts`: Primitivas criptográficas (`encryptData`, `decryptDataStrict`, `generateBlindIndex`, `wrapDek`/`unwrapDek`, `maskDni`).
  * `email-otp.ts`: Retos OTP con propósito vinculado, pool TLS Zoho SMTP, plantillas de invitación, OTP y resguardo PDF.
  * `pdf-consent.ts`: Generación `jspdf` en **1 página A4 exacta** tanto para resguardos digitales/presenciales como para el modelo en blanco.
  * `lopivi-content.ts` & `pdf-lopivi.ts`: Datos normativos oficiales LOPIVI (Delegado, Protocolo Interno de 12 puntos, Código de Conducta de 9 apartados, tipologías, canales y medidas) y generación PDF institucional del Protocolo, Código de Conducta y Ficha de Incidencia de 10 secciones.
  * `validators.ts`: Validación DNI/NIE (Módulo 23 + lista demo controlada), pasaporte endurecido, emails y URLs seguras.
  * `rate-limiter.ts`: Limitación de tasa respaldada por Neon (`rate_limits`).
  * `favb-scraper.ts` / `favb-data.ts` / `afade-scraper.ts` / `afade-data.ts` / `club-info.ts` / `date-utils.ts` / `data-store.ts`: Catálogo oficial de los 28 equipos del club (25 FAVB incluyendo Alevín y Benjamín + 3 AFADE), colores de equipo (`getTeamColorTheme`), formato de iniciales (`formatPlayerNameWithInitials`), utilidades horarias/de fecha en `Europe/Madrid` con salida `dd/MM/yyyy` (`formatDisplayDate`, `formatMadridDate`), resolución de derbis internos (`doesMatchBelongToTeam`, `doesMatchBelongToCategory`, `getClubCategoryIdByStandingsTeam`) y datos deportivos/editoriales.
  * `club-venues-map.ts`: Diccionario y resolvedor automático de sedes y localidades reales de clubes rivales (`resolveMatchVenue`), evitando placeholders genéricos.
  * `src/lib/intranet/`: Módulos de la Intranet (`catalog.ts` con `SIMPLIFIED_PERMISSION_GROUPS`, `audit-presenter.ts`, `csv-utils.ts`, `seed-bootstrap.ts`, `audit.ts`, `rbac.ts`, `auth.ts`, `api-helpers.ts`, `census-sync.ts`, `payments.ts`, `pdf-receipt.ts`).

---

## 5. Cabeceras de Seguridad, SEO y Rutas (`netlify.toml` y `src/middleware.ts`)

* Cabeceras `no-store`/`noindex` añadidas en `src/middleware.ts` para proteger las rutas privadas `/acceso`, `/club`, `/mi-club` y `/api/intranet/*`.
* Nuevos `layout.tsx` de metadatos SEO (`canonical` + `openGraph` por ruta) en las 8 rutas públicas cliente (`plantillas`, `partidos`, `calendario`, `clasificacion`, `noticias`, `fan-zone`, `patrocinio`, `proteccion-menor`), y `layout.tsx` con `robots: { index: false, follow: false }` en `/acceso`, `/inscripcion`, `/autorizaciones`, `/mi-club` y `/admin`.
* `src/app/sitemap.ts` ampliado con `/proteccion-menor`; `src/app/robots.ts` y `netlify.toml` ampliados con `Disallow` / `X-Robots-Tag: noindex, nofollow` para `/club/`, `/mi-club/`, `/acceso`, `/inscripcion/` y `/api/intranet/*`.
* `Referrer-Policy: no-referrer` aplicado en `/autorizaciones`, `/inscripcion` y `/acceso`.
* Dominio externo `https://www.ligaafade.es` añadido a `img-src` CSP y `next.config.mjs` (`remotePatterns`).
* `Content-Security-Policy` estricta (`object-src 'none'`, `frame-ancestors 'self'`, `upgrade-insecure-requests`).
* `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` restrictiva.
* `Cache-Control: no-store, no-cache, must-revalidate, private` y `X-Robots-Tag: noindex, nofollow` en `/admin/*`, `/autorizaciones/*`, `/inscripcion/*`, `/club/*`, `/mi-club/*`, `/api/admin/*`, `/api/consent/*`, `/api/intranet/*` y `/api/public/lopivi-report`. (La página pública informativa `/proteccion-menor` permanece indexable para cumplir con el requisito legal de accesibilidad del canal LOPIVI).
