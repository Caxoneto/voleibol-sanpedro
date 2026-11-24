# Base de Datos (Neon PostgreSQL) y Modelo Criptográfico

> **Motor**: PostgreSQL Serverless en **Neon** (región UE Frankfurt) conectado mediante `DATABASE_URL` con pooling (`-pooler` y `sslmode=require`).

---

## 1. Tablas Principales de Autorizaciones y Seguridad

| Tabla | Propósito | Columnas / Detalles Críticos |
| :--- | :--- | :--- |
| `player_census` | Censo federativo y datos de contacto cifrados de deportistas y tutores. | `player_id`, `player_name`, `team_id`, `birth_year`, `birth_date`, `birth_date_encrypted`, `birth_date_verified`, `dni_last5`, `dni_encrypted`, `dni_blind_index`, `parent_name`, `parent_dni`, `parent_relationship`, `contact_phone`, `contact_email`, `canonical_player_id`, `secondary_team_ids`, `is_demo`. |
| `player_consents` | Estado vigente de autorización de cada deportista (`ACTIVE`, `REVOKED`, `SHREDDED`). | `id`, `player_id`, `status`, `signer_name`, `signer_dni`, `signer_relationship`, `signer_phone`, `signer_email`, `minor_signer_name`, `minor_signer_dni`, `minor_signature_data`, `is_minor_14_to_17`, `consent_social_media`, `consent_streaming`, `consent_press`, `consent_travel`, `signature_method` (`OTP_EMAIL` / `PRESENCIAL`), `signed_at_iso`, `document_hash`, `otp_challenge_id`, `otp_verified_at`. |
| `player_consents_audit` | Registro histórico inmutable (WORM) de cada evento de firma/revocación. | Mismas columnas probatorias incluyendo `is_minor_14_to_17`, `otp_challenge_id`, `otp_verified_at`. Protegida por trigger `trg_immutable_player_consents_audit` (`BEFORE DELETE OR UPDATE` -> `prevent_player_consents_audit_mutation()`). |
| `player_crypto_keys` | Gestión de claves DEK por jugador y estado de supresión RGPD Art. 17. | `player_id`, `wrapped_dek`, `key_version`, `retention_until`, `shredded_at`. |
| `otp_challenges` | Desafíos de verificación de 6 dígitos enviados por correo electrónico. | `id` (UUID), `player_id`, `purpose` (`SIGN` \| `REVOKE` \| `RECEIPT`), `verified_at` (`TIMESTAMPTZ`), expiración y purga automática tras 24 horas. |
| `consumed_tokens` | Control de un solo uso (*anti-replay*) de tokens directos consumidos. | Registro de `jti` consumido al completar firma. |
| `rate_limits` | Contadores persistentes de limitación de tasa en entorno serverless. | Buckets aislados por IP y `jti` (ej. `direct-token-req:inspect:${ip}`, `${ip}:${jti}`). |
| `sports_cache` | Caché persistente de datos deportivos sincronizados de FAVB/AFADE. | Lectura en caché cuando `!forceRefresh`. |
| `"FanVote"` | Votos MVP públicos por partido. | Índice único `idx_fanvote_match_ip` sobre `("matchId", "ipHash")` para inserción atómica `ON CONFLICT DO NOTHING`. |

---

## 2. Tablas y Seguridad de la Intranet (`intranet_*`)

> **Branch de desarrollo en Neon**: `dev-intranet` en el proyecto `voleibol-sanpedro-eu`, ejecutado vía `queryNeon()` HTTP fail-closed y definido en `prisma/schema.prisma`.

