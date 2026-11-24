# Especificaciones Funcionales, UX y Control de Implementación de la Intranet (`2026-11-22`)

> **Propósito de este documento**: Inventario de control con todas las especificaciones consensuadas para la intranet del **C.D. Voleibol San Pedro**, su portal de socios (`/mi-club`), auto-inscripción (`/inscripcion`), protección del menor (LOPIVI) y automatizaciones en Netlify/Neon, sirviendo como referencia única frente a regresiones o nuevas iteraciones.
> **Estado general**: Implementado, compilado (`npx tsc --noEmit`, `npm run build` exit `0`) y verificado en local (`http://localhost:3000`, rama `feature/intranet-club`, Neon `dev-intranet`).

---

## 1. Cabecera Pública y Normativa LOPIVI (`/proteccion-menor`)

| Especificación | Implementación y Criterio de Control | Archivos Clave |
| :--- | :--- | :--- |
| **Enlace LOPIVI en Footer (no en Navbar)** | Retirado el botón `LOPIVI` de `Navbar.tsx` (escritorio y móvil). Se mantiene de forma permanente en `Footer.tsx` (`/proteccion-menor`) y enlazado en `/inscripcion`, cumpliendo LO 8/2021 (LOPIVI) y Orden 18/11/2024 sin recargar la cabecera. | `src/components/Navbar.tsx`, `src/components/Footer.tsx` |
| **Sin bloque redundante en `/mi-club`** | Retirada la tarjeta informativa de LOPIVI del panel principal de `/mi-club` al ser suficiente el acceso permanente en `Footer`. | `src/app/mi-club/page.tsx` |
| **PDFs oficiales sin solapes ni desbordes** | En `LopiviPdfBuilder` se fija tipografía/tamaño antes de `splitTextToSize`, se separa la cabecera de continuación (páginas 2+) en línea 1 (Club + `DOCUMENTO CONFIDENCIAL – USO INTERNO`) y línea 2 (título), y se incrementa el margen inferior de `drawSubheading` antes de listas con viñetas. | `src/lib/pdf-lopivi.ts` |
| **Protocolo hasta Punto 11 (sin Punto 12)** | Eliminado el Punto 12 (*Aprobación*) tanto del catálogo de secciones como del PDF oficial del Protocolo Interno y `/proteccion-menor`. | `src/lib/lopivi-content.ts`, `src/lib/pdf-lopivi.ts`, `src/app/proteccion-menor/page.tsx` |
| **Código de Conducta hasta Punto 8 (sin hoja de firma final)** | Eliminado el apartado final rellenable de aceptación/firma del Código de Conducta tanto en la web como en su PDF descargable (las comunicaciones se realizan únicamente con el *Modelo Oficial en Blanco*). | `src/lib/lopivi-content.ts`, `src/lib/pdf-lopivi.ts`, `src/app/proteccion-menor/page.tsx` |

---

## 2. Asistencia y Sustituciones (`/club/asistencia`, `/club/sustituciones`)

