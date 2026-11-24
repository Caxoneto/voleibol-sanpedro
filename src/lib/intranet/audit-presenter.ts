import { getSimplifiedPermissionLabel, ROLES_CATALOG, type RoleCode } from './catalog';

export interface AuditLogPresenterInput {
  action: string;
  module: string;
  actorEmail: string;
  targetType?: string | null;
  targetId?: string | null;
  detailsJson?: Record<string, unknown>;
}

export interface PresentedAuditLog {
  summary: string;
  moduleLabel: string;
  hasTechnicalDetails: boolean;
}

const ROLE_MAP = new Map(ROLES_CATALOG.map((r) => [r.code, r.name]));

const MODULE_LABELS: Record<string, string> = {
  Auth: 'Acceso',
  Gobernanza: 'Gobierno y Permisos',
  Estructura: 'Cuadrante',
  Cuadrante: 'Cuadrante',
  Asistencia: 'Asistencia',
  Sustituciones: 'Sustituciones',
  Desplazamientos: 'Desplazamientos',
  Deportistas: 'Jugadoras/es',
  Censo: 'Jugadoras/es',
  Inscripciones: 'Inscripciones',
  Pagos: 'Pagos y Tesorería',
  Comunicación: 'Streaming y Comunicación',
  Autorizaciones: 'Autorizaciones RGPD',
  LOPIVI: 'Protección al Menor (LOPIVI)',
};

export const AUDIT_MODULE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos los módulos' },
  { value: 'Auth', label: 'Acceso e Inicio de Sesión' },
  { value: 'Gobernanza', label: 'Gobierno y Permisos' },
  { value: 'Asistencia', label: 'Asistencia' },
  { value: 'Sustituciones', label: 'Sustituciones' },
  { value: 'Desplazamientos', label: 'Desplazamientos' },
  { value: 'Estructura', label: 'Cuadrante' },
  { value: 'Inscripciones', label: 'Inscripciones y Enlaces' },
  { value: 'Deportistas', label: 'Jugadoras/es' },
  { value: 'Pagos', label: 'Pagos y Tesorería' },
  { value: 'Comunicación', label: 'Streaming y Comunicación' },
  { value: 'LOPIVI', label: 'Protección al Menor (LOPIVI)' },
];

function str(val: unknown): string {
  return typeof val === 'string' ? val.trim() : '';
}

function roleName(code: string): string {
  return ROLE_MAP.get(code as RoleCode) || code;
}

/**
 * Traduce un evento técnico de `intranet_audit_logs` a una frase clara en español
 * comprensible sin conocimientos técnicos.
 */