### Identidad, Autenticación y RBAC
* `intranet_users`: Usuarios de la intranet (staff, entrenadores, directiva, jugadores mayores de edad o tutores legales).
* `intranet_oauth_accounts`: Enlaces con proveedor OAuth2 (Google exclusivo; Microsoft OAuth2 multi-tenant desactivado explícitamente).
* `intranet_sessions`: Sesiones activas firmadas.
* `intranet_auth_tokens`: Tokens para magic links, invitaciones y recuperación.
* `intranet_roles` & `intranet_permissions` & `intranet_role_permissions` & `intranet_user_roles`: Sistema de roles y matriz de permisos con índice único parcial `idx_single_active_president`.
* `intranet_permission_overrides`: Excepciones individuales `ALLOW` / `DENY` por usuario/permiso.
* `intranet_invitations`: Gestión de invitaciones de staff y altas.
* `intranet_audit_logs`: Registro forense de acciones en la intranet.

### Estructura, Censo, Asistencia y Pagos
* `intranet_seasons`, `intranet_team_seasons`, `intranet_team_staff`: Temporadas, **28 equipos oficiales** (25 FAVB de Senior a Benjamín + 3 Liga AFADE) y asignaciones de staff (múltiples equipos por entrenador).
* `intranet_venues`, `intranet_courts`, `intranet_training_slots`, `intranet_schedule_proposals`, `intranet_venue_closures`, `intranet_match_schedules`: Pabellón Sergio Scariolo (`P1`, `P2`, `P3`), horarios semanales, festivos y programación/estado (`PENDIENTE` / `CONFIRMADO`) + hora de desplazamiento de partidos en casa y fuera.
* `intranet_athletes`, `intranet_athlete_teams`, `intranet_guardianships`: Deportistas, asignaciones a equipos y tutores legales.
* `intranet_category_registration_links`, `intranet_registration_requests`: Generador de enlaces públicos por categoría (`?cat=<token>` con tokens de `>= 128` bits generados vía `crypto.randomBytes(16).toString('base64url')`) y solicitudes de auto-inscripción pendientes (`PENDING` / `APPROVED` / `REJECTED`). Incorpora la columna `pending_payload_enc` (cifrada con AES-256-GCM y AAD `reg_pending:<athleteId>`) que aísla los datos propuestos de auto-registro hasta `approve_registration`, sin sobrescribir `intranet_athletes`, `player_census`, `intranet_guardianships` ni archivar/revocar consentimientos `ACTIVE` mientras la solicitud está `PENDING`.
* `intranet_training_sessions`, `intranet_attendance_records`, `intranet_attendance_reminders`: Sesiones de entrenamiento (con `assigned_coach_id`, `taken_by`, `taken_at`), pase de lista en modal (5 estados, cola offline `cdv_attendance_offline_queue_v1`) y avisos automáticos a los 15 minutos sin pasar lista.
* `intranet_substitutions`: Gestión directa y asignación de sustituciones con override temporal automático de `attendance.take`.
* `intranet_staff_trips`, `intranet_match_assignments`: Cuadrantes técnicos de partidos (snapshot FAVB/AFADE + sedes reales) y expediciones de staff (`HEAD_COACH`, `ASSISTANT`).
* `intranet_products`, `intranet_price_plans`, `intranet_discount_rules`, `intranet_enrollments`, `intranet_applied_discounts`, `intranet_charges`, `intranet_payments`, `intranet_payment_allocations`: Productos, cuotas, descuentos configurables, inscripciones prorrateadas, cobros, pagos y recibos PDF.
* `intranet_lopivi_incidents`: Expedientes confidenciales del Canal de Protección al Menor LOPIVI (LO 8/2021 y Orden 18/11/2024), accesibles exclusivamente por Presidencia / Delegado de Protección.

---

## 3. Cifrado de PII e Integridad Probatoria