| Especificación | Implementación y Criterio de Control | Archivos Clave |
| :--- | :--- | :--- |
| **Sin caja de alertas; fila destacada en rojo** | Eliminado el bloque superior `"ALERTAS DE ABSENTISMO"` en Informes; los/as deportistas que cumplen el umbral seleccionado (`FI >= umbral` o racha consecutiva) se marcan directamente con fondo/borde rojo en la tabla (escritorio) y tarjetas (móvil). | `src/app/club/asistencia/page.tsx` |
| **Informes limpios y modal PDF por jugador/a** | Eliminados el selector superior de `"Jugador/a"`, el botón superior `"Exportar PDF Jugador/a"` y la caja intermedia `"Historial individual"` en `Informes`. El botón `PDF` de cada fila/tarjeta abre `<IntranetModal>` con opciones de periodo (`Todo el historial (Temporada completa)`, `Periodo actual del filtro`, `Últimos 30 días`, `Rango de fechas personalizado`) y genera el PDF individual con `dd/MM/yyyy`. | `src/app/club/asistencia/page.tsx`, `src/app/api/intranet/attendance/route.ts` |
| **Entrenador asignado visible y en *Sesión Extra*** | Se muestra el entrenador asignado por equipo/sesión (`coachesByTeam`, `assigned_coach_id`) y el modal `"Sesión Extra"` incluye selector de `"Entrenador asignado"` (`staffCoaches`). | `src/app/club/asistencia/page.tsx`, `src/app/api/intranet/attendance/route.ts` |
| **Pase de lista en modal (Mobile + Desktop)** | `"Pasar lista"` se abre dentro de `<IntranetModal size="xl">` adaptable (bottom-sheet en móvil `375x812` sin desbordamiento horizontal). | `src/app/club/asistencia/page.tsx`, `src/components/intranet/IntranetModal.tsx` |
| **Iconos de fecha y hora visibles en tema oscuro** | Añadido `color-scheme: dark` e inversión/contraste de `::-webkit-calendar-picker-indicator` para inputs `date`, `time`, `datetime-local` y `month`. | `src/app/globals.css` |
| **Aviso automático +15 min e histórico de entrenadores (sin correos reales en pruebas)** | Eliminado el botón manual `"Comprobar avisos (+15 min)"` de **Control Entrenadores** (reemplazado por badge de monitorización automática). Servicio `runAttendanceRemindersCheck` (`src/lib/intranet/attendance-reminders.ts`) disparado automáticamente con throttle al consultar asistencia (`GET /api/intranet/attendance`), ping cada 5 min desde `ClubShell.tsx` y Netlify Scheduled Function `attendance-15m-reminders.mts` (`*/5 7-23 * * *` UTC). El helper `isSafeSimulatedRecipient` evita enviar correos SMTP reales en `NODE_ENV !== 'production'`, previews o dominios internos placeholder (`@voleibolsanpedro.es`), registrando igualmente el aviso y auditoría con `simulatedDelivery: true`. | `src/lib/intranet/attendance-reminders.ts`, `src/app/api/intranet/attendance/route.ts`, `src/app/api/intranet/attendance/check-reminders/route.ts`, `src/components/intranet/ClubShell.tsx`, `netlify/functions/attendance-15m-reminders.mts` |
| **Sustituciones directas sin solicitudes** | Eliminados el botón/formulario `"Solicitar sustitución"` en `/club/sustituciones` y el handler `action === 'request_substitution'` en la API. Los usuarios con permiso `substitution.assign` asignan directamente el suplente (con concesión temporal de asistencia `-2h/+24h`). | `src/app/club/sustituciones/page.tsx`, `src/app/api/intranet/substitutions/route.ts` |

---

## 3. Desplazamientos (`/club/desplazamientos`)

