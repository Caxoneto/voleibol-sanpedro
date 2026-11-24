'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  Bell,
  Building2,
  Bus,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Radio,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { ROLES_CATALOG, type RoleCode } from '@/lib/intranet/catalog';
import { useStreaming } from '@/lib/use-streaming';

export interface IntranetMeUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  emailVerified: boolean;
  totpEnabled: boolean;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
}

export interface IntranetMeRole {
  id: string;
  roleCode: RoleCode;
  teamSeasonId: string | null;
  validFrom: string;
  validTo: string | null;
}

export interface IntranetMeStaffAssignment {
  id: string;
  teamSeasonId: string;
  staffFunction: 'HEAD_COACH' | 'ASSISTANT' | 'DELEGATE' | 'TRAINER';
}

export interface IntranetMeSession {
  user: IntranetMeUser;
  isPresident: boolean;
  isStaff: boolean;
  isMemberPortal: boolean;
  requiresTwoFactorSetup: boolean;
  requiresTwoFactorChallenge: boolean;
  twoFactorVerified: boolean;
  roles: IntranetMeRole[];
  staffAssignments: IntranetMeStaffAssignment[];
  staffTeamIds: string[];
  ownAthleteId: string | null;
  guardianAthleteIds: string[];
  effectivePermissions: string[];
  staffEffectivePermissions?: string[];
  effectivePermissionScopes?: Record<string, string>;
  pendingRegistrationsCount?: number;
  pendingLopiviCount?: number;
}

export interface IntranetMeResponse {
  success: boolean;
  authenticated: boolean;
  presidentExists: boolean;
  oauth: {
    google: boolean;
    microsoft?: boolean;
  };
  session: IntranetMeSession | null;
}

interface ClubSessionContextValue {
  session: IntranetMeSession;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
}

const ClubSessionContext = createContext<ClubSessionContextValue | null>(null);

export function useClubSession(): ClubSessionContextValue {
  const ctx = useContext(ClubSessionContext);
  if (!ctx) {
    throw new Error('useClubSession debe usarse dentro de <ClubShell>.');
  }
  return ctx;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  visible: boolean;
  badgeCount?: number;
  isLive?: boolean;
}

const ROLE_NAME_MAP = new Map(ROLES_CATALOG.map((r) => [r.code, r.name]));

