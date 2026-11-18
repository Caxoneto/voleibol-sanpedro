import { CLUB_INFO, CLUB_TEAMS_META, CLUB_CATEGORIES_META } from '@/lib/club-info';

export type RoleCode =
  | 'PRESIDENTE'
  | 'DIRECTIVO'
  | 'COORDINADOR'
  | 'TESORERIA'
  | 'SECRETARIA'
  | 'ENTRENADOR'
  | 'AYUDANTE'
  | 'DELEGADO'
  | 'TUTOR'
  | 'JUGADOR';

export type PermissionScope = 'GLOBAL' | 'EQUIPO' | 'PROPIO';

export type PermissionCode =
  | 'staff.manage'
  | 'permissions.manage'
  | 'team.assign_staff'
  | 'data.bulk_export'
  | 'presidency.transfer'
  | 'audit.view'
  | 'season.manage'
  | 'venue.manage'
  | 'schedule.manage'
  | 'schedule.propose'
  | 'attendance.take'
  | 'attendance.edit_past'
  | 'session.manage'
  | 'attendance.reports'
  | 'substitution.request'
  | 'substitution.assign'
  | 'trip.manage'
  | 'trip.view'
  | 'athlete.view_basic'
  | 'athlete.view_emergency'
  | 'athlete.view_sensitive'
  | 'athlete.edit'
  | 'athlete.import'
  | 'athlete.deactivate'
  | 'invitation.send'
  | 'registration.approve'
  | 'consent.view_status'
  | 'consent.manage'
  | 'payments.view'
  | 'payments.record'
  | 'payments.void'
  | 'products.manage'
  | 'discounts.manage'
  | 'discounts.apply'
  | 'payments.reports'
  | 'payments.team_status'
  | 'comms.team'
  | 'comms.all'
  | 'web.streaming'
  | 'web.favb_sync';

export interface RoleMeta {
  code: RoleCode;
  name: string;
  description: string;
  isStaff: boolean;
}

export interface PermissionMeta {
  code: PermissionCode;
  module: string;
  name: string;
  defaultScope: PermissionScope;
  isPresidentOnly: boolean;
}

export interface VenueCourt {
  id: string;
  venueName: string;
  address: string;
  mapsUrl?: string;
  locality: string;
  courts: Array<{ id: string; name: string; surfaceType: string }>;
}

export interface TeamSeasonMeta {
  id: string;
  categoryId: string;
  name: string;
  division: string;
  season: string;
  association: 'FAVB' | 'AFADE';
  gender: 'MASCULINO' | 'FEMENINO';
  sortOrder: number;
}

export interface AttendanceStateMeta {
  code: 'PRESENTE' | 'RETRASO' | 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA' | 'LESIONADO_ASISTE';
  label: string;
  badgeClass: string;
}

export interface AbsenceReasonMeta {
  code: 'LESION' | 'ENFERMEDAD' | 'ESTUDIOS' | 'FAMILIAR' | 'OTRO';
  label: string;
}

export const ROLES_CATALOG: RoleMeta[] = [
  { code: 'PRESIDENTE', name: 'Presidente', description: 'Máxima autoridad ejecutiva y legal del club', isStaff: true },
  { code: 'DIRECTIVO', name: 'Directivo', description: 'Miembro de la Junta Directiva con competencias delegadas', isStaff: true },
  { code: 'COORDINADOR', name: 'Coordinador Deportivo', description: 'Supervisión de categorías, entrenadores y planificación técnica', isStaff: true },
  { code: 'TESORERIA', name: 'Tesorería', description: 'Gestión económica, cobros, pagos y contabilidad', isStaff: true },
  { code: 'SECRETARIA', name: 'Secretaría', description: 'Gestión administrativa, licencias y registros', isStaff: true },
  { code: 'ENTRENADOR', name: 'Entrenador Principal', description: 'Dirección técnica de equipos y gestión de convocatorias', isStaff: true },
  { code: 'AYUDANTE', name: 'Entrenador Ayudante', description: 'Apoyo técnico y asistente en entrenamientos y partidos', isStaff: true },
  { code: 'DELEGADO', name: 'Delegado de Equipo', description: 'Gestión de actas, desplazamientos y apoyo logístico', isStaff: true },
  { code: 'TUTOR', name: 'Tutor / Padre / Madre', description: 'Representante legal de deportistas menores de edad', isStaff: false },
  { code: 'JUGADOR', name: 'Deportista / Jugador', description: 'Miembro federado o inscrito en las plantillas del club', isStaff: false },
];