| Especificación | Implementación y Criterio de Control | Archivos Clave |
| :--- | :--- | :--- |
| **Solo partidos fuera de casa (sin filtro `"Solo fuera de casa"`)** | `GET /api/intranet/trips` filtra directamente por `!m.isClubHome` para gestionar exclusivamente partidos visitantes; retirados el botón `"Solo fuera de casa"` y las insignias `"LOCAL"` de `/club/desplazamientos`. | `src/app/api/intranet/trips/route.ts`, `src/app/club/desplazamientos/page.tsx` |
| **Selector de Jornadas en cuadros + avión amarillo** | Barra superior con cuadros por jornada (`J1`, `J2`...); al seleccionar un equipo en filtro, las jornadas donde juega fuera de casa se resaltan en amarillo (`amber`) con icono `<Plane />`. | `src/app/club/desplazamientos/page.tsx`, `src/app/api/intranet/trips/route.ts` |
| **Icono de avión en lugar de texto `"FUERA"`** | Las tarjetas de partido visitante sustituyen el badge textual `"FUERA"` por el icono `<Plane />` con `sr-only`. | `src/app/club/desplazamientos/page.tsx` |
| **Sedes y localidades reales (sin placeholders)** | Creado `resolveMatchVenue()` (cruzando `venueOverride`, snapshots en vivo FAVB/AFADE y mapeo de clubes rivales/campos habituales) para erradicar `"Pabellón Municipal Visitante"` en todos los partidos del club (Senior a Benjamín). | `src/lib/club-venues-map.ts`, `src/app/api/intranet/trips/route.ts` |
| **Propuesta de fecha/hora, estado y hora de salida** | Modal `"Horario / Salida"` que guarda en `intranet_match_schedules` fecha propuesta, hora propuesta, estado (`PENDIENTE` de consenso con rival o `CONFIRMADO` tras oficialización FAVB/AFADE), hora de desplazamiento (`departure_time_madrid`) y sede/localidad opcional. | `src/app/club/desplazamientos/page.tsx`, `src/app/api/intranet/trips/route.ts` |
| **Aviso no bloqueante en doble partido el mismo día** | No se impide asignar a un entrenador a 2 partidos en la misma fecha; se muestra un aviso informativo con horario y sede/localidad del otro partido para decisión del coordinador. | `src/app/club/desplazamientos/page.tsx`, `src/app/api/intranet/trips/route.ts` |
| **Sin Delegado en desplazamientos** | Eliminado `DELEGATE` tanto de `ROLE_SLOTS` en la UI como de `VALID_ASSIGNMENT_ROLES` en `/api/intranet/trips` (solo `HEAD_COACH` Entrenador Principal y `ASSISTANT` Ayudante). | `src/app/club/desplazamientos/page.tsx`, `src/app/api/intranet/trips/route.ts` |

---

## 4. Cuadrante (`/club/estructura`)

| Especificación | Implementación y Criterio de Control | Archivos Clave |
| :--- | :--- | :--- |
| **Renombrado a `"Cuadrante"`** | El módulo `Estructura` se presenta en la navegación (`ClubShell.tsx`), portada de intranet (`/club`), título de `/club/estructura` y filtros de auditoría (`audit-presenter.ts`) como **`Cuadrante`**. | `src/components/intranet/ClubShell.tsx`, `src/app/club/page.tsx`, `src/app/club/estructura/page.tsx`, `src/lib/intranet/audit-presenter.ts` |
| **Vista única Polideportivo Sergio Scariolo (`P1`, `P2`, `P3`)** | Eliminadas las pestañas `"Pabellones, Pistas y Equipos"` y `"Ocupación y Partidos FAVB"`, mostrando directamente el cuadrante semanal L–D del Sergio Scariolo con pistas renombradas en BD y catálogo a `P1`, `P2` y `P3`. | `src/app/club/estructura/page.tsx`, `src/lib/intranet/catalog.ts` |
| **Entrenamientos y Partidos en Casa integrados + edición modal** | La tabla semanal muestra tanto entrenamientos como partidos en casa (`homeMatches`), filtrables por **Equipo**, **Jornada** y modo (`Ambos` / `Entrenos` / `Partidos`). Clic en cualquier ticket abre modal de edición (`update_slot` o `upsert_home_match_schedule`). | `src/app/club/estructura/page.tsx`, `src/app/api/intranet/structure/route.ts` |
| **Tickets compactos solo con pista (`P1`, `P2` o `P3`)** | Los tickets omiten el nombre repetido del pabellón y muestran únicamente la insignia `P1`, `P2` o `P3` (o `S/P` si está sin asignar). | `src/app/club/estructura/page.tsx` |

---

## 5. Jugadoras/es y Auto-inscripción (`/club/censo`, `/inscripcion`)

