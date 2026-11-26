# Portal de Autorizaciones, Marco Normativo y Flujos

## 1. Marco Normativo Aplicado

* **RGPD (UE 2016/679)** y **LOPDGDD (LO 3/2018)**: base jurídica Art. 6.1.a (consentimiento expreso, libre e inequívoco; denegarlo no impide la práctica deportiva, Art. 13.2.e), Art. 7 LOPDGDD (menores), Art. 7.3 RGPD (derecho de revocación en cualquier momento sin efecto retroactivo), Art. 14 (origen federativo/representante de los datos), Art. 17 (supresión), Art. 37 (club no obligado a designar DPD formal; canal de privacidad en `info@voleibolsanpedro.es`).
* **LO 1/1982**: protección del derecho al honor, intimidad y propia imagen; prohibición de uso comercial o cesión a patrocinadores; asentimiento e información previa en menores de 14 a 17 años (Art. 3.1).
* **Protocolo Marco de Menores de la Junta de Andalucía** (**Orden de 18 de noviembre de 2024, BOJA núm. 229**), **Ley 5/2016 del Deporte de Andalucía**, **Arts. 154–156 Código Civil** y **R.D. 443/2001** (transporte colectivo de menores).
* **Reglamento eIDAS (UE 910/2014, Arts. 3.10 y 25.1)**: **Firma Electrónica Simple** sustentada en verificación OTP al correo censado + trazo manuscrito en `SignaturePad` + sellado criptográfico HMAC-SHA256 `v3` + huella temporal y UUID.

---

## 2. Reglas Funcionales del Formulario

1. **Dos decisiones binarias independientes y neutras** (sin preselección, estado inicial `null`):
   * **1. Tratamiento y Difusión de Imágenes Deportivas**: web oficial, redes sociales institucionales, retransmisiones/streaming, memorias, cartelería y prensa deportiva (ámbito autonómico y nacional, sin ánimo de lucro ni cesión comercial).
   * **2. Desplazamientos y Viajes Deportivos Oficiales**: traslado en transportes oficiales del club para competiciones FAVB/AFADE, concentraciones, CADEBA y torneos.
   * *Nota de UI*: No mostrar las etiquetas internas *"Anexo 05"* ni *"Anexo 06"* en botones, cabeceras, correos o PDF.
2. **Tramos de edad y firma única**:
   * **Menores de 14 años (`<14`)**: decide y firma únicamente padre, madre o tutor legal.
   * **Menores de 14 a 17 años (`14–17`)**: firma única del padre, madre o tutor legal declarando haber informado al/a la deportista y contar con su conocimiento y asentimiento (Art. 3.1 LO 1/1982), conservando el menor el derecho personal a oponerse o retirar su imagen.
   * **Mayores de edad (`+18`)**: firma el propio deportista; el campo `#signer-name` queda bloqueado (`readOnly`) al nombre autoritativo del deportista (`cleanSignerName = authoritativePlayerName`).
3. **Validación de documento (`src/lib/validators.ts`)**:
   * DNI español y NIE (`X/Y/Z`) validados mediante algoritmo Módulo 23 (más lista de DNIs demo válidos).
   * Pasaporte endurecido para rechazar DNIs/NIEs malformados (`^[XYZ]\d{6,9}[A-Z]{0,2}$`, `^\d{7,9}[A-Z]{1,2}$`).

---

## 3. Flujos de Usuario en `/autorizaciones`

### Flujo A: Acceso Estándar (sin `?directToken=`)
1. **Paso 1 (Identificación)**: selección de equipo -> deportista -> año/fecha de nacimiento + últimos 4 dígitos y letra del DNI/NIE -> `POST /api/consent/verify` emite `verificationToken` (TTL 20 minutos).
2. **Paso 2 (Autorizaciones y Firma)**: datos del firmante, 2 decisiones binarias (`Autorizo` / `No autorizo`), declaración responsable, `SignaturePad` único y verificación OTP al correo censado (`purpose: 'SIGN'`).
3. **Paso 3 (Resguardo Oficial)**: descarga inmediata del PDF oficial de 1 página y copia automática por email.

### Flujo B: Acceso Directo (`?directToken=...`)
1. **Inspección inicial**: `POST /api/consent/verify-direct-token` con `mode: 'inspect'` (exento de `failBucket` para evitar bloqueos `429` en recargas).
   * Si la ficha es `SHREDDED`, responde error y permanece en Paso 1 base.
   * Si es válida, muestra el nombre enmascarado del deportista y correo censado enmascarado (sin pedir DNI ni fecha de nacimiento).
