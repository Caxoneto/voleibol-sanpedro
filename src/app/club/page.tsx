'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftRight,
  ArrowRight,
  Building2,
  Bus,
  Calendar,
  ClipboardCheck,
  CreditCard,
  Radio,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useClubSession } from '@/components/intranet/ClubShell';
import StreamingModal from '@/components/StreamingModal';
import { useStreaming } from '@/lib/use-streaming';
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
  live?: boolean;
}

const ROLE_META_MAP = new Map(ROLES_CATALOG.map((r) => [r.code, r]));
const TEAM_META_MAP = new Map(INITIAL_TEAM_SEASONS.map((t) => [t.id, t]));

export default function ClubDashboardPage() {
  const { session, hasPermission, hasAnyPermission } = useClubSession();
  const { status: streamingStatus, updateLocalStatus } = useStreaming();
  const [streamingModalOpen, setStreamingModalOpen] = useState(false);

  const canManageStreaming = hasPermission('web.streaming');

  const todayMadridLabel = useMemo(() => {
    const raw = formatMadridDate(new Date(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, []);

  const uniqueRoles = useMemo(() => {
    const seen = new Set<RoleCode>();
    const list: Array<{ code: RoleCode; name: string }> = [];
    for (const r of session.roles) {
      if (seen.has(r.roleCode)) continue;
      seen.add(r.roleCode);
      const meta = ROLE_META_MAP.get(r.roleCode);
      list.push({
        code: r.roleCode,
        name: meta?.name || r.roleCode,
      });
    }
    return list;
  }, [session.roles]);

  const assignedTeams = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ id: string; name: string }> = [];
    for (const sa of session.staffAssignments) {
      if (seen.has(sa.teamSeasonId)) continue;
      seen.add(sa.teamSeasonId);
      const meta = TEAM_META_MAP.get(sa.teamSeasonId);
      list.push({ id: sa.teamSeasonId, name: meta?.name || sa.teamSeasonId });
    }
    for (const teamId of session.staffTeamIds) {
      if (seen.has(teamId)) continue;
      seen.add(teamId);
      const meta = TEAM_META_MAP.get(teamId);
      list.push({ id: teamId, name: meta?.name || teamId });
    }
    return list;
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
          title: 'Asistencia',
          description: 'Pase de lista en pista, invitados y alertas.',
          href: '/club/asistencia',
          badge: 'Diario',
          icon: ClipboardCheck,
          visible: hasAnyPermission(['attendance.take', 'attendance.reports']),
          accent: true,
        },
        {
          id: 'censo',
          title: 'Jugadoras/es',
          description: 'Plantillas, enlaces por categoría y validación de altas.',
          href: '/club/censo',
          badge: 'Plantillas',
          icon: Users,
          visible: hasPermission('athlete.view_basic'),
        },
        {
          id: 'streaming',
          title: 'Streaming y Vídeos',
          description: streamingStatus.active
            ? streamingStatus.matchTitle || 'Emisión en directo activa en portada.'
            : 'Publicar directos de YouTube y grabaciones.',
          href: '/club/streaming',
          badge: streamingStatus.active ? 'En directo' : 'Web',
          icon: Radio,
          visible: canManageStreaming,
          live: streamingStatus.active,
        },
        {
          id: 'desplazamientos',
          title: 'Desplazamientos',
          description: 'Cuadrante de técnicos por jornada y expediciones.',
          href: '/club/desplazamientos',
          badge: 'Logística',
          icon: Bus,
          visible: hasAnyPermission(['trip.view', 'trip.manage']),
        },
        {
          id: 'sustituciones',
          title: 'Sustituciones',
          description: 'Cobertura temporal de entrenamientos.',
          href: '/club/sustituciones',
          badge: 'Cobertura',
          icon: ArrowLeftRight,
          visible: hasAnyPermission(['substitution.request', 'substitution.assign']),
        },
        {
          id: 'pagos',
          title: 'Pagos y Cuotas',
          description: 'Cargos, cobros, descuentos y recibos PDF.',
          href: '/club/pagos',
          badge: 'Tesorería',
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
          title: 'Cuadrante',
          description: 'Temporadas, pabellones, pistas y cuadrante de horarios.',
          href: '/club/estructura',
          badge: 'Pistas',
          icon: Building2,
          visible: hasAnyPermission([
            'venue.manage',
            'schedule.manage',
            'schedule.propose',
            'season.manage',
          ]),
        },
        {
          id: 'proteccion-menor',
          title: 'Protección Menor',
          description: 'Expedientes confidenciales LOPIVI del Delegado.',
          href: '/club/proteccion-menor',
          badge: 'Delegado',
          icon: ShieldAlert,
          visible: session.isPresident,
        },
        {
          id: 'gobierno',
          title: 'Gobierno y Auditoría',
          description: 'Personal, matriz RBAC de permisos y registro.',
          href: '/club/gobierno',
          badge: 'Presidencia',
          icon: ShieldCheck,
          visible: session.isPresident || hasPermission('audit.view'),
        },
      ].filter((card) => card.visible),
    [
      canManageStreaming,
      hasAnyPermission,
      hasPermission,
      session.isPresident,
      streamingStatus.active,
      streamingStatus.matchTitle,
    ]
  );

  return (
    <div className="space-y-6">
      {/* Cabecera compacta */}
      <section className="bg-surface-container border border-white/10 p-5 sm:p-6 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 font-label-sm uppercase tracking-widest text-primary font-bold text-xs">
              <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{todayMadridLabel}</span>
            </span>
            <h1 className="font-display-xl text-3xl sm:text-4xl uppercase tracking-wide text-on-surface leading-tight break-words">
              Hola, {session.user.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canManageStreaming && (
              <button
                type="button"
                onClick={() => setStreamingModalOpen(true)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                  streamingStatus.active
                    ? 'bg-emerald-700 hover:bg-emerald-600 border-emerald-400/50 text-white'
                    : 'bg-primary-container hover:bg-cta-hover border-primary-container text-white'
                }`}
              >
                <Radio className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{streamingStatus.active ? 'Directo EN VIVO' : 'Emitir Directo'}</span>
              </button>
            )}

            {session.isMemberPortal && (
              <Link
                href="/mi-club"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:border-primary border border-white/15 text-xs font-bold uppercase tracking-wider text-on-surface transition-colors"
              >
                <UserCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span>Portal Familias</span>
              </Link>
            )}
          </div>
        </div>

        {/* Franja compacta de roles y ámbito */}
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
          {uniqueRoles.map((role) => (
            <span
              key={role.code}
              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary-container/20 text-primary border border-primary-container/40"
            >
              {role.name}
            </span>
          ))}
          <span className="text-white/20" aria-hidden="true">
            •
          </span>
          {assignedTeams.length > 0 ? (
            assignedTeams.map((team) => (
              <span
                key={team.id}
                className="px-2 py-0.5 text-[11px] font-semibold bg-surface-container-low text-on-surface/90 border border-white/10"
              >
                {team.name}
              </span>
            ))
          ) : hasGlobalScope ? (
            <span className="text-tertiary">Ámbito global del club</span>
          ) : (
            <span className="text-tertiary">Sin equipos asignados</span>
          )}
        </div>
      </section>

      {/* Accesos rápidos */}
      <section aria-labelledby="quick-modules-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-primary-container" aria-hidden="true" />
            <h2
              id="quick-modules-heading"
              className="font-headline-sm text-base sm:text-lg uppercase tracking-wider text-on-surface"
            >
              Módulos
            </h2>
          </div>
          <span className="text-xs text-tertiary">
            {quickCards.length} disponibles
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {quickCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.id}
                href={card.href}
                className={`group flex flex-col justify-between p-4 border transition-all duration-200 shadow-[4px_4px_0px_0px_#0e0e0e] hover:-translate-y-0.5 ${
                  card.live
                    ? 'bg-emerald-950/30 border-emerald-500/50 hover:border-emerald-400'
                    : card.accent
                      ? 'bg-gradient-to-br from-primary-container/20 via-surface-container to-surface-container border-primary-container/60 hover:border-primary-container'
                      : 'bg-surface-container border-white/10 hover:border-primary-container/70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 flex items-center justify-center border shrink-0 ${
                      card.live
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : card.accent
                          ? 'bg-primary-container text-white border-primary-container'
                          : 'bg-surface-container-high text-primary border-white/10 group-hover:bg-primary-container group-hover:text-white group-hover:border-primary-container transition-colors'
                    }`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-headline text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                        {card.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-label-sm uppercase tracking-wider font-bold border shrink-0 ${
                          card.live
                            ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-surface-container-low text-tertiary border-white/10'
                        }`}
                      >
                        {card.badge}
                      </span>
                    </div>
                    <p className="text-xs text-tertiary mt-1 line-clamp-1">{card.description}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-end gap-1 text-[11px] font-label-md uppercase tracking-wider font-bold text-primary">
                  <span>Abrir</span>
                  <ArrowRight
                    className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <StreamingModal
        isOpen={streamingModalOpen}
        onClose={() => setStreamingModalOpen(false)}
        isLive={streamingStatus.active}
        currentUrl={streamingStatus.url}
        matchId={streamingStatus.matchId}
        matchTitle={streamingStatus.matchTitle}
        onSuccess={updateLocalStatus}
      />
    </div>
  );
}