| Especificación | Implementación y Criterio de Control | Archivos Clave |
| :--- | :--- | :--- |
| **Renombrado a `"Jugadoras/es"`** | Sustituido `"Censo Unificado, Deduplicación e Invitaciones"` por **`Jugadoras/es`** en el menú lateral (`ClubShell.tsx`), página `/club/censo` y resumen `/club`. | `src/app/club/censo/page.tsx`, `src/components/intranet/ClubShell.tsx`, `src/app/club/page.tsx` |
| **Botones de cabecera solo icono con `title`** | Botones de acción en cabecera reducidos a icono cuadrado con atributos `title` y `aria-label` descriptivos al pasar el ratón. | `src/app/club/censo/page.tsx` |
| **Eliminación total de FeelSports y duplicidades** | Retiradas todas las referencias de UI y backend a FeelSports (pestaña Deduplicación, importadores CSV de `census` y `payments`, `importFeelSportsRows` en `census-sync.ts` y `FEELSPORTS_CSV_TEMPLATE` en `csv-utils.ts`). | `src/app/club/censo/page.tsx`, `src/app/club/pagos/page.tsx`, `src/app/api/intranet/payments/route.ts`, `src/lib/intranet/census-sync.ts`, `src/lib/intranet/csv-utils.ts` |
| **Flujo completo de enlaces por equipo/categoría, cruce y aprobación** | Los 28 equipos (25 FAVB incluyendo Alevín y Benjamín + 3 AFADE) tienen enlace activo en `intranet_category_registration_links` compartible en WhatsApp. El alta (`/inscripcion`) cruza fichas incompletas previas (por `dni_blind_index` o nombre+año+equipo) evitando cuentas/fichas duplicadas (`409`), registra OTP+HMAC RGPD y crea solicitud `PENDING`; al aprobar desde **Jugadoras/es**, asigna equipo(s), activa acceso a `/mi-club` y envía correo de confirmación. | `src/app/club/censo/page.tsx`, `src/app/inscripcion/page.tsx`, `src/app/api/intranet/registration/route.ts` |
| **Tabla ordenable y perfiles demo siempre visibles** | Añadida ordenación asc/desc por Deportista, Equipo, Año/Edad, Estado, RGPD y Semáforo de Cuotas (más selector móvil). Eliminado el checkbox de demo: las fichas demo permanecen siempre visibles hasta su eliminación explícita. | `src/app/club/censo/page.tsx`, `src/app/api/intranet/census/route.ts` |

---

## 6. Pagos y Tesorería (`/club/pagos`)

| Especificación | Implementación y Criterio de Control | Archivos Clave |
| :--- | :--- | :--- |
| **Envío individual de avisos desde tabla** | Botón **`Enviar aviso`** en cada fila pendiente/vencida de `Cargos y Cobros`, invocando `POST /api/intranet/payments/send-reminders` con `{ chargeId }`, validando acceso por equipo (`intranet_athlete_teams`) o `GLOBAL`. | `src/app/club/pagos/page.tsx`, `src/app/api/intranet/payments/send-reminders/route.ts` |
| **Cron automático mensual pasado el día 5** | Función programada `monthly-payment-reminders.mts` (`0 9 6-10 * *` UTC) y validación `madridDay <= 5` en `send-reminders/route.ts`, deduplicado por mes (`TO_CHAR(... AT TIME ZONE 'Europe/Madrid', 'YYYY-MM')`) con exención controlada `x-cron-secret`. | `netlify/functions/monthly-payment-reminders.mts`, `src/app/api/intranet/payments/send-reminders/route.ts`, `src/middleware.ts` |
| **Pestaña `"Cuotas Asignadas"` y plantilla de pago** | Pestaña renombrada de *Inscripciones* a **`Cuotas Asignadas`** (vincula deportista + Producto + Modalidad + Descuentos -> genera cargos). Plantillas de aviso actualizadas eliminando `"Efectivo o TPV Físico"` e indicando Transferencia Bancaria + próxima pasarela Redsys/Bizum. | `src/app/club/pagos/page.tsx`, `src/app/api/intranet/payments/send-reminders/route.ts` |