2. **Desbloqueo por OTP único**:
   * **Si está pendiente**: pulsar *Continuar* envía OTP con `purpose: 'SIGN'` y desbloquea Paso 2 (`mode: 'unlock'`).
   * **Si ya está firmado (`alreadySigned: true`)**: Paso 1B ofrece dos acciones independientes:
     * *Consultar / Descargar Resguardo PDF* -> OTP con `purpose: 'RECEIPT'` -> `POST /api/consent/receipt`.
     * *Revocar y firmar de nuevo (Art. 7.3)* -> OTP con `purpose: 'REVOKE'` -> `POST /api/consent/revoke` (propaga `directTokenJti` / `directTokenExpIso` sin consumir el enlace hasta que se complete la nueva firma).

### Flujo C: Firma Presencial en Secretaría (`/admin/consentimientos`)
* Descarga de modelo PDF en blanco (1 página A4 con casillas SÍ/NO y aviso de validez tras registro).
* Registro manual en `/admin/consentimientos` -> `POST /api/admin/consent` (`action: 'in_person'`), exigiendo selección explícita `Autoriza`/`No autoriza` mediante radio buttons sin preselección.

### Flujo D: Auto-Inscripción por Enlace de Categoría (`/inscripcion?cat=<token>`)
1. **Generación administrativa (`/club/censo?tab=inscripciones`)**: el club genera o copia enlaces bloqueados por categoría (ej. *Cadete Femenino*) listos para pegar en el grupo de WhatsApp de cada equipo.
2. **Paso 1 — Validación Anticipada, Unificación con Censo, Modalidad y Credenciales (`/inscripcion`)**:
   * La categoría viene **bloqueada** desde el token de enlace (`intranet_category_registration_links`).
   * Bloque claramente diferenciado de **Datos del Jugador/a**; si el cálculo exacto de edad en `Europe/Madrid` detecta `< 18` años, se despliega obligatoriamente el bloque de **Padre, Madre o Tutor Legal** (en `14–17` se mantiene además la declaración de asentimiento LO 1/1982) y se bloquea explícitamente que el DNI del menor coincida con el del tutor (`playerDni !== guardianDni`, HTTP `400`).
   * Antes de avanzar al Paso 2, `POST /api/intranet/registration` (`action: 'validate_step1'`) valida credenciales, conflictos (`409` por correo de staff, contraseña incorrecta de tutor existente, correo duplicado de adulto o ficha ya activa/pendiente) y ejecuta el motor de unificación (`src/lib/intranet/athlete-matcher.ts`):
     * Emparejamiento exacto por `dni_blind_index` (excluyendo `BAJA` y `SHREDDED`).
     * Normalización tolerante (`normalizeNameKey` con transliteración previa a NFD de `ł->l`, `ø->o`, `ß->ss`, etc., eliminación de diacríticos, expansión de abreviaturas `Mª`/`Fco.`, manejo de guiones, partículas internas `de/del/la/los/...` y Damerau-Levenshtein distancia `1` para erratas tipográficas de 1 letra) + compatibilidad con años orientativos FAVB cuando `birth_date_verified = false`.
     * Normalización automática de formato (`formatProperPersonName`) al registrar e informar al usuario en Paso 2 cuando se identifica una ficha deportiva previa (`matchedExistingRoster: true`).
   * Elección de modalidad de pago activa (`Mensual`, `Trimestral`, `Anual`, etc.) y alta de credenciales (`correo` como usuario + contraseña de mínimo 10 caracteres, ≥1 mayúscula y ≥1 dígito).
3. **Paso 2 — Autorizaciones RGPD + Firma Manuscrita + OTP Email**:
   * Pre-carga automática de la ficha de autorizaciones con los dos selectores binarios neutros (sin etiquetas *"Anexo 05"/"Anexo 06"*), `SignaturePad` y reto OTP (`otp-v2:SIGN`, máx. 5 intentos, el reenvío invalida el código previo) enviado al correo del jugador/tutor (usando `draftPlayerId` `reg-...` para evitar enumeración de IDs internos antes de validar OTP).
   * Al enviar la solicitud (`complete_registration`), tanto las fichas nuevas (`reg-...`) como las fichas existentes unificadas (`pending_payload_enc`, `AES-256-GCM`, AAD `reg_pending:<athleteId>`) emiten automáticamente el correo `[CDV San Pedro] Solicitud de inscripción recibida (pendiente de revisión)` confirmando categoría, cuota elegida y opciones RGPD en espera de validación. El resguardo oficial `[AUTORIZACION-CDV]` con PDF adjunto se emite una vez aprobada por el staff en `approve_registration`.