export const PERMISSIONS_CATALOG: PermissionMeta[] = [
  // Presidencia / Gobernanza
  { code: 'staff.manage', module: 'Gobernanza', name: 'Gestión de Personal y Cargos', defaultScope: 'GLOBAL', isPresidentOnly: true },
  { code: 'permissions.manage', module: 'Gobernanza', name: 'Asignación de Permisos', defaultScope: 'GLOBAL', isPresidentOnly: true },
  { code: 'team.assign_staff', module: 'Gobernanza', name: 'Asignación de Staff a Equipos', defaultScope: 'GLOBAL', isPresidentOnly: true },
  { code: 'data.bulk_export', module: 'Gobernanza', name: 'Exportación Masiva de Datos', defaultScope: 'GLOBAL', isPresidentOnly: true },
  { code: 'presidency.transfer', module: 'Gobernanza', name: 'Traspaso de Presidencia', defaultScope: 'GLOBAL', isPresidentOnly: true },
  { code: 'audit.view', module: 'Gobernanza', name: 'Auditoría y Logs de Actividad', defaultScope: 'GLOBAL', isPresidentOnly: false },
  { code: 'season.manage', module: 'Gobernanza', name: 'Gestión de Temporadas y Calendarios', defaultScope: 'GLOBAL', isPresidentOnly: false },
  { code: 'venue.manage', module: 'Gobernanza', name: 'Gestión de Pabellones y Pistas', defaultScope: 'GLOBAL', isPresidentOnly: false },

  // Competición / Entrenamientos
  { code: 'schedule.manage', module: 'Competición', name: 'Gestión de Calendario y Horarios', defaultScope: 'GLOBAL', isPresidentOnly: false },
  { code: 'schedule.propose', module: 'Competición', name: 'Propuesta de Cambio de Horarios', defaultScope: 'EQUIPO', isPresidentOnly: false },
  { code: 'attendance.take', module: 'Competición', name: 'Registro de Asistencia', defaultScope: 'EQUIPO', isPresidentOnly: false },
  { code: 'attendance.edit_past', module: 'Competición', name: 'Edición de Asistencia Histórica', defaultScope: 'EQUIPO', isPresidentOnly: false },
  { code: 'session.manage', module: 'Competición', name: 'Creación y Edición de Sesiones', defaultScope: 'EQUIPO', isPresidentOnly: false },
  { code: 'attendance.reports', module: 'Competición', name: 'Informes de Asistencia', defaultScope: 'EQUIPO', isPresidentOnly: false },
  { code: 'substitution.request', module: 'Competición', name: 'Solicitud de Sustituciones', defaultScope: 'EQUIPO', isPresidentOnly: false },
  { code: 'substitution.assign', module: 'Competición', name: 'Asignación de Sustitutos', defaultScope: 'EQUIPO', isPresidentOnly: false },
  { code: 'trip.manage', module: 'Competición', name: 'Gestión de Desplazamientos y Viajes', defaultScope: 'EQUIPO', isPresidentOnly: false },
  { code: 'trip.view', module: 'Competición', name: 'Visualización de Desplazamientos', defaultScope: 'EQUIPO', isPresidentOnly: false },

  // Deportistas
  { code: 'athlete.view_basic', module: 'Deportistas', name: 'Ver Datos Básicos de Deportistas', defaultScope: 'EQUIPO', isPresidentOnly: false },
  { code: 'athlete.view_emergency', module: 'Deportistas', name: 'Ver Contactos de Emergencia y Médicos', defaultScope: 'EQUIPO', isPresidentOnly: false },
  { code: 'athlete.view_sensitive', module: 'Deportistas', name: 'Ver Datos Sensibles y Documentación', defaultScope: 'GLOBAL', isPresidentOnly: false },
  { code: 'athlete.edit', module: 'Deportistas', name: 'Edición de Ficha de Deportista', defaultScope: 'EQUIPO', isPresidentOnly: false },
  { code: 'athlete.import', module: 'Deportistas', name: 'Importación de Deportistas (CSV)', defaultScope: 'GLOBAL', isPresidentOnly: false },
  { code: 'athlete.deactivate', module: 'Deportistas', name: 'Baja y Desactivación de Deportistas', defaultScope: 'GLOBAL', isPresidentOnly: false },
  { code: 'invitation.send', module: 'Deportistas', name: 'Envío de Invitaciones de Acceso', defaultScope: 'EQUIPO', isPresidentOnly: false },
  { code: 'registration.approve', module: 'Deportistas', name: 'Aprobación de Inscripciones', defaultScope: 'GLOBAL', isPresidentOnly: false },
  { code: 'consent.view_status', module: 'Deportistas', name: 'Ver Estado de Consentimientos LOPD', defaultScope: 'EQUIPO', isPresidentOnly: false },
  { code: 'consent.manage', module: 'Deportistas', name: 'Gestión de Consentimientos y Firmas', defaultScope: 'GLOBAL', isPresidentOnly: false },

  // Pagos y Tienda
  { code: 'payments.view', module: 'Pagos', name: 'Ver Estado de Pagos Propios', defaultScope: 'PROPIO', isPresidentOnly: false },
  { code: 'payments.record', module: 'Pagos', name: 'Registro de Pagos y Cuotas', defaultScope: 'GLOBAL', isPresidentOnly: false },
  { code: 'payments.void', module: 'Pagos', name: 'Anulación y Devolución de Pagos', defaultScope: 'GLOBAL', isPresidentOnly: false },
  { code: 'products.manage', module: 'Pagos', name: 'Gestión de Productos y Artículos', defaultScope: 'GLOBAL', isPresidentOnly: false },
  { code: 'discounts.manage', module: 'Pagos', name: 'Gestión de Descuentos y Becas', defaultScope: 'GLOBAL', isPresidentOnly: false },
  { code: 'discounts.apply', module: 'Pagos', name: 'Aplicación de Descuentos', defaultScope: 'GLOBAL', isPresidentOnly: false },
  { code: 'payments.reports', module: 'Pagos', name: 'Informes Financieros y Remesas', defaultScope: 'GLOBAL', isPresidentOnly: false },
  { code: 'payments.team_status', module: 'Pagos', name: 'Ver Estado de Pagos del Equipo', defaultScope: 'EQUIPO', isPresidentOnly: false },

  // Comunicación y Web
  { code: 'comms.team', module: 'Comunicación', name: 'Comunicación con el Equipo', defaultScope: 'EQUIPO', isPresidentOnly: false },
  { code: 'comms.all', module: 'Comunicación', name: 'Comunicación Global con el Club', defaultScope: 'GLOBAL', isPresidentOnly: false },
  { code: 'web.streaming', module: 'Comunicación', name: 'Control de Streaming y Video', defaultScope: 'GLOBAL', isPresidentOnly: false },
  { code: 'web.favb_sync', module: 'Comunicación', name: 'Sincronización con FAVB / Actas', defaultScope: 'GLOBAL', isPresidentOnly: false },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleCode, Array<{ code: PermissionCode; scope: PermissionScope }>> = {
  PRESIDENTE: PERMISSIONS_CATALOG.map((p) => ({ code: p.code, scope: 'GLOBAL' })),
  DIRECTIVO: [
    { code: 'attendance.reports', scope: 'GLOBAL' },
    { code: 'trip.view', scope: 'GLOBAL' },
    { code: 'athlete.view_basic', scope: 'GLOBAL' },
    { code: 'consent.view_status', scope: 'GLOBAL' },
  ],
  COORDINADOR: [
    { code: 'venue.manage', scope: 'GLOBAL' },
    { code: 'schedule.manage', scope: 'GLOBAL' },
    { code: 'attendance.take', scope: 'GLOBAL' },
    { code: 'attendance.edit_past', scope: 'GLOBAL' },
    { code: 'session.manage', scope: 'GLOBAL' },
    { code: 'attendance.reports', scope: 'GLOBAL' },
    { code: 'substitution.request', scope: 'PROPIO' },
    { code: 'substitution.assign', scope: 'GLOBAL' },
    { code: 'trip.manage', scope: 'GLOBAL' },
    { code: 'trip.view', scope: 'GLOBAL' },
    { code: 'athlete.view_basic', scope: 'GLOBAL' },
    { code: 'athlete.view_emergency', scope: 'GLOBAL' },
    { code: 'invitation.send', scope: 'GLOBAL' },
    { code: 'consent.view_status', scope: 'GLOBAL' },
    { code: 'payments.team_status', scope: 'GLOBAL' },
    { code: 'comms.team', scope: 'GLOBAL' },
  ],
  TESORERIA: [
    { code: 'athlete.view_basic', scope: 'GLOBAL' },
    { code: 'payments.view', scope: 'GLOBAL' },
    { code: 'payments.record', scope: 'GLOBAL' },
    { code: 'payments.void', scope: 'GLOBAL' },
    { code: 'products.manage', scope: 'GLOBAL' },
    { code: 'discounts.manage', scope: 'GLOBAL' },
    { code: 'discounts.apply', scope: 'GLOBAL' },
    { code: 'payments.reports', scope: 'GLOBAL' },
  ],
  SECRETARIA: [
    { code: 'athlete.view_basic', scope: 'GLOBAL' },
    { code: 'athlete.view_emergency', scope: 'GLOBAL' },
    { code: 'athlete.edit', scope: 'GLOBAL' },
    { code: 'athlete.import', scope: 'GLOBAL' },
    { code: 'athlete.deactivate', scope: 'GLOBAL' },
    { code: 'invitation.send', scope: 'GLOBAL' },
    { code: 'registration.approve', scope: 'GLOBAL' },
    { code: 'consent.view_status', scope: 'GLOBAL' },
    { code: 'consent.manage', scope: 'GLOBAL' },
    { code: 'comms.team', scope: 'GLOBAL' },
    { code: 'comms.all', scope: 'GLOBAL' },
  ],
  ENTRENADOR: [
    { code: 'schedule.propose', scope: 'EQUIPO' },
    { code: 'attendance.take', scope: 'EQUIPO' },
    { code: 'session.manage', scope: 'EQUIPO' },
    { code: 'attendance.reports', scope: 'EQUIPO' },
    { code: 'substitution.request', scope: 'PROPIO' },
    { code: 'trip.view', scope: 'EQUIPO' },
    { code: 'athlete.view_basic', scope: 'EQUIPO' },
    { code: 'athlete.view_emergency', scope: 'EQUIPO' },
    { code: 'invitation.send', scope: 'EQUIPO' },
    { code: 'consent.view_status', scope: 'EQUIPO' },
    { code: 'payments.team_status', scope: 'EQUIPO' },
    { code: 'comms.team', scope: 'EQUIPO' },
  ],
  AYUDANTE: [
    { code: 'attendance.take', scope: 'EQUIPO' },
    { code: 'attendance.reports', scope: 'EQUIPO' },
    { code: 'substitution.request', scope: 'PROPIO' },
    { code: 'trip.view', scope: 'EQUIPO' },
    { code: 'athlete.view_basic', scope: 'EQUIPO' },
    { code: 'athlete.view_emergency', scope: 'EQUIPO' },
    { code: 'consent.view_status', scope: 'EQUIPO' },
  ],
  DELEGADO: [
    { code: 'attendance.reports', scope: 'EQUIPO' },
    { code: 'trip.view', scope: 'EQUIPO' },
    { code: 'athlete.view_basic', scope: 'EQUIPO' },
    { code: 'athlete.view_emergency', scope: 'EQUIPO' },
    { code: 'consent.view_status', scope: 'EQUIPO' },
    { code: 'comms.team', scope: 'EQUIPO' },
  ],
  TUTOR: [
    { code: 'payments.view', scope: 'PROPIO' },
    { code: 'athlete.view_basic', scope: 'PROPIO' },
    { code: 'consent.view_status', scope: 'PROPIO' },
  ],
  JUGADOR: [
    { code: 'payments.view', scope: 'PROPIO' },
    { code: 'athlete.view_basic', scope: 'PROPIO' },
    { code: 'consent.view_status', scope: 'PROPIO' },
  ],
};

export const CURRENT_SEASON_SEED = {
  id: '2026-2027',
  name: '2026/2027',
  startDate: '2026-09-01',
  endDate: '2027-06-30',
};

export const INITIAL_VENUES_AND_COURTS: VenueCourt[] = [
  {
    id: 'venue-scariolo',
    venueName: CLUB_INFO.venueName,
    address: CLUB_INFO.venueAddress,
    mapsUrl: CLUB_INFO.venueMapsUrl,
    locality: 'San Pedro Alcántara',
    courts: [
      { id: 'court-scariolo-central', name: 'Pista Central', surfaceType: 'Pista completa' },
      { id: 'court-scariolo-1', name: 'Pista 1 (Transversal)', surfaceType: 'Media pista / transversal' },
      { id: 'court-scariolo-2', name: 'Pista 2 (Transversal)', surfaceType: 'Media pista / transversal' },
    ],
  },
  {
    id: 'venue-elena-benitez',
    venueName: 'Pabellón Elena Benítez',
    address: 'C/ Fuente Nueva s/n, 29670 San Pedro Alcántara, Málaga',
    locality: 'San Pedro Alcántara',
    courts: [
      { id: 'court-elena-central', name: 'Pista Central', surfaceType: 'Pista completa' },
    ],
  },
  {
    id: 'venue-guadaiza',
    venueName: 'Polideportivo El Arquillo / IES Guadaiza',
    address: 'San Pedro Alcántara, Málaga',
    locality: 'San Pedro Alcántara',
    courts: [
      { id: 'court-guadaiza-1', name: 'Pista Cubierta / Exterior', surfaceType: 'Pista completa' },
    ],
  },
];

const categoryAssociationMap = new Map(CLUB_CATEGORIES_META.map((c) => [c.id, c.association || 'FAVB']));

export const INITIAL_TEAM_SEASONS: TeamSeasonMeta[] = CLUB_TEAMS_META.map((t, index) => {
  const association = (categoryAssociationMap.get(t.categoryId) as 'FAVB' | 'AFADE') || 'FAVB';
  const nameUpper = t.name.toUpperCase();
  const gender: 'MASCULINO' | 'FEMENINO' = nameUpper.includes('MASCULINO') ? 'MASCULINO' : 'FEMENINO';
  return {
    id: t.id,
    categoryId: t.categoryId,
    name: t.name,
    division: t.division,
    season: t.season,
    association,
    gender,
    sortOrder: index + 1,
  };
});

export const ATTENDANCE_STATES: AttendanceStateMeta[] = [
  { code: 'PRESENTE', label: 'Presente', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { code: 'RETRASO', label: 'Con Retraso', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  { code: 'FALTA_JUSTIFICADA', label: 'Falta Justificada', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { code: 'FALTA_INJUSTIFICADA', label: 'Falta Injustificada', badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' },
  { code: 'LESIONADO_ASISTE', label: 'Lesionado (Asiste)', badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
];

export const ABSENCE_REASONS: AbsenceReasonMeta[] = [
  { code: 'LESION', label: 'Lesión' },
  { code: 'ENFERMEDAD', label: 'Enfermedad' },
  { code: 'ESTUDIOS', label: 'Estudios / Exámenes' },
  { code: 'FAMILIAR', label: 'Motivos Familiares' },
  { code: 'OTRO', label: 'Otro Motivo' },
];