export function presentAuditLog(entry: AuditLogPresenterInput): PresentedAuditLog {
  const action = String(entry.action || '').trim();
  const d = entry.detailsJson || {};
  const moduleLabel = MODULE_LABELS[entry.module] || entry.module || 'General';
  const hasTechnicalDetails = Object.keys(d).length > 0 || Boolean(entry.targetId);

  switch (action) {
    case 'LOGIN_PASSWORD':
      return { summary: 'Inició sesión con correo/usuario y contraseña.', moduleLabel, hasTechnicalDetails };
    case 'LOGIN_MAGIC_LINK':
      return { summary: 'Inició sesión mediante enlace mágico enviado al correo.', moduleLabel, hasTechnicalDetails };
    case 'LOGIN_OAUTH':
    case 'LOGIN_OAUTH_GOOGLE':
    case 'LOGIN_OAUTH_MICROSOFT':
      return {
        summary: `Inició sesión con cuenta externa (${
          str(d.provider) ||
          (action === 'LOGIN_OAUTH_GOOGLE'
            ? 'Google'
            : action === 'LOGIN_OAUTH_MICROSOFT'
            ? 'Microsoft'
            : 'OAuth')
        }).`,
        moduleLabel,
        hasTechnicalDetails,
      };
    case 'LOGIN_FAILED':
      return { summary: 'Intento fallido de inicio de sesión.', moduleLabel, hasTechnicalDetails };
    case 'LOGIN_BLOCKED_PENDING_APPROVAL':
      return { summary: 'Intentó acceder antes de que la administración aprobase su alta.', moduleLabel, hasTechnicalDetails };
    case 'LOGOUT':
      return { summary: 'Cerró su sesión en la intranet.', moduleLabel, hasTechnicalDetails };

    case 'INVITE_STAFF':
      return {
        summary: `Invitó al miembro de staff ${str(d.email) || str(entry.targetId)} como ${roleName(str(d.roleCode))}.`,
        moduleLabel,
        hasTechnicalDetails,
      };
    case 'REVOKE_INVITATION':
    case 'REVOKE_STAFF_INVITATION':
      return { summary: `Revocó una invitación de staff pendiente.`, moduleLabel, hasTechnicalDetails };
    case 'ACCEPT_INVITATION':
      return { summary: 'Activó su cuenta mediante enlace de invitación.', moduleLabel, hasTechnicalDetails };
    case 'TOGGLE_USER_STATUS':
      return {
        summary: `${str(d.status) === 'SUSPENDED' ? 'Suspendió' : 'Activó'} la cuenta de acceso de un miembro.`,
        moduleLabel,
        hasTechnicalDetails,
      };
    case 'SUSPEND_STAFF':
      return { summary: 'Suspendió el acceso de un miembro del staff.', moduleLabel, hasTechnicalDetails };
    case 'ACTIVATE_STAFF':
      return { summary: 'Reactivó la cuenta de acceso de un miembro del staff.', moduleLabel, hasTechnicalDetails };
    case 'ASSIGN_STAFF_TEAMS':
      return { summary: 'Actualizó los equipos asignados a un miembro del staff.', moduleLabel, hasTechnicalDetails };
    case 'SET_USER_ROLES':
      return { summary: 'Actualizó los roles asignados a un miembro del staff.', moduleLabel, hasTechnicalDetails };
    case 'TOGGLE_ROLE_PERMISSION':
      return {
        summary: `${d.enabled === false ? 'Retiró' : 'Concedió'} el permiso «${getSimplifiedPermissionLabel(
          str(d.permissionCode) || str(entry.targetId)
        )}» al rol ${roleName(str(d.roleCode))}.`,
        moduleLabel,
        hasTechnicalDetails,
      };
    case 'UPSERT_PERMISSION_OVERRIDE':
    case 'CREATE_PERMISSION_OVERRIDE':
      return {
        summary: `${str(d.effect) === 'DENY' ? 'Denegó' : 'Concedió'} una excepción individual para «${getSimplifiedPermissionLabel(
          str(d.permissionCode)
        )}».`,
        moduleLabel,
        hasTechnicalDetails,
      };
    case 'REVOKE_PERMISSION_OVERRIDE':
      return { summary: 'Revocó una excepción individual de permisos.', moduleLabel, hasTechnicalDetails };
    case 'TRANSFER_PRESIDENCY':
      return { summary: `Traspasó la Presidencia del club a otro miembro de staff.`, moduleLabel, hasTechnicalDetails };
    case 'TRANSFER_PRESIDENCY_FAILED':
      return { summary: 'Intento fallido de traspaso de Presidencia.', moduleLabel, hasTechnicalDetails };
    case 'BOOTSTRAP_PRESIDENT':
      return { summary: 'Inicializó la cuenta principal de Presidencia del club.', moduleLabel, hasTechnicalDetails };
    case 'PROVISION_DEV_ADMIN':
      return { summary: 'Creó o actualizó una cuenta administrativa de pruebas en desarrollo.', moduleLabel, hasTechnicalDetails };

    case 'STREAMING_START':
      return {
        summary: `Inició una retransmisión en directo${str(d.matchTitle) ? `: ${str(d.matchTitle)}` : ''}.`,
        moduleLabel,
        hasTechnicalDetails,
      };
    case 'STREAMING_STOP':
      return {
        summary: 'Finalizó la retransmisión en directo y guardó el enlace si correspondía.',
        moduleLabel,
        hasTechnicalDetails,
      };
    case 'STREAMING_SAVE_RECORDING':
      return { summary: 'Añadió o actualizó un vídeo de partido en diferido.', moduleLabel, hasTechnicalDetails };
    case 'STREAMING_REMOVE_RECORDING':
      return { summary: 'Eliminó el enlace de grabación de un partido.', moduleLabel, hasTechnicalDetails };

    case 'OPEN_TRAINING_SESSION':
      return { summary: `Abrió una sesión de entrenamiento (${str(d.madridDate) || 'hoy'}).`, moduleLabel, hasTechnicalDetails };
    case 'SAVE_ATTENDANCE':
      return {
        summary: `Guardó el pase de lista de asistencia (${Number(d.recordsCount || 0)} deportistas).`,
        moduleLabel,
        hasTechnicalDetails,
      };
    case 'CANCEL_TRAINING_SESSION':
      return { summary: 'Canceló una sesión de entrenamiento.', moduleLabel, hasTechnicalDetails };
    case 'ATTENDANCE_REMINDER_15M':
      return {
        summary: `Se envió aviso al entrenador tras pasar 15 minutos sin registrar asistencia (${str(d.coachEmail) || 'entrenador'}).`,
        moduleLabel,
        hasTechnicalDetails,
      };

    case 'REQUEST_SUBSTITUTION':
    case 'CREATE_SUBSTITUTION':
      return { summary: 'Registró una cobertura o sustitución de entrenador.', moduleLabel, hasTechnicalDetails };
    case 'ASSIGN_SUBSTITUTE':
    case 'ASSIGN_DIRECT_SUBSTITUTION':
      return { summary: 'Asignó un entrenador sustituto con permiso temporal de asistencia.', moduleLabel, hasTechnicalDetails };
    case 'CANCEL_SUBSTITUTION':
      return { summary: 'Canceló una sustitución de entrenador.', moduleLabel, hasTechnicalDetails };

    case 'ASSIGN_MATCH_STAFF':
      return { summary: 'Asignó cuerpo técnico a un partido.', moduleLabel, hasTechnicalDetails };
    case 'REMOVE_MATCH_ASSIGNMENT':
    case 'REMOVE_MATCH_STAFF':
      return { summary: 'Retiró la asignación de un técnico en un partido.', moduleLabel, hasTechnicalDetails };
    case 'UPSERT_STAFF_TRIP':
      return { summary: 'Creó o actualizó una expedición de desplazamiento.', moduleLabel, hasTechnicalDetails };
    case 'DELETE_STAFF_TRIP':
      return { summary: 'Eliminó una expedición de desplazamiento.', moduleLabel, hasTechnicalDetails };
    case 'UPSERT_MATCH_SCHEDULE':
    case 'UPSERT_HOME_MATCH_SCHEDULE':
      return {
        summary: `Actualizó fecha, hora o estado (${str(d.scheduleStatus) || 'horario'}) de un partido.`,
        moduleLabel,
        hasTechnicalDetails,
      };

    case 'CREATE_TRAINING_SLOT':
    case 'UPDATE_TRAINING_SLOT':
      return { summary: 'Creó o modificó un horario semanal de entrenamiento.', moduleLabel, hasTechnicalDetails };
    case 'DELETE_TRAINING_SLOT':
      return { summary: 'Eliminó una franja de entrenamiento semanal.', moduleLabel, hasTechnicalDetails };
    case 'CREATE_VENUE':
      return { summary: 'Añadió una nueva instalación deportiva.', moduleLabel, hasTechnicalDetails };
    case 'CREATE_COURT':
      return { summary: 'Añadió una pista deportiva al cuadrante.', moduleLabel, hasTechnicalDetails };
    case 'CREATE_VENUE_CLOSURE':
      return { summary: 'Registró un cierre o festivo de instalación.', moduleLabel, hasTechnicalDetails };
    case 'DELETE_VENUE_CLOSURE':
      return { summary: 'Eliminó un cierre o festivo de instalación.', moduleLabel, hasTechnicalDetails };
    case 'CREATE_SEASON':
      return { summary: 'Creó una nueva temporada deportiva.', moduleLabel, hasTechnicalDetails };
    case 'TOGGLE_TEAM_ACTIVE':
      return { summary: 'Activó o desactivó un equipo de la temporada.', moduleLabel, hasTechnicalDetails };
    case 'PROPOSE_SCHEDULE_CHANGE':
      return { summary: 'Propuso un cambio de horario para un equipo.', moduleLabel, hasTechnicalDetails };
    case 'RESOLVE_SCHEDULE_PROPOSAL_APPROVED':
      return { summary: 'Aprobó una propuesta de cambio de horario.', moduleLabel, hasTechnicalDetails };
    case 'RESOLVE_SCHEDULE_PROPOSAL_REJECTED':
      return { summary: 'Rechazó una propuesta de cambio de horario.', moduleLabel, hasTechnicalDetails };

    case 'CREATE_REGISTRATION_LINK':
      return { summary: `Creó enlace de auto-inscripción para ${str(d.categoryLabel) || 'una categoría'}.`, moduleLabel, hasTechnicalDetails };
    case 'TOGGLE_REGISTRATION_LINK':
      return { summary: `${d.isActive ? 'Activó' : 'Pausó'} un enlace de auto-inscripción.`, moduleLabel, hasTechnicalDetails };
    case 'REGENERATE_REGISTRATION_LINK':
      return { summary: 'Regeneró el código de un enlace de auto-inscripción.', moduleLabel, hasTechnicalDetails };
    case 'SELF_REGISTER_ATHLETE':
      return { summary: `Completó una auto-inscripción online (${str(d.categoryLabel) || 'deportista'}).`, moduleLabel, hasTechnicalDetails };
    case 'APPROVE_REGISTRATION':
    case 'APPROVE_REGISTRATION_REQUEST':
      return { summary: `Aprobó el alta de ${str(d.athleteName) || 'un/a deportista'} y notificó su acceso.`, moduleLabel, hasTechnicalDetails };
    case 'REJECT_REGISTRATION':
    case 'REJECT_REGISTRATION_REQUEST':
      return { summary: 'Rechazó una solicitud de auto-inscripción.', moduleLabel, hasTechnicalDetails };

    case 'CREATE_OR_UPDATE_ATHLETE':
    case 'UPDATE_ATHLETE':
      return { summary: 'Actualizó la ficha de un/a deportista.', moduleLabel, hasTechnicalDetails };
    case 'CREATE_ATHLETE':
      return { summary: 'Creó la ficha de un/a nuevo/a deportista.', moduleLabel, hasTechnicalDetails };
    case 'VIEW_SENSITIVE_ATHLETE_DATA':
    case 'VIEW_SENSITIVE_ATHLETE':
      return { summary: 'Consultó datos sensibles (DNI/salud) de un/a deportista.', moduleLabel, hasTechnicalDetails };
    case 'DEACTIVATE_ATHLETE':
      return { summary: 'Dio de baja o cambió el estado de un/a deportista.', moduleLabel, hasTechnicalDetails };
    case 'SYNC_CENSUS_SOURCES':
      return { summary: 'Sincronizó las fichas de deportistas con las fuentes oficiales del club.', moduleLabel, hasTechnicalDetails };
    case 'SEND_CENSUS_INVITATION':
    case 'SEND_BATCH_CENSUS_INVITATIONS':
      return { summary: 'Envió enlace o invitación de acceso desde Jugadoras/es (registro histórico).', moduleLabel, hasTechnicalDetails };
    case 'IMPORT_FEELSPORTS_CSV':
      return { summary: 'Importó datos históricos de deportistas mediante CSV (registro histórico).', moduleLabel, hasTechnicalDetails };

    case 'CREATE_ENROLLMENT':
      return { summary: 'Asignó una cuota o producto de pago a un/a deportista.', moduleLabel, hasTechnicalDetails };
    case 'RECORD_PAYMENT':
    case 'RECORD_MANUAL_PAYMENT':
      return { summary: 'Registró un cobro manual y generó su recibo.', moduleLabel, hasTechnicalDetails };
    case 'DOWNLOAD_PAYMENT_RECEIPT':
      return { summary: 'Descargó el justificante PDF de un pago.', moduleLabel, hasTechnicalDetails };
    case 'VOID_PAYMENT':
      return { summary: 'Anuló un cobro registrado.', moduleLabel, hasTechnicalDetails };
    case 'WAIVE_CHARGE':
      return { summary: 'Condonó un cargo pendiente.', moduleLabel, hasTechnicalDetails };
    case 'UPSERT_PRODUCT':
      return { summary: 'Creó o modificó un producto de cuota o servicio.', moduleLabel, hasTechnicalDetails };
    case 'UPSERT_PRICE_PLAN':
      return { summary: 'Creó o modificó una modalidad de pago (mensual, trimestral, anual...).', moduleLabel, hasTechnicalDetails };
    case 'UPSERT_DISCOUNT_RULE':
      return { summary: 'Creó o modificó una regla de descuento o beca.', moduleLabel, hasTechnicalDetails };
    case 'TOGGLE_DISCOUNT_RULE':
      return { summary: 'Activó o desactivó una regla de descuento.', moduleLabel, hasTechnicalDetails };
    case 'IMPORT_FEELSPORTS_PAYMENTS_CSV':
      return { summary: 'Importó histórico de cobros mediante CSV (registro histórico).', moduleLabel, hasTechnicalDetails };
    case 'SEND_PAYMENT_REMINDERS':
      return {
        summary: `Envió ${Number(d.sent || d.sentCount || 0)} aviso(s) de pago pendiente por correo electrónico.`,
        moduleLabel,
        hasTechnicalDetails,
      };

    case 'VIEW_CONSENT_RECEIPT':
      return { summary: 'Consultó el resguardo de autorización RGPD en la zona privada.', moduleLabel, hasTechnicalDetails };
    case 'COMPLETE_ONBOARDING_PROFILE':
      return { summary: 'Completó los datos iniciales de acceso en /mi-club.', moduleLabel, hasTechnicalDetails };
    case 'RECORD_INTEGRATED_CONSENT':
      return { summary: 'Firmó la autorización RGPD desde la zona privada.', moduleLabel, hasTechnicalDetails };

    case 'PUBLIC_LOPIVI_REPORT':
    case 'RECEIVE_PUBLIC_LOPIVI_REPORT':
      return { summary: 'Se recibió una nueva comunicación en el Canal LOPIVI.', moduleLabel, hasTechnicalDetails };
    case 'CREATE_MANUAL_LOPIVI_INCIDENT':
      return { summary: 'Registró manualmente un expediente LOPIVI (vía presencial/teléfono/email).', moduleLabel, hasTechnicalDetails };
    case 'VIEW_LOPIVI_INCIDENTS':
    case 'VIEW_LOPIVI_INCIDENTS_REGISTRY':
      return { summary: 'Consultó el registro confidencial de expedientes LOPIVI.', moduleLabel, hasTechnicalDetails };
    case 'UPDATE_LOPIVI_INCIDENT':
      return { summary: 'Actualizó medidas, seguimiento o cierre de un expediente LOPIVI.', moduleLabel, hasTechnicalDetails };

    default:
      if (action.startsWith('LOGIN_OAUTH')) {
        return { summary: 'Inició sesión con proveedor externo.', moduleLabel, hasTechnicalDetails };
      }
      if (action.startsWith('RESOLVE_SCHEDULE_PROPOSAL_')) {
        return { summary: 'Resolvió una propuesta de cambio de horario.', moduleLabel, hasTechnicalDetails };
      }
      return {
        summary: action.replace(/_/g, ' ').toLowerCase(),
        moduleLabel,
        hasTechnicalDetails,
      };
  }
}