---

## 7. Gobierno, Permisos y Auditoría (`/club/gobierno`)

| Especificación | Implementación y Criterio de Control | Archivos Clave |
| :--- | :--- | :--- |
| **Staff y Equipos compacto** | Tarjetas muestran estado (`Activo`) y badges de rol en la misma línea, con los equipos asignados agrupados en un `<details>` colapsable (`Equipos asignados (N)`). Selectores sin códigos técnicos en inglés entre paréntesis. | `src/app/club/gobierno/page.tsx` |
| **Matriz simplificada a 14 permisos y ámbitos válidos** | Agrupados los permisos granulares en 14 entradas funcionales (`SIMPLIFIED_PERMISSION_GROUPS`). Cada grupo restringe `allowedScopes` exclusivamente a los ámbitos válidos (`EQUIPO` / `GLOBAL`), eliminando la opción `PROPIO` de las matrices/excepciones de staff (validado en cliente y en `POST /api/intranet/gov`). | `src/lib/intranet/catalog.ts`, `src/app/api/intranet/gov/route.ts`, `src/app/club/gobierno/page.tsx` |
| **Excepciones 100 % en español** | Etiquetas de efecto (`Conceder`/`Denegar`), alcance (`Todo el club`/`Equipo`), caducidad (`Permanente hasta revocar`) y nombres de permiso traducidos al español. | `src/app/club/gobierno/page.tsx` |
| **Auditoría en lenguaje natural + detalle técnico + filtro staff** | Creado `presentAuditLog()` cubriendo todas las acciones del sistema y registros históricos en español comprensible; botón `"Ver detalle técnico"` despliega acción/ID/IP/JSON; añadido filtro `"Persona de staff"` (`auditActors`). | `src/lib/intranet/audit-presenter.ts`, `src/app/api/intranet/gov/route.ts`, `src/app/club/gobierno/page.tsx` |

---

## 8. Zona de Deportistas y Familias (`/mi-club`)

| Especificación | Implementación y Criterio de Control | Archivos Clave |
| :--- | :--- | :--- |
| **Texto de aviso de pagos actualizado** | Muestra literalmente: `"Aviso: La pasarela de pago online con tarjeta y Bizum (Redsys) se habilitará próximamente. Actualmente los abonos se realizan mediante Transferencia Bancaria."`. | `src/app/mi-club/page.tsx` |
| **Pestaña propia `"Asistencia"` (`PROPIO`)** | Nueva pestaña **Asistencia** en `/mi-club` alimentada desde `GET /api/intranet/member` estrictamente filtrada a los `athlete_id` del usuario/tutor autenticado (sin visibilidad de otros jugadores). | `src/app/mi-club/page.tsx`, `src/app/api/intranet/member/route.ts` |

---

## 9. Organización Jerárquica por 6 Categorías Oficiales y Despliegue de Equipos

