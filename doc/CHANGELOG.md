# Changelog de Arquitectura, Normativa y Correcciones

Este registro documenta el estado consolidado del proyecto y los cambios recientes para evitar que futuros agentes reviertan decisiones ya consensuadas.

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