### Cifrado Autenticado (`src/lib/encryption.ts`)
* **Formato vigente**: `v1:${ivHex}:${authTagHex}:${encryptedHex}` (AES-256-GCM con **AAD** ligado al `playerId` y nombre de campo, p. ej. `${playerId}:dni_encrypted`, `${playerId}:contact_email`, `${playerId}:parent_dni`).
* **Lectura retrocompatible**: `decryptDataStrict` soporta lectura controlada de registros legacy `iv:tag:ct` sin prefijo `v1:`.
* **Blind Index**: `generateBlindIndex` permite búsquedas deterministas de DNI sin exponer el valor en claro.
* **Intranet y LOPIVI**:
  * Contraseñas con `scrypt` (política mínima de auto-inscripción: 10 caracteres, ≥1 mayúscula y ≥1 dígito), tokens de sesión/invitación/enlace mágico por hash HMAC-SHA256 con consumo atómico de un solo uso vía `POST`, cookie `cdv_oauth_tx` sellada con `encryptData` (AAD `intranet:oauth_tx`), acceso sin 2FA por decisión del club (ruta `/api/intranet/auth/2fa` bloqueada con `403`), evaluación RBAC estricta (`PROPIO` exige sujeto explícito salvo `substitution.request`, traspaso de presidencia en CTE atómico con `idx_single_active_president`) y cifrado AES-256-GCM + AAD específico de DNI, fecha de nacimiento, alergias y datos de pagador con respeto estricto al estado `SHREDDED`.
  * En `intranet_lopivi_incidents`, identidad del comunicante (si no es anónima o si solicita reserva), datos de contacto, identificación del menor, relato de hechos (`description_enc`) y gestión interna/seguimiento/cierre (`management_notes_enc`) se cifran individualmente con AES-256-GCM y **AAD `lopivi:${id}:${field}`**. El correo de aviso al Delegado nunca incluye PII ni texto de hechos en claro (solo código de expediente, fecha, tipología e indicador de riesgo inmediato).

### Vinculación Criptográfica de OTP (`src/lib/email-otp.ts`)
* `computeOtpCodeHash` enlaza el código con su propósito mediante el esquema `otp-v2:${purpose}:...` (`SIGN`, `REVOKE`, `RECEIPT`), preservando lectura legacy `otp-v1` solo cuando `purpose IS NULL`.
* `verifyEmailOtpChallenge` sella `verified_at = NOW()` al validar correctamente el código.
* `verifyRecentCompletedOtpChallenge` exige **`verified_at IS NOT NULL`** y coincidencia estricta de `purpose` (impide que un OTP de `RECEIPT` sirva para `SIGN` o `REVOKE`).

### Versionado de Integridad HMAC-SHA256 (`src/lib/consent-store.ts`)
* **`v3` (vigente)**: incluye los metadatos `is_minor_14_to_17`, `otp_challenge_id` y `otp_verified_at` tanto en `player_consents` como en `player_consents_audit`.
* **`v1` / `v2` (histórico)**: `verifyConsentIntegrity` y `resolveHistoricalMinor14To17` verifican firmas anteriores sin romper su validez ni provocar falsas alertas en el panel.

---

## 4. Supresión RGPD Art. 17 (*Crypto-Shredding*)

La función `shredPlayerCryptoKey(playerId)` ejecuta de forma atómica:
1. En `player_crypto_keys`: fija `wrapped_dek = NULL` y `shredded_at = NOW()`.
2. En `player_consents`: cambia `status = 'SHREDDED'`, sustituye `signer_name = '[SUPRIMIDO]'` y limpia PII de firmante y menor.
3. En `otp_challenges`: elimina (`DELETE`) los desafíos del jugador.
4. En `player_census`: anula (`NULL`) identificadores, DNI, fechas y contactos.
5. En tablas de la intranet: purga/anonimiza `intranet_athletes` (`status = 'SHREDDED'`), `intranet_sessions`, `intranet_guardianships`, `intranet_athlete_teams`, `intranet_registration_requests` y PII de pagador en `intranet_enrollments` conservando importes contables.
6. **Respeta intactas las bitácoras WORM** (`consent_audit_log`, `player_consents_audit`) mediante triggers inmutables.

**Efectos del estado `SHREDDED`**:
* Bloquea con error `409` / `404` cualquier intento de firma web, firma presencial, inspección o desbloqueo de `?directToken=`.
* El envío masivo (`/admin/consentimientos` y `/api/admin/direct-link-batch`) excluye automáticamente a jugadores `isShredded`.
* Para volver a habilitar una ficha suprimida (por ejemplo en pruebas), se requiere rehabilitación administrativa explícita.
