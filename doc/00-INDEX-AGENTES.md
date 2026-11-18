# Índice Maestro de Contexto para Agentes y LLMs

> **Proyecto**: Web Oficial y Portal de Autorizaciones del **C.D. Voleibol San Pedro** (`SAN PEDRO C.D VOLEIBOL`)  
> **Dominio**: `https://voleibolsanpedro.es` · **Contacto oficial**: `info@voleibolsanpedro.es`  
> **Stack**: Next.js `14.2.35` (App Router), React `18.3.1`, TypeScript `5.6.2`, Tailwind CSS `3.4.13`, `jspdf 4.2.1`, PostgreSQL Serverless en **Neon** (región UE), Despliegue en **Netlify** (`@netlify/plugin-nextjs`, Node `20`, `TZ=UTC`).

---

## 1. Mapa de la Documentación (`doc/`)

Lee los documentos en este orden según tu tarea:

| Archivo | Contenido |
| :--- | :--- |
| [`doc/00-INDEX-AGENTES.md`](00-INDEX-AGENTES.md) | Este índice: reglas inquebrantables, mapa de archivos críticos y protocolo de actualización. |
| [`doc/01-ARQUITECTURA-Y-RUTAS.md`](01-ARQUITECTURA-Y-RUTAS.md) | Estructura de carpetas, páginas públicas/admin, API Routes, scrapers FAVB/AFADE, componentes y cabeceras HTTP. |
| [`doc/02-BASE-DE-DATOS-Y-CRIPTOGRAFIA.md`](02-BASE-DE-DATOS-Y-CRIPTOGRAFIA.md) | Tablas en Neon PostgreSQL, trigger WORM, cifrado AES-256-GCM + AAD, crypto-shredding Art. 17 y hashes HMAC (`v1`/`v2`/`v3`). |
| [`doc/03-AUTORIZACIONES-NORMATIVA-Y-FLUJOS.md`](03-AUTORIZACIONES-NORMATIVA-Y-FLUJOS.md) | Marco legal (RGPD, LOPDGDD, LO 1/1982, Orden 18/11/2024 Junta de Andalucía), tramos de edad, OTP por propósito, `?directToken=`, PDF 1 página y jugadores demo. |
| [`doc/04-VARIABLES-DESPLIEGUE-Y-QA.md`](04-VARIABLES-DESPLIEGUE-Y-QA.md) | Variables de entorno (`process.env`), reglas de Netlify/UTC, cookies LSSI-CE (`v2`) y checklist obligatorio pre-despliegue. |
| [`doc/CHANGELOG.md`](CHANGELOG.md) | Historial vivo de cambios y decisiones consensuadas para no reintroducir regresiones. |

> Nota: existe también un documento heredado en [`docs/social-followers-checkpoint.md`](../docs/social-followers-checkpoint.md). La documentación viva y oficial del proyecto reside en `doc/`.

---

## 2. Reglas Inquebrantables del Proyecto

1. **Idioma y entorno**: Todo texto de cara al usuario está en **español**. El sistema operativo de desarrollo es Windows y la producción corre en **Netlify (`TZ=UTC`)**.
2. **Zona horaria explícita (`Europe/Madrid`)**: En servidor y Lambdas (donde el reloj es UTC), **nunca** usar `.getHours()` ni `new Date("YYYY-MM-DDT23:59:59")` asumiendo hora local española. Usar siempre `Intl.DateTimeFormat(..., { timeZone: 'Europe/Madrid' })` o los helpers de [`src/lib/date-utils.ts`](../src/lib/date-utils.ts).
3. **Cero credenciales en el código**: Nunca hardcodear contraseñas, tokens, claves de cifrado ni DSNs como valor por defecto (*fallback*). Todo secreto se lee exclusivamente de `process.env`.
4. **Control de despliegues en Netlify**:
   - Cada *Production Deploy* consume créditos limitados. **Prohibido** hacer pruebas en producción o `git push` / `netlify deploy --prod` sin aprobación explícita del usuario.
   - Validar siempre antes en local (`http://localhost:3000`), comprobando `npx tsc --noEmit`, `npm run build` y revisión visual en Desktop (`1440x900`) y Mobile (`375x812`).
5. **Reglas de negocio consolidadas en Autorizaciones** (no revertir):
   - **2 decisiones binarias independientes y sin preselección** (`null` inicial): **Imágenes Deportivas** y **Desplazamientos Oficiales**. No dividir Imágenes en 3 sub-toggles en el formulario nuevo (se mantiene compatibilidad de lectura con registros heredados mixtos).
   - **No usar las etiquetas "Anexo 05" / "Anexo 06"** en la UI, tablas admin, correos ni títulos/textos visibles del PDF.
   - **Firma única** para el trámite: en `<18` firma únicamente padre/madre/tutor legal (entre `14–17` años con conocimiento y asentimiento del menor). No solicitar segunda firma del menor en pantalla.
   - **Acceso directo (`?directToken=`)**: verificación únicamente por **OTP al correo censado** con propósito explícito (`SIGN`, `RECEIPT`, `REVOKE`). No pedir últimos 4 dígitos del DNI ni fecha de nacimiento en la pantalla de desbloqueo de `?directToken=`, ni mostrar spoilers de datos censados antes del OTP.
   - **Canal oficial único**: correo electrónico (`info@voleibolsanpedro.es`), sin integraciones ni botones de WhatsApp.
   - **No filtrar datos de jugadores `demo-*` / `p-test-prueba`** en estadísticas reales ni en las tablas públicas cuando `ALLOW_DEMO_PLAYERS` no está activo.

---

## 3. Protocolo de Mantenimiento de `doc/` (Obligatorio)

Cada vez que realices un cambio en el código o en Neon:
1. Actualiza el archivo `doc/0X-*.md` afectado (rutas, columnas SQL, variables `process.env`, flujos o reglas).
2. Añade un bloque fechado en [`doc/CHANGELOG.md`](CHANGELOG.md) indicando **qué se cambió, por qué y qué archivos tocó**.
3. Si cambian esquemas cacheados en navegador (`localStorage`), documenta el incremento de clave (`_vX`).
