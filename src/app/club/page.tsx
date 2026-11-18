'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeftRight,
  ArrowRight,
  Building2,
  Bus,
  Calendar,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useClubSession } from '@/components/intranet/ClubShell';
import {
  INITIAL_TEAM_SEASONS,
  ROLES_CATALOG,
  type RoleCode,
} from '@/lib/intranet/catalog';
import { formatMadridDate } from '@/lib/date-utils';

interface QuickActionCard {
  id: string;
  title: string;
  description: string;
  href: string;
  badge: string;
  icon: LucideIcon;
  visible: boolean;
  accent?: boolean;
}

const ROLE_META_MAP = new Map(ROLES_CATALOG.map((r) => [r.code, r]));
const TEAM_META_MAP = new Map(INITIAL_TEAM_SEASONS.map((t) => [t.id, t]));

const STAFF_FUNCTION_LABELS: Record<string, string> = {
  HEAD_COACH: 'Entrenador/a Principal',
  ASSISTANT: 'Ayudante Técnico',
  DELEGATE: 'Delegado/a',
  TRAINER: 'Preparador/a',
};

export default function ClubDashboardPage() {
  const { session, hasPermission, hasAnyPermission } = useClubSession();

  const todayMadridLabel = useMemo(() => {
    const raw = formatMadridDate(new Date(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, []);

  const uniqueRoles = useMemo(() => {
    const seen = new Set<RoleCode>();
    const list: Array<{ code: RoleCode; name: string; description: string }> = [];
    for (const r of session.roles) {
      if (seen.has(r.roleCode)) continue;
      seen.add(r.roleCode);
      const meta = ROLE_META_MAP.get(r.roleCode);
      list.push({
        code: r.roleCode,
        name: meta?.name || r.roleCode,
        description: meta?.description || '',
      });
    }
    return list;
  }, [session.roles]);

  const assignedTeams = useMemo(() => {
    const byTeam = new Map<string, { id: string; name: string; division: string; fnLabel: string | null }>();
    for (const sa of session.staffAssignments) {
      const meta = TEAM_META_MAP.get(sa.teamSeasonId);
      byTeam.set(sa.teamSeasonId, {
        id: sa.teamSeasonId,
        name: meta?.name || sa.teamSeasonId,
        division: meta?.division || '',
        fnLabel: STAFF_FUNCTION_LABELS[sa.staffFunction] || null,
      });
    }
    for (const teamId of session.staffTeamIds) {
      if (!byTeam.has(teamId)) {
        const meta = TEAM_META_MAP.get(teamId);
        byTeam.set(teamId, {
          id: teamId,
          name: meta?.name || teamId,
          division: meta?.division || '',
          fnLabel: null,
        });
      }
    }
    return Array.from(byTeam.values());
  }, [session.staffAssignments, session.staffTeamIds]);

  const hasGlobalScope = useMemo(
    () =>
      session.isPresident ||
      session.roles.some(
        (r) =>
          !r.teamSeasonId &&
          ['DIRECTIVO', 'COORDINADOR', 'TESORERIA', 'SECRETARIA'].includes(r.roleCode)
      ),
    [session.isPresident, session.roles]
  );

  const quickCards = useMemo<QuickActionCard[]>(
    () =>
      [
        {
          id: 'asistencia',
          title: 'Pasar Asistencia Hoy',
          description:
            'Registra presencia, retrasos, lesiones o ausencias justificadas en entrenamientos y partidos.',
          href: '/club/asistencia',
          badge: 'Diario',
          icon: ClipboardCheck,
          visible: hasAnyPermission(['attendance.take', 'attendance.reports']),
          accent: true,
        },
        {
          id: 'censo',
          title: 'Censo de Deportistas',
          description:
            'Consulta plantillas, fichas deportivas, contactos de emergencia y estado de invitaciones.',
          href: '/club/censo',
          badge: 'Plantillas',
          icon: Users,
          visible: hasPermission('athlete.view_basic'),
        },
        {
          id: 'desplazamientos',
          title: 'Desplazamientos',
          description:
            'Organiza salidas, horarios de concentración, autobuses y vehículos autorizados.',
          href: '/club/desplazamientos',
          badge: 'Logística',
          icon: Bus,
          visible: hasAnyPermission(['trip.view', 'trip.manage']),
        },
        {
          id: 'sustituciones',
          title: 'Sustituciones de Técnicos',
          description:
            'Solicita cobertura en entrenamientos o asigna entrenadores sustitutos disponibles.',
          href: '/club/sustituciones',
          badge: 'Cobertura',
          icon: ArrowLeftRight,
          visible: hasAnyPermission(['substitution.request', 'substitution.assign']),
        },
        {
          id: 'pagos',
          title: 'Pagos y Tesorería',
          description:
            'Controla cuotas de temporada, cobros, recibos, artículos y becas/descuentos.',
          href: '/club/pagos',
          badge: 'Económico',
          icon: CreditCard,
          visible: hasAnyPermission([
            'payments.view',
            'payments.record',
            'products.manage',
            'discounts.manage',
          ]),
        },
        {
          id: 'estructura',
          title: 'Estructura y Horarios',
          description:
            'Administra temporadas, pabellones, pistas asignadas y propuestas de cambio horario.',
          href: '/club/estructura',
          badge: 'Planificación',
          icon: Building2,
          visible: hasAnyPermission([
            'venue.manage',
            'schedule.manage',
            'schedule.propose',
            'season.manage',
          ]),
        },
        {
          id: 'autorizaciones',
          title: 'Autorizaciones LOPD',
          description:
            'Revisa firmas de derechos de imagen, desplazamientos oficiales y justificantes PDF.',
          href: '/admin/consentimientos',
          badge: 'Normativa',
          icon: FileCheck2,
          visible: hasAnyPermission(['consent.manage', 'consent.view_status']),
        },
        {
          id: 'gobierno',
          title: 'Gobierno y Auditoría',
          description:
            'Gestión de personal, permisos granulares, invitaciones de staff y registro de actividad.',
          href: '/club/gobierno',
          badge: 'Presidencia',
          icon: ShieldCheck,
          visible: session.isPresident || hasPermission('audit.view'),
        },
      ].filter((card) => card.visible),
    [hasAnyPermission, hasPermission, session.isPresident]
  );

  return (
    <div className="space-y-6">
      {/* Cabecera de bienvenida */}
      <section className="bg-surface-container border border-white/10 p-5 sm:p-6 shadow-[4px_4px_0px_0px_#0e0e0e]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-tertiary">
              <span className="inline-flex items-center gap-1.5 font-label-sm uppercase tracking-widest text-primary font-bold">
                <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{todayMadridLabel}</span>
              </span>
              <span className="text-white/20" aria-hidden="true">•</span>
              <span className="text-[11px] uppercase tracking-wider">
                Hora oficial Europe/Madrid
              </span>
            </div>

            <h1 className="font-display-xl text-3xl sm:text-4xl uppercase tracking-wide text-on-surface leading-tight break-words">
              Bienvenido, {session.user.name}
            </h1>
            <p className="text-sm text-tertiary max-w-2xl">
              Panel operativo del C.D. Voleibol San Pedro. Aquí tienes acceso directo a los módulos autorizados para tus cargos y equipos activos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {session.user.totpEnabled ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>2FA Activo</span>
              </span>
            ) : (
              <Link
                href="/acceso?step=2fa"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold uppercase tracking-wider text-on-surface transition-colors"
              >
                <KeyRound className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span>Activar 2FA</span>
              </Link>
            )}

            {session.isMemberPortal && (
              <Link
                href="/mi-club"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high hover:border-primary border border-white/15 text-xs font-bold uppercase tracking-wider text-on-surface transition-colors"
              >
                <UserCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span>Portal Familias</span>
              </Link>
            )}
          </div>
        </div>

        {/* Cargos y equipos asignados */}
        <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-container-low border border-white/5 p-4">
            <h2 className="font-label-sm text-[11px] uppercase tracking-widest text-primary font-bold mb-2.5">
              Cargos y Roles Activos
            </h2>
            {uniqueRoles.length > 0 ? (
              <div className="space-y-2">
                {uniqueRoles.map((role) => (
                  <div key={role.code} className="flex items-start gap-2.5">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary-container text-white shrink-0 mt-0.5">
                      {role.name}
                    </span>
                    {role.description && (
                      <p className="text-xs text-tertiary leading-snug">{role.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-tertiary">
                Personal técnico asignado directamente a equipos.
              </p>
            )}
          </div>

          <div className="bg-surface-container-low border border-white/5 p-4">
            <h2 className="font-label-sm text-[11px] uppercase tracking-widest text-primary font-bold mb-2.5">
              Ámbito de Equipos
            </h2>
            {assignedTeams.length > 0 ? (
              <ul className="space-y-2">
                {assignedTeams.map((team) => (
                  <li
                    key={team.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-xs bg-surface-container px-3 py-2 border border-white/5"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-on-surface block truncate">{team.name}</span>
                      {team.division && (
                        <span className="text-[11px] text-tertiary block truncate">
                          {team.division}
                        </span>
                      )}
                    </div>
                    {team.fnLabel && (
                      <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-surface-container-high text-tertiary border border-white/10 shrink-0">
                        {team.fnLabel}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : hasGlobalScope ? (
              <p className="text-xs text-on-surface/90 leading-relaxed">
                Acceso con <strong className="text-primary">ámbito global de club</strong> en todos los equipos de la temporada vigente según tus permisos asignados.
              </p>
            ) : (
              <p className="text-xs text-tertiary">
                Sin equipos específicos asignados por el momento.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Accesos rápidos según permisos */}
      <section aria-labelledby="quick-modules-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-primary-container" aria-hidden="true" />
            <h2
              id="quick-modules-heading"
              className="font-headline-sm text-base sm:text-lg uppercase tracking-wider text-on-surface"
            >
              Accesos Rápidos
            </h2>
          </div>
          <span className="text-xs text-tertiary">
            {quickCards.length} {quickCards.length === 1 ? 'módulo disponible' : 'módulos disponibles'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {quickCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.id}
                href={card.href}
                className={`group flex flex-col justify-between p-5 border transition-all duration-200 shadow-[4px_4px_0px_0px_#0e0e0e] hover:-translate-y-0.5 ${
                  card.accent
                    ? 'bg-gradient-to-br from-primary-container/20 via-surface-container to-surface-container border-primary-container/60 hover:border-primary-container'
                    : 'bg-surface-container border-white/10 hover:border-primary-container/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div
                      className={`w-10 h-10 flex items-center justify-center border ${
                        card.accent
                          ? 'bg-primary-container text-white border-primary-container'
                          : 'bg-surface-container-high text-primary border-white/10 group-hover:bg-primary-container group-hover:text-white group-hover:border-primary-container transition-colors'
                      }`}
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-label-sm uppercase tracking-widest font-bold bg-surface-container-low text-tertiary border border-white/10">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="font-headline text-base font-bold text-on-surface group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-tertiary mt-1.5 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-label-md uppercase tracking-wider font-bold text-primary">
                  <span>Abrir módulo</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
