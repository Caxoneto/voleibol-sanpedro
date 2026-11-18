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

---

## 4. Generación de PDF (`src/lib/pdf-consent.ts`)

* Formato estricto de **1 página A4** verificada para nombres largos, menores `14–17`, adultos `+18`, modelo en blanco y registros heredados mixtos.
* Ajuste automático hasta 2 líneas sin truncación silenciosa (`idBoxH = 26.5`, `signBoxH = 31`).
* Incluye bloque de evidencias electrónicas (UUID, método eIDAS / presencial, fecha Madrid, hash HMAC-SHA256) y firma manuscrita incrustada.

---

## 5. Jugadores de Prueba (`demo-*` y `p-test-prueba`)

* Existen **11 fichas de prueba** en `player_census` (`demo-cm-1..5`, `demo-sf-1..5`, `p-test-prueba`) marcadas con `is_demo = true`.
* Permanecen ocultas en estadísticas y listados públicos salvo que `ALLOW_DEMO_PLAYERS=true`.
* Al hacer pruebas destructivas (ej. supresión Art. 17 en `/admin/consentimientos`), la ficha queda en `SHREDDED` y no admite envíos ni firmas hasta rehabilitarla en Neon.
