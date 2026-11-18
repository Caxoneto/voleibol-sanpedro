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
  Building2,
  Bus,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  ShieldCheck,
  UserCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { ROLES_CATALOG, type RoleCode } from '@/lib/intranet/catalog';

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
}

export interface IntranetMeResponse {
  success: boolean;
  authenticated: boolean;
  presidentExists: boolean;
  oauth: {
    google: boolean;
    microsoft: boolean;
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
}

const ROLE_NAME_MAP = new Map(ROLES_CATALOG.map((r) => [r.code, r.name]));

export default function ClubShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

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
          !s.isStaff ||
          s.requiresTwoFactorSetup ||
          s.requiresTwoFactorChallenge
        ) {
          routerRef.current.replace('/acceso');
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
    return () => controller.abort();
  }, []);

  const permSet = useMemo(() => {
    const raw = session?.staffEffectivePermissions || session?.effectivePermissions || [];
    const scopes = session?.effectivePermissionScopes;
    if (!scopes) return new Set(raw);
    return new Set(
      raw.filter((code) => scopes[code] !== 'PROPIO' || code === 'substitution.request')
    );
  }, [session]);

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
        id: 'censo',
        label: 'Censo',
        href: '/club/censo',
        icon: Users,
        visible: hasAny(['athlete.view_basic']),
      },
      {
        id: 'estructura',
        label: 'Estructura',
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
        id: 'autorizaciones',
        label: 'Autorizaciones',
        href: '/admin/consentimientos',
        icon: FileCheck2,
        visible: hasAny(['consent.manage', 'consent.view_status']),
      },
      {
        id: 'gobierno',
        label: 'Gobierno',
        href: '/club/gobierno',
        icon: ShieldCheck,
        visible: session.isPresident || permSet.has('audit.view'),
      },
    ].filter((item) => item.visible);
  }, [session, permSet]);

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
      // Continuar con redirección segura aunque falle la red
    } finally {
      routerRef.current.replace('/acceso');
    }
  }

  if (loading || !session || !contextValue) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
        <div className="bg-surface-container border border-white/10 px-6 py-8 flex flex-col items-center gap-3 max-w-sm w-full text-center shadow-brutal-dark">
          <Loader2 className="w-7 h-7 text-primary-container animate-spin" aria-hidden="true" />
          <p className="font-headline-sm text-sm uppercase tracking-wider text-on-surface">
            Verificando sesión de staff
          </p>
          <p className="text-xs text-tertiary">
            Comprobando credenciales y permisos del club...
          </p>
        </div>
      </div>
    );
  }

  const activeNav = navItems.find((item) => isActive(item.href)) || navItems[0];

  return (
    <ClubSessionContext.Provider value={contextValue}>
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
        {/* Barra móvil compacta (no fija, respeta pt-28 del main global) */}
        <div className="lg:hidden mb-4 bg-surface-container border border-white/10 shadow-[4px_4px_0px_0px_#0e0e0e]">
          <div className="flex items-center justify-between gap-2 px-3.5 py-3">
            <div className="min-w-0 flex items-center gap-2.5">
              <span className="w-2 h-8 bg-primary-container shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[10px] font-label-sm uppercase tracking-widest text-primary font-bold truncate">
                  Intranet Staff · {activeNav?.label || 'Panel'}
                </p>
                <p className="text-sm font-bold text-on-surface truncate">
                  {session.user.name}
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
                  <span>Módulos</span>
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
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-white/10">
                {roleLabels.map((role) => (
                  <span
                    key={role}
                    className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-primary-container/20 text-primary border border-primary-container/40"
                  >
                    {role}
                  </span>
                ))}
              </div>

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
                      <ChevronRight className="w-4 h-4 shrink-0 opacity-70" aria-hidden="true" />
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
            className="hidden lg:flex lg:w-64 shrink-0 flex-col bg-surface-container border border-white/10 shadow-[4px_4px_0px_0px_#0e0e0e] sticky top-28"
          >
            {/* Cabecera perfil */}
            <div className="p-4 border-b border-white/10 bg-surface-container-low">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-primary-container shrink-0" aria-hidden="true" />
                <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold">
                  Intranet · Área Staff
                </span>
              </div>
              <p className="font-headline text-base font-bold text-on-surface truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-tertiary truncate mt-0.5">
                {session.user.email}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {roleLabels.map((role) => (
                  <span
                    key={role}
                    className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-primary-container/20 text-primary border border-primary-container/40"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>

            {/* Navegación principal */}
            <nav aria-label="Módulos de la intranet" className="p-2.5 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-label-md uppercase tracking-wider font-bold transition-all ${
                      active
                        ? 'bg-primary-container text-white shadow-[3px_3px_0px_0px_#0e0e0e]'
                        : 'text-on-surface/85 hover:text-white hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {active && <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                  </Link>
                );
              })}
            </nav>

            {/* Acciones inferiores */}
            <div className="p-3 border-t border-white/10 space-y-2 bg-surface-container-low/60">
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
          <div className="flex-1 min-w-0 w-full">{children}</div>
        </div>
      </div>
    </ClubSessionContext.Provider>
  );
}