| Especificación | Implementación y Criterio de Control | Archivos Clave |
| :--- | :--- | :--- |
| **Taxonomía unificada de 6 Categorías** | Helpers puros en `club-info.ts` (`CLUB_CATEGORY_FAMILIES`, `getCategoryFamilyCode`, `getShortTeamLabelInFamily`, `groupByCategoryFamily`, `doesMatchBelongToCategoryFamily`) agrupando los 28 equipos en: **Senior (3)**, **Juvenil (4)**, **Cadete (3)**, **Infantil (6)**, **Alevín (9)** y **Benjamín (3)** sin alterar IDs de BD ni URLs. | `src/lib/club-info.ts` |
| **Selector sticky de 2 niveles en web pública** | Nuevo componente `CategoryTeamSelectorBar`: fila superior fija con las 6 categorías (contador de equipos y chevron) y panel desplegable inferior con los equipos de la categoría abierta (`Todas` + `Todos en <Categoría>` en `/calendario` mediante `FAMILY:<CODE>`). Aplicado en `/plantillas`, `/clasificacion`, `/calendario` y `/partidos`. En `/partidos`, además, los 28 acordeones del cuerpo se agrupan en los 6 acordeones de Categoría con pestañas de equipos dentro de cada categoría. | `src/components/CategoryTeamSelectorBar.tsx`, `src/app/plantillas/page.tsx`, `src/app/clasificacion/page.tsx`, `src/app/calendario/page.tsx`, `src/app/partidos/page.tsx` |
| **Agrupación en `<optgroup>` y `<details>` en Autorizaciones, LOPIVI e Intranet** | Todos los selectores `<select>` de equipos/categorías usan `<optgroup>` por categoría (`Senior` a `Benjamín`) y etiquetas cortas (`getShortTeamLabelInFamily`); listas densas en `/club/censo` (enlaces WhatsApp, progreso por equipo, asignación de equipos en aprobación y equipos secundarios) y `/club/gobierno` (asignación de equipos a staff) organizadas en bloques colapsables `<details>`. | `src/app/autorizaciones/page.tsx`, `src/app/proteccion-menor/page.tsx`, `src/app/club/censo/page.tsx`, `src/app/club/gobierno/page.tsx`, `src/app/club/estructura/page.tsx`, `src/app/club/desplazamientos/page.tsx`, `src/app/club/asistencia/page.tsx`, `src/app/club/sustituciones/page.tsx`, `src/app/club/pagos/page.tsx`, `src/app/club/streaming/page.tsx`, `src/app/club/proteccion-menor/page.tsx` |

---

## 10. Corrección de Maquetación y Plegado de Información Secundaria (`2026-11-23`)

| Especificación | Implementación y Criterio de Control | Archivos Clave |
| :--- | :--- | :--- |
| **Sellos `APLAZADO` / `CANCELADO` / `DESCANSO` sin solapes (`absolute` eliminado)** | Retirado el posicionamiento `absolute` de tarjetas en `/calendario`, `/partidos`, `HeroMatchesCarousel` e inicio (`featuredMatch`): el indicador `APLAZADO`/`CANCELADO` se integra inline junto al enfrentamiento (en `/calendario` junto a `vs`) o en flujo Flexbox `shrink-0` sin cubrir botones ni nombres de equipo. | `src/app/calendario/page.tsx`, `src/app/partidos/page.tsx`, `src/components/HeroMatchesCarousel.tsx`, `src/app/page.tsx` |
| **Sedes limpias, barra fija exacta y Navbar a `1440px`** | Eliminada la marquesina duplicada y el botón `"Cómo llegar"` repetido en `/calendario` y `/partidos` (fila limpia dedicada para pabellón + botones en pie); ajustado `Navbar` (`max-w-[1440px]`, enlaces `shrink-0`) para evitar roce con Instagram; unificado `TopMarquee` a `h-8` (`112px` totales = `top-28`) y cambiado `overflow-hidden` raíz por `overflow-x-clip` para preservar `position: sticky`; alineadas las celdas `S1..S5` entre local/visitante en `/` y `pointer-events-none` en dorsales de `/plantillas`. | `src/components/Navbar.tsx`, `src/components/TopMarquee.tsx`, `src/app/page.tsx`, `src/app/calendario/page.tsx`, `src/app/partidos/page.tsx`, `src/app/clasificacion/page.tsx`, `src/app/plantillas/page.tsx`, `src/components/intranet/ClubShell.tsx` |
| **Bloques secundarios plegables (`<details>`) y micro-copy** | Retiradas las filas fijas de árbitros en tarjetas de `/calendario` y `/partidos` (disponibles en modal *Acta / Convocatoria*); plegados por defecto los desgloses extensos de 1ª capa RGPD en `/autorizaciones`, `/inscripcion` y `/patrocinio`, el protocolo/código/teléfonos largos en `/proteccion-menor`, formato de fase en `/clasificacion`, instrucciones bancarias en `/mi-club` (manteniendo visible el aviso Redsys), cánticos en `/fan-zone` y secciones de seguimiento/resúmenes largos en `/club/desplazamientos`, `/club/proteccion-menor`, `/club/pagos` y `/club/asistencia`. | `src/app/proteccion-menor/page.tsx`, `src/app/autorizaciones/page.tsx`, `src/app/inscripcion/page.tsx`, `src/app/clasificacion/page.tsx`, `src/app/mi-club/page.tsx`, `src/app/fan-zone/page.tsx`, `src/app/patrocinio/page.tsx`, `src/app/club/desplazamientos/page.tsx`, `src/app/club/proteccion-menor/page.tsx`, `src/app/club/pagos/page.tsx`, `src/app/club/asistencia/page.tsx` |

