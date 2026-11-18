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

## 2. Cifrado de PII e Integridad Probatoria

### Cifrado Autenticado (`src/lib/encryption.ts`)
* **Formato vigente**: `v1:${ivHex}:${authTagHex}:${encryptedHex}` (AES-256-GCM con **AAD** ligado al `playerId` y nombre de campo, p. ej. `${playerId}:dni_encrypted`, `${playerId}:contact_email`, `${playerId}:parent_dni`).
* **Lectura retrocompatible**: `decryptDataStrict` soporta lectura controlada de registros legacy `iv:tag:ct` sin prefijo `v1:`.
* **Blind Index**: `generateBlindIndex` permite búsquedas deterministas de DNI sin exponer el valor en claro.

### Vinculación Criptográfica de OTP (`src/lib/email-otp.ts`)
* `computeOtpCodeHash` enlaza el código con su propósito mediante el esquema `otp-v2:${purpose}:...` (`SIGN`, `REVOKE`, `RECEIPT`), preservando lectura legacy `otp-v1` solo cuando `purpose IS NULL`.
* `verifyEmailOtpChallenge` sella `verified_at = NOW()` al validar correctamente el código.
* `verifyRecentCompletedOtpChallenge` exige **`verified_at IS NOT NULL`** y coincidencia estricta de `purpose` (impide que un OTP de `RECEIPT` sirva para `SIGN` o `REVOKE`).

### Versionado de Integridad HMAC-SHA256 (`src/lib/consent-store.ts`)
* **`v3` (vigente)**: incluye los metadatos `is_minor_14_to_17`, `otp_challenge_id` y `otp_verified_at` tanto en `player_consents` como en `player_consents_audit`.
* **`v1` / `v2` (histórico)**: `verifyConsentIntegrity` y `resolveHistoricalMinor14To17` verifican firmas anteriores sin romper su validez ni provocar falsas alertas en el panel.

---

## 3. Supresión RGPD Art. 17 (*Crypto-Shredding*)

La función `shredPlayerCryptoKey(playerId)` en `src/lib/consent-store.ts` ejecuta atómicamente:
1. En `player_crypto_keys`: fija `wrapped_dek = NULL` y `shredded_at = NOW()`.
2. En `player_consents`: cambia `status = 'SHREDDED'`, sustituye `signer_name = '[SUPRIMIDO]'` y limpia `signer_dni`, `signer_email`, `signer_phone`, `signature_data`, `ip_address`, `user_agent`, `minor_*`, `is_minor_14_to_17`, `otp_challenge_id`, `otp_verified_at`.
3. En `otp_challenges`: elimina (`DELETE`) los desafíos del jugador.
4. En `player_census`: anula (`NULL`) `dni_last5`, `dni_encrypted`, `dni_blind_index`, `birth_date`, `birth_date_encrypted`, `birth_date_verified = false`, `parent_name`, `parent_dni`, `parent_relationship`, `contact_phone` y `contact_email`.
5. **No altera `player_consents_audit`** (respetando el trigger append-only WORM).

**Efectos del estado `SHREDDED`**:
* Bloquea con error `409` / `404` cualquier intento de firma web, firma presencial, inspección o desbloqueo de `?directToken=`.
* El envío masivo (`/admin/consentimientos` y `/api/admin/direct-link-batch`) excluye automáticamente a jugadores `isShredded`.
* Para volver a habilitar una ficha suprimida (por ejemplo en pruebas), se requiere rehabilitación administrativa explícita.