export default function ClubShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const { status: streamingStatus } = useStreaming();

  const loadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<IntranetMeSession | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (loadedRef.current) return;
    const controller = new AbortController();

    async function loadSession() {
      try {
        const res = await fetch('/api/intranet/auth/me', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) {
          routerRef.current.replace('/acceso');
          return;
        }
        const data = (await res.json()) as IntranetMeResponse;
        const s = data?.session;
        if (
          !data?.authenticated ||
          !s ||
          s.requiresTwoFactorSetup ||
          s.requiresTwoFactorChallenge
        ) {
          routerRef.current.replace('/acceso');
          return;
        }
        if (!s.isStaff) {
          routerRef.current.replace(s.isMemberPortal ? '/mi-club' : '/acceso');
          return;
        }
        loadedRef.current = true;
        setSession(s);
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        routerRef.current.replace('/acceso');
      }
    }

    loadSession();
    const handleRefreshMe = () => {
      void fetch('/api/intranet/auth/me', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: IntranetMeResponse | null) => {
          if (data?.authenticated && data.session) {
            setSession(data.session);
          }
        })
        .catch(() => {});
    };
    window.addEventListener('cdv-refresh-me', handleRefreshMe);
    return () => {
      controller.abort();
      window.removeEventListener('cdv-refresh-me', handleRefreshMe);
    };
  }, []);

  const permSet = useMemo(() => {
    const raw = session?.staffEffectivePermissions || session?.effectivePermissions || [];
    const scopes = session?.effectivePermissionScopes;
    if (!scopes) return new Set(raw);
    return new Set(
      raw.filter((code) => scopes[code] !== 'PROPIO' || code === 'substitution.request')
    );
  }, [session]);

  const canAutoCheckReminders = Boolean(session?.isPresident || permSet.has('attendance.reports'));

  useEffect(() => {
    if (!session || !canAutoCheckReminders) return;
    let cancelled = false;
    const pingReminders = () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void fetch('/api/intranet/attendance/check-reminders', {
        method: 'POST',
        keepalive: true,
      }).catch(() => {});
    };

    pingReminders();
    const timer = setInterval(pingReminders, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session, canAutoCheckReminders]);

  const contextValue = useMemo<ClubSessionContextValue | null>(() => {
    if (!session) return null;
    const hasPermission = (code: string) => session.isPresident || permSet.has(code);
    const hasAnyPermission = (codes: string[]) =>
      session.isPresident || codes.some((code) => permSet.has(code));
    return {
      session,
      hasPermission,
      hasAnyPermission,
    };
  }, [session, permSet]);

  const navItems = useMemo<NavItem[]>(() => {
    if (!session) return [];
    const hasAny = (codes: string[]) =>
      session.isPresident || codes.some((code) => permSet.has(code));

    return [
      {
        id: 'resumen',
        label: 'Resumen',
        href: '/club',
        icon: LayoutDashboard,
        visible: true,
      },
      {
        id: 'asistencia',
        label: 'Asistencia',
        href: '/club/asistencia',
        icon: ClipboardCheck,
        visible: hasAny(['attendance.take', 'attendance.reports']),
      },
      {
        id: 'sustituciones',
        label: 'Sustituciones',
        href: '/club/sustituciones',
        icon: ArrowLeftRight,
        visible: hasAny(['substitution.request', 'substitution.assign']),
      },
      {
        id: 'desplazamientos',
        label: 'Desplazamientos',
        href: '/club/desplazamientos',
        icon: Bus,
        visible: hasAny(['trip.view', 'trip.manage']),
      },
      {
        id: 'streaming',
        label: 'Streaming',
        href: '/club/streaming',
        icon: Radio,
        visible: hasAny(['web.streaming']),
        isLive: streamingStatus.active,
      },
      {
        id: 'censo',
        label: 'Jugadoras/es',
        href: '/club/censo',
        icon: Users,
        visible: hasAny(['athlete.view_basic']),
        badgeCount: session.pendingRegistrationsCount || 0,
      },
      {
        id: 'estructura',
        label: 'Cuadrante',
        href: '/club/estructura',
        icon: Building2,
        visible: hasAny([
          'venue.manage',
          'schedule.manage',
          'schedule.propose',
          'season.manage',
        ]),
      },
      {
        id: 'pagos',
        label: 'Pagos',
        href: '/club/pagos',
        icon: CreditCard,
        visible: hasAny([
          'payments.view',
          'payments.record',
          'products.manage',
          'discounts.manage',
          'payments.reports',
        ]),
      },
      {
        id: 'proteccion-menor',
        label: 'Protección Menor',
        href: '/club/proteccion-menor',
        icon: ShieldAlert,
        visible: session.isPresident,
        badgeCount: session.pendingLopiviCount || 0,
      },
      {
        id: 'gobierno',
        label: 'Gobierno',
        href: '/club/gobierno',
        icon: ShieldCheck,
        visible: session.isPresident || permSet.has('audit.view'),
      },
    ].filter((item) => item.visible);
  }, [session, permSet, streamingStatus.active]);

  const roleLabels = useMemo(() => {
    if (!session) return [];
    const unique = Array.from(new Set(session.roles.map((r) => r.roleCode)));
    return unique.map((code) => ROLE_NAME_MAP.get(code) || code);
  }, [session]);

  const isActive = (href: string) => {
    if (href === '/club') return pathname === '/club';
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/intranet/auth/logout', { method: 'POST' });
    } catch {
      // Continuar con redirección segura
    } finally {
      routerRef.current.replace('/acceso');
    }
  }

  if (loading || !session || !contextValue) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="bg-surface-container border border-white/10 px-6 py-6 flex items-center gap-3 max-w-xs w-full justify-center shadow-brutal-dark">
          <Loader2 className="w-5 h-5 text-primary-container animate-spin shrink-0" aria-hidden="true" />
          <span className="font-headline-sm text-xs uppercase tracking-wider text-on-surface font-bold">
            Cargando intranet...
          </span>
        </div>
      </div>
    );
  }

  const activeNav = navItems.find((item) => isActive(item.href)) || navItems[0];
  const primaryRole = roleLabels[0] || 'Staff';
  const extraRolesCount = Math.max(0, roleLabels.length - 1);

  const showPendingRegBanner =
    (session.pendingRegistrationsCount || 0) > 0 && !pathname?.startsWith('/club/censo');
  const showPendingLopiviBanner =
    session.isPresident &&
    (session.pendingLopiviCount || 0) > 0 &&
    !pathname?.startsWith('/club/proteccion-menor');

  return (
    <ClubSessionContext.Provider value={contextValue}>
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-clip">
        {/* Barra móvil compacta */}
        <div className="lg:hidden mb-4 bg-surface-container border border-white/10 shadow-[4px_4px_0px_0px_#0e0e0e]">
          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
            <div className="min-w-0 flex items-center gap-2.5">
              <span className="w-1.5 h-7 bg-primary-container shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-on-surface truncate">
                  {activeNav?.label || 'Intranet'}
                </p>
                <p className="text-[11px] text-tertiary truncate">
                  {session.user.name} · {primaryRole}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="club-mobile-nav"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high border border-white/15 text-xs font-label-md uppercase font-bold text-on-surface hover:border-primary-container transition-colors shrink-0 cursor-pointer"
            >
              {mobileMenuOpen ? (
                <>
                  <X className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>Cerrar</span>
                </>
              ) : (
                <>
                  <Menu className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>Menú</span>
                </>
              )}
            </button>
          </div>

          {mobileMenuOpen && (
            <nav
              id="club-mobile-nav"
              aria-label="Navegación móvil de intranet"
              className="border-t border-white/10 bg-surface-container-low px-3 py-3 space-y-2 animate-slide-in-top"
            >
              <div className="grid grid-cols-1 gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center justify-between px-3 py-2.5 text-xs font-label-md uppercase tracking-wider font-bold transition-colors border ${
                        active
                          ? 'bg-primary-container text-white border-primary-container'
                          : 'bg-surface-container text-on-surface border-white/5 hover:border-white/20'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {item.isLive && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded">
                            LIVE
                          </span>
                        )}
                        {item.badgeCount && item.badgeCount > 0 ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-400 text-black rounded-full">
                            {item.badgeCount}
                          </span>
                        ) : null}
                        <ChevronRight className="w-4 h-4 opacity-70" aria-hidden="true" />
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                {session.isMemberPortal && (
                  <Link
                    href="/mi-club"
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-surface-container-high border border-white/15 text-xs font-label-md uppercase tracking-wider font-bold text-on-surface hover:border-primary transition-colors"
                  >
                    <UserCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <span>Ir a /mi-club</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-error-container/40 hover:bg-error-container/70 border border-error/30 text-xs font-label-md uppercase tracking-wider font-bold text-error transition-colors cursor-pointer disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
                </button>
              </div>
            </nav>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Barra lateral Desktop */}
          <aside
            aria-label="Menú lateral del Staff"
            className="hidden lg:flex lg:w-60 shrink-0 flex-col bg-surface-container border border-white/10 shadow-[4px_4px_0px_0px_#0e0e0e] sticky top-28"
          >
            {/* Cabecera perfil compacta */}
            <div className="p-3.5 border-b border-white/10 bg-surface-container-low">
              <p className="font-headline text-sm font-bold text-on-surface truncate">
                {session.user.name}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-primary-container/20 text-primary border border-primary-container/40 truncate">
                  {primaryRole}
                </span>
                {extraRolesCount > 0 && (
                  <span
                    className="px-1.5 py-0.5 text-[10px] font-bold bg-surface-container-high text-tertiary border border-white/10 shrink-0"
                    title={roleLabels.join(', ')}
                  >
                    +{extraRolesCount}
                  </span>
                )}
              </div>
            </div>

            {/* Navegación principal */}
            <nav aria-label="Módulos de la intranet" className="p-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center justify-between gap-2 px-3 py-2 text-xs font-label-md uppercase tracking-wider font-bold transition-all ${
                      active
                        ? 'bg-primary-container text-white shadow-[3px_3px_0px_0px_#0e0e0e]'
                        : 'text-on-surface/85 hover:text-white hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {item.isLive && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          LIVE
                        </span>
                      )}
                      {item.badgeCount && item.badgeCount > 0 ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-400 text-black rounded-full">
                          {item.badgeCount}
                        </span>
                      ) : null}
                      {active && <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* Acciones inferiores */}
            <div className="p-2.5 border-t border-white/10 space-y-1.5 bg-surface-container-low/60">
              {session.isMemberPortal && (
                <Link
                  href="/mi-club"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-label-md uppercase tracking-wider font-bold text-on-surface transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Ir a /mi-club</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-transparent hover:bg-error-container/40 border border-white/15 hover:border-error/40 text-xs font-label-md uppercase tracking-wider font-bold text-tertiary hover:text-error transition-colors cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{loggingOut ? 'Saliendo...' : 'Cerrar sesión'}</span>
              </button>
            </div>
          </aside>

          {/* Contenido de la ruta */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            {(showPendingRegBanner || showPendingLopiviBanner) && (
              <div
                role="status"
                className="flex flex-wrap items-center justify-between gap-2 bg-amber-950/35 border border-amber-500/35 px-3.5 py-2 text-xs text-amber-100"
              >
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <Bell className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-hidden="true" />
                  {showPendingRegBanner && (
                    <span>
                      <strong>{session.pendingRegistrationsCount}</strong>{' '}
                      {session.pendingRegistrationsCount === 1
                        ? 'inscripción pendiente'
                        : 'inscripciones pendientes'}
                    </span>
                  )}
                  {showPendingLopiviBanner && (
                    <span className="text-rose-200">
                      <strong>{session.pendingLopiviCount}</strong>{' '}
                      {session.pendingLopiviCount === 1
                        ? 'comunicación LOPIVI activa'
                        : 'comunicaciones LOPIVI activas'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {showPendingRegBanner && (
                    <Link
                      href="/club/censo?tab=inscripciones"
                      className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase tracking-wider text-[10px]"
                    >
                      Revisar altas
                    </Link>
                  )}
                  {showPendingLopiviBanner && (
                    <Link
                      href="/club/proteccion-menor"
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wider text-[10px]"
                    >
                      Ver LOPIVI
                    </Link>
                  )}
                </div>
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </ClubSessionContext.Provider>
  );
}