---

## 11. Plantillas con Iniciales, Colores por Equipo, `/partidos` Simplificado y Fechas `dd/MM/yyyy` (`2026-11-23`)

| Especificación | Implementación y Criterio de Control | Archivos Clave |
| :--- | :--- | :--- |
| **Nombres e iniciales de apellidos en Plantillas y Actas** | Se muestra el nombre propio e iniciales de los apellidos (ej. `Lucía M. L.`) mediante `formatSurnameInitials` y `formatPlayerNameWithInitials`, eliminando el enmascarado `Deportista #X` / `Ficha Protegida` y avisos de reserva manteniendo las comprobaciones de consentimiento fotográfico. | `src/lib/club-info.ts`, `src/app/api/favb/rosters/route.ts`, `src/app/plantillas/page.tsx`, `src/components/MatchActaModal.tsx` |
| **Colores identificativos de equipo con alto contraste** | Helper `getTeamColorTheme` en `club-info.ts` aplicado para identificar `Verde`, `Azul`, `Rosa`, `Rojo`, `Blanco`, `Gris` y `Negro` en selector de equipos (`CategoryTeamSelectorBar`), cabeceras/tarjetas públicas (`plantillas`, `clasificacion`, `partidos`, `calendario`, `HeroMatchesCarousel`, `/`) e intranet (`censo`, `estructura`, `asistencia`, `desplazamientos`, `sustituciones`, `streaming`). El color `Negro` usa punto oscuro con borde blanco y texto `zinc-100` para evitar conflictos de visibilidad en tarjetas oscuras. | `src/lib/club-info.ts`, `src/components/CategoryTeamSelectorBar.tsx`, `src/components/HeroMatchesCarousel.tsx`, `src/app/plantillas/page.tsx`, `src/app/clasificacion/page.tsx`, `src/app/partidos/page.tsx`, `src/app/calendario/page.tsx`, `src/app/page.tsx`, `src/app/club/*` |
| **Rediseño limpio de `/partidos` y enlaces Maps directos en sedes** | Eliminado el selector duplicado de equipos y el acordeón de 6 categorías dentro de `/partidos`: se muestra directamente el equipo elegido en `CategoryTeamSelectorBar` con `Pendientes`/`Finalizados` en la cabecera junto al nombre de equipo (sin la pastilla `Próx: J4`), la fecha `dd/MM/yyyy` y hora junto a `J#` en todas las tarjetas (sin fila intermedia), y el nombre del pabellón con icono `<MapPin />` enlazado directamente a Google Maps sustituyendo los botones `"Cómo llegar"`/`"Mapa"` en `/partidos`, `/calendario`, `/`, `MatchActaModal` y `/club/desplazamientos`. | `src/app/partidos/page.tsx`, `src/app/calendario/page.tsx`, `src/app/page.tsx`, `src/components/MatchActaModal.tsx`, `src/app/club/desplazamientos/page.tsx` |
| **Formato global de fechas `dd/MM/yyyy`** | Helper `formatDisplayDate` y `formatMadridDate` en `Europe/Madrid` normalizados a `dd/MM/yyyy` en toda la web pública e intranet, manteniendo `YYYY-MM-DD` solo en `<input type="date">`, ordenaciones y payloads/consultas de API/BD. | `src/lib/date-utils.ts`, `src/components/TopMarquee.tsx`, `src/app/**` |
| **Retirada de enlaces redundantes a Autorizaciones LOPD** | Eliminados los botones/enlaces a `"Autorizaciones LOPD"` / `"Acceso legado Secretariado"` en `/acceso`, `"Portal de Autorizaciones"` en `Footer.tsx`, y `"Autorizaciones"` en el menú lateral (`ClubShell.tsx`) y dashboard (`/club`), centralizando el alta con firma OTP en `/inscripcion`, la gestión familiar en `/mi-club` y la administración en `Jugadoras/es` (`/club/censo`). | `src/app/acceso/page.tsx`, `src/components/Footer.tsx`, `src/components/intranet/ClubShell.tsx`, `src/app/club/page.tsx` |