4. **Paso 3 — Resguardo y Validación Administrativa por Staff**:
   * Descarga inmediata del resguardo PDF A4 de 1 página y bloqueo de entrada a `/mi-club` (`403 PENDING_ADMIN_APPROVAL`, con aviso ámbar específico en `/acceso`) hasta que administración acepte el alta.
   * El panel `/club/censo?tab=inscripciones` distingue visualmente `"Ficha existente unificada"` vs `"Nueva ficha"`:
     * **Al aceptar (`approve_registration`)**: activa la cuenta/ficha (`VERIFICADO`, `birth_date_verified = true`), genera cuota/cargos y envía al correo dos emails oficiales: `[CDV San Pedro] Inscripción aprobada y acceso activado` (con equipo asignado, referencia y acceso a `/acceso` -> `/mi-club`) + `[AUTORIZACION-CDV]` con el PDF custodiado adjunto (tanto para `staged` como para fichas nuevas).
     * **Al rechazar (`reject_registration`)**: exige indicar un motivo en el modal de confirmación, libera la ficha/consentimiento (`status = 'BAJA'`, `user_id = NULL` y consentimiento `'REVOKED'` si era borrador `reg-...`; conservando intacta en `PENDIENTE_VALIDAR` la ficha previa si era `staged`) y envía `[CDV San Pedro] Solicitud de inscripción rechazada · Motivo y subsanación` con el motivo exacto y el botón directo al formulario para re-inscribirse con el mismo correo y contraseña si el error es subsanable.
   * Tras la aprobación, el deportista/tutor entra en `/mi-club` con visibilidad estrictamente limitada (`PROPIO`): sus equipos, horarios/pistas semanales, historial de **Asistencia** propia, estado de cuota y recibos PDF en solo lectura (con aviso de transferencia bancaria) y estado/resguardo RGPD.

---

## 4. Canal Confidencial de Protección al Menor — LOPIVI (`/proteccion-menor` y `/club/proteccion-menor`)

* **Marco Normativo**: Ley Orgánica 8/2021 (LOPIVI, Arts. 14, 15, 35, 47 y 48) y Orden de 18 de noviembre de 2024 (BOJA núm. 229, Protocolo Marco de Menores de la Junta de Andalucía).
* **Canal Público (`/proteccion-menor`)**:
  * Enlace permanente en el pie de página (`Footer`) de toda la web pública/privada y en el flujo de inscripción (`/inscripcion`), retirado de `Navbar` y `/mi-club` para mantener limpia la cabecera y suficiente normativamente vía pie institucional.
  * Expone los datos del Delegado de Protección (*Carlos Alberto Alcántara González*, `voleibolsanpedro@hotmail.es`), teléfonos oficiales (`112`, Fundación ANAR `900 20 20 10` / `116 111`, Teléfono Andaluz `900 85 18 18`), Protocolo Interno de 11 puntos (lectura web + descarga PDF sin punto 12 interno), Código de Conducta de 8 apartados (lectura web + descarga PDF sin hoja rellenable de firma final) y formulario oficial de comunicación de incidencias (anónimo o identificado con reserva opcional de identidad, evaluación de riesgo inmediato y generación de comprobante/modelo en blanco PDF).
* **Registro Confidencial Interno (`/club/proteccion-menor` y `/api/intranet/lopivi`)**:
  * Acceso exclusivo para **Presidencia / Delegado de Protección** (`ctx.isPresident === true`, devolviendo `403` a cualquier otro rol de staff o jugador).
  * Descifrado auditado bajo AAD `lopivi:${id}:${field}`, alta manual de comunicaciones presenciales/telefónicas/email, gestión de fases 6–9 (medidas urgentes, derivación a autoridades, seguimiento y cierre) y exportación del registro completo oficial en PDF de 10 secciones.

---

## 5. Generación de PDF (`src/lib/pdf-consent.ts`)

* Formato estricto de **1 página A4** verificada para nombres largos, menores `14–17`, adultos `+18`, modelo en blanco y registros heredados mixtos.
* Ajuste automático hasta 2 líneas sin truncación silenciosa (`idBoxH = 26.5`, `signBoxH = 31`).
* Incluye bloque de evidencias electrónicas (UUID, método eIDAS / presencial, fecha Madrid, hash HMAC-SHA256) y firma manuscrita incrustada.

---

## 6. Jugadores de Prueba (`demo-*` y `p-test-prueba`) y Estados del Censo

* `player_census` e `intranet_athletes` filtran y ocultan las fichas de prueba (`is_demo = true`, `demo-*`, `p-test-prueba`) salvo que `ALLOW_DEMO_PLAYERS=true`. En las bases de datos limpias de producción solo permanecen los deportistas reales del club.
* En el panel `/club/censo`, las fichas importadas o precargadas sin solicitud online ni cuenta asociada muestran el estado `"Sin registrar"` (`IMPORTADO`), reservando `"Pendiente validar"` (`PENDIENTE_VALIDAR`) exclusivamente para solicitudes de alta activas en revisión. Los distintivos RGPD muestran `"Firmado"` / `"No firmado"` / `"Revocado"` y diferenciación cromática verde (`"Sí autorizo"`) / roja (`"No autorizo"`).
* Al hacer pruebas destructivas (ej. supresión Art. 17 en `/admin/consentimientos`), la ficha queda en `SHREDDED` y no admite envíos ni firmas hasta rehabilitarla en Neon.