---

## 12. Tablas Nuevas/Actualizadas en Neon (`dev-intranet`)

* `intranet_training_sessions`: añadidas columnas `assigned_coach_id`, `taken_by`, `taken_at`.
* `intranet_attendance_reminders`: control y deduplicación de avisos a los 15 minutos sin pasar lista (`UNIQUE (team_season_id, madrid_date, scheduled_start_time, coach_email)`).
* `intranet_match_schedules`: programación consensuada de partidos (`proposed_date`, `proposed_time`, `court_code`, `venue_override`, `locality_override`, `departure_time_madrid`, `schedule_status`, `notes`).
* `intranet_courts` (Sergio Scariolo): pistas normalizadas a `P1`, `P2`, `P3`.
* `intranet_team_seasons` e `intranet_category_registration_links`: ampliados a **28 equipos** (incorporando los 12 equipos oficiales de **Alevín** y **Benjamín** en FAVB: `team-am-rojo`, `team-am-negro`, `team-af-rojo`, `team-af-negro`, `team-af-azul`, `team-af-rosa`, `team-af-verde`, `team-af-blanco`, `team-af-gris`, `team-bm`, `team-bf-rojo`, `team-bf-negro`).

---

## 13. Refuerzo Técnico, Seguridad y Accesibilidad Impeccable (`2026-11-24`)

| Especificación | Implementación y Criterio de Control | Archivos Clave |
| :--- | :--- | :--- |
| **Accesibilidad y Focus Trap** | Focus trap, retorno de foco automático y geometría brutalista `0px` con `shadow-brutal-dark` implementados en `IntranetModal`, `/club/censo`, `/autorizaciones` y `/admin/consentimientos`. | `IntranetModal.tsx`, `src/app/club/censo/page.tsx`, `src/app/autorizaciones/page.tsx`, `src/app/admin/consentimientos/page.tsx` |
| **Asociación de Etiquetas y Formularios** | Asociación explícita `<label htmlFor>` en todos los formularios de `/mi-club*` y `/club/*` (accesibilidad a lectores de pantalla). | `src/app/mi-club/**/*`, `src/app/club/**/*` |
| **Protección de Datos y Mayoría de Edad** | Bloqueo de cambio a mayoría de edad por menores en `complete_onboarding_profile`; aislamiento estricto de alcance `EQUIPO` en `approve_registration`, `census` y `attendance`. | `src/app/api/intranet/registration/route.ts`, `src/lib/intranet/rbac.ts` |
| **Mitigación DoS y Limpieza OAuth** | Corrección de lockout potencial DoS en `/api/intranet/auth/login` y retirada definitiva del backend e interfaz de Microsoft OAuth (Google OAuth exclusivo). | `src/app/api/intranet/auth/login/route.ts`, `src/app/api/intranet/auth/oauth/[provider]/route.ts` |
