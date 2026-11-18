'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { CLUB_INFO } from '@/lib/club-info';
import { ROLES_CATALOG } from '@/lib/intranet/catalog';
import { formatMadridDate } from '@/lib/date-utils';
import type { IntranetMeResponse, IntranetMeSession } from '@/components/intranet/ClubShell';

type LoginTab = 'password' | 'magic';

interface InvitationInfo {
  id: string;
  email: string;
  targetType: 'STAFF' | 'GUARDIAN' | 'ATHLETE';
  roleCodes: string[];
  teamSeasonIds: string[];
  athleteId: string | null;
  expiresAt: string;
}

const ROLE_NAME_MAP = new Map(ROLES_CATALOG.map((r) => [r.code, r.name]));

const ERROR_MESSAGES: Record<string, string> = {
  enlace_invalido: 'El enlace de acceso no es válido.',
  enlace_caducado: 'El enlace mágico ha caducado o ya fue utilizado. Solicita uno nuevo.',
  usa_tu_invitacion: 'Tu cuenta aún no está activada. Utiliza el enlace de invitación recibido por correo.',
  cuenta_suspendida: 'Tu cuenta está suspendida o inactiva. Contacta con la directiva del club.',
  error_interno: 'No se pudo completar el inicio de sesión. Inténtalo de nuevo.',
  proveedor_no_soportado: 'El proveedor de acceso seleccionado no está soportado.',
  oauth_no_configurado_google: 'El acceso con Google no está configurado en el servidor.',
  oauth_no_configurado_microsoft: 'El acceso con Microsoft no está configurado en el servidor.',
  oauth_estado_invalido: 'La sesión de verificación OAuth caducó. Inténtalo de nuevo.',
  oauth_csrf: 'Error de validación de seguridad en el acceso OAuth.',
  oauth_token_fallido: 'No se pudo validar el token con el proveedor externo.',
  oauth_sin_token: 'El proveedor no devolvió un token válido.',
  oauth_perfil_fallido: 'No se pudo leer tu perfil de correo en el proveedor externo.',
  oauth_email_no_verificado: 'Tu correo externo debe estar verificado para iniciar sesión.',
  cuenta_no_invitada: 'No existe ninguna cuenta activa ni invitación vigente asociada a ese correo. No hay registro abierto.',
  cuenta_inactiva: 'Tu cuenta no se encuentra activa en el club.',
  oauth_error_interno: 'Ocurrió un error al procesar el acceso OAuth.',
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12Z"
      />
      <path
        fill="#34A853"
        d="M3.5 7.4l3.2 2.3C7.6 7.5 9.6 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.4 12 2.4c-3.7 0-6.9 2.1-8.5 5Z"
      />
      <path
        fill="#FBBC05"
        d="M12 21.6c2.5 0 4.6-.8 6.2-2.3l-3-2.4c-.8.6-1.9 1-3.2 1-2.5 0-4.6-1.7-5.3-4l-3.2 2.5c1.6 3.1 4.8 5.2 8.5 5.2Z"
      />
      <path
        fill="#4285F4"
        d="M21.2 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.2-1 2.2-2 2.8l3 2.4c1.8-1.6 2.7-4.1 2.7-7.5Z"
      />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
      <rect x="2" y="2" width="9.2" height="9.2" fill="#F25022" />
      <rect x="12.8" y="2" width="9.2" height="9.2" fill="#7FBA00" />
      <rect x="2" y="12.8" width="9.2" height="9.2" fill="#00A4EF" />
      <rect x="12.8" y="12.8" width="9.2" height="9.2" fill="#FFB900" />
    </svg>
  );
}

function AccesoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite')?.trim() || '';
  const stepParam = searchParams.get('step')?.trim() || '';
  const errorParam = searchParams.get('error')?.trim() || '';

  const routerRef = useRef(router);
  routerRef.current = router;

  const [loadingMe, setLoadingMe] = useState(true);
  const [presidentExists, setPresidentExists] = useState(true);
  const [oauthConfig, setOauthConfig] = useState({ google: false, microsoft: false });
  const [session, setSession] = useState<IntranetMeSession | null>(null);
  const [globalError, setGlobalError] = useState<string>(
    errorParam ? ERROR_MESSAGES[errorParam] || 'Error de autenticación.' : ''
  );
  const [globalSuccess, setGlobalSuccess] = useState('');

  // Login normal
  const [activeTab, setActiveTab] = useState<LoginTab>('password');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);

  // Magic link
  const [magicEmail, setMagicEmail] = useState('');
  const [magicBusy, setMagicBusy] = useState(false);

  // Bootstrap Presidente
  const [bsAdminUser, setBsAdminUser] = useState('');
  const [bsAdminPassword, setBsAdminPassword] = useState('');
  const [bsName, setBsName] = useState('');
  const [bsEmail, setBsEmail] = useState('');
  const [bsPhone, setBsPhone] = useState('');
  const [bsPassword, setBsPassword] = useState('');
  const [showBsPassword, setShowBsPassword] = useState(false);
  const [bsBusy, setBsBusy] = useState(false);

  // Invitación
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InvitationInfo | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [invName, setInvName] = useState('');
  const [invPhone, setInvPhone] = useState('');
  const [invPassword, setInvPassword] = useState('');
  const [showInvPassword, setShowInvPassword] = useState(false);
  const [invBusy, setInvBusy] = useState(false);

  // 2FA Setup / Verify
  const [totpSecret, setTotpSecret] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [totpBusy, setTotpBusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [pendingRedirectTo, setPendingRedirectTo] = useState('/club');
  const [copiedKey, setCopiedKey] = useState<'secret' | 'uri' | 'backup' | null>(null);

  const meLoadedRef = useRef(false);
  const inviteFetchedForRef = useRef<string>('');
  const twoFaFetchedForRef = useRef<string>('');

  const fetchMe = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch('/api/intranet/auth/me', {
      cache: 'no-store',
      signal,
    });
    if (!res.ok) {
      throw new Error('No se pudo comprobar el estado de acceso.');
    }
    const data = (await res.json()) as IntranetMeResponse;
    setPresidentExists(Boolean(data.presidentExists));
    setOauthConfig({
      google: Boolean(data.oauth?.google),
      microsoft: Boolean(data.oauth?.microsoft),
    });
    setSession(data.session || null);
    return data;
  }, []);

  useEffect(() => {
    if (meLoadedRef.current) return;
    const controller = new AbortController();

    async function init() {
      try {
        await fetchMe(controller.signal);
        meLoadedRef.current = true;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setGlobalError('No se pudo conectar con el servicio de acceso del club.');
      } finally {
        if (!controller.signal.aborted) {
          setLoadingMe(false);
        }
      }
    }

    init();
    return () => controller.abort();
  }, [fetchMe]);

  useEffect(() => {
    if (errorParam) {
      setGlobalError(ERROR_MESSAGES[errorParam] || 'No se pudo completar el acceso.');
    }
  }, [errorParam]);

  // Cargar datos de invitación si viene ?invite=TOKEN
  useEffect(() => {
    if (!inviteToken || loadingMe || !presidentExists) return;
    if (inviteFetchedForRef.current === inviteToken) return;
    const controller = new AbortController();

    async function loadInvite() {
      setInviteLoading(true);
      setInviteError('');
      try {
        const res = await fetch(
          `/api/intranet/auth/invite?invite=${encodeURIComponent(inviteToken)}`,
          { cache: 'no-store', signal: controller.signal }
        );
        const data = await res.json();
        if (!res.ok || !data?.success) {
          setInviteInfo(null);
          setInviteError(
            data?.error || 'La invitación no es válida, ya fue usada o ha caducado.'
          );
        } else {
          inviteFetchedForRef.current = inviteToken;
          setInviteInfo(data.invitation as InvitationInfo);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setInviteError('No se pudo verificar el enlace de invitación.');
      } finally {
        if (!controller.signal.aborted) {
          setInviteLoading(false);
        }
      }
    }

    loadInvite();
    return () => controller.abort();
  }, [inviteToken, loadingMe, presidentExists]);

  const needsTwoFactorView = useMemo(() => {
    if (!session) return false;
    if (session.requiresTwoFactorSetup || session.requiresTwoFactorChallenge) return true;
    if (stepParam === '2fa' && !session.user.totpEnabled) return true;
    if (backupCodes && backupCodes.length > 0) return true;
    return false;
  }, [session, stepParam, backupCodes]);

  // Obtener secreto TOTP si estamos en vista 2FA y el usuario aún no tiene TOTP activado
  useEffect(() => {
    if (!needsTwoFactorView || !session || session.user.totpEnabled || backupCodes) return;
    if (twoFaFetchedForRef.current === session.user.id) return;
    const controller = new AbortController();

    async function load2faSetup() {
      setTotpLoading(true);
      try {
        const res = await fetch('/api/intranet/auth/2fa', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await res.json();
        if (res.ok && data?.success && !data.totpEnabled) {
          twoFaFetchedForRef.current = session!.user.id;
          setTotpSecret(String(data.secret || ''));
          setTotpUri(String(data.otpauthUri || ''));
        } else if (!res.ok) {
          setGlobalError(data?.error || 'No se pudo inicializar la configuración 2FA.');
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setGlobalError('Error al generar la clave TOTP de dos pasos.');
      } finally {
        if (!controller.signal.aborted) {
          setTotpLoading(false);
        }
      }
    }

    load2faSetup();
    return () => controller.abort();
  }, [needsTwoFactorView, session, backupCodes]);

  async function copyText(text: string, target: 'secret' | 'uri' | 'backup') {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(target);
      setTimeout(() => setCopiedKey((prev) => (prev === target ? null : prev)), 2200);
    } catch {
      setGlobalError('No se pudo copiar al portapapeles. Cópialo manualmente.');
    }
  }

  async function handleBootstrapSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError('');
    setGlobalSuccess('');
    if (bsPassword.length < 10) {
      setGlobalError('La contraseña del Presidente debe tener al menos 10 caracteres.');
      return;
    }
    setBsBusy(true);
    try {
      const res = await fetch('/api/intranet/auth/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUser: bsAdminUser,
          adminPassword: bsAdminPassword,
          name: bsName,
          email: bsEmail,
          phone: bsPhone,
          password: bsPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setGlobalError(data?.error || 'No se pudo inicializar la cuenta de Presidente.');
        return;
      }
      setGlobalSuccess('Presidencia inicializada. Configura ahora tu doble factor (2FA) obligatorio.');
      await fetchMe();
    } catch {
      setGlobalError('Error de conexión al inicializar la Presidencia.');
    } finally {
      setBsBusy(false);
    }
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError('');
    setGlobalSuccess('');
    if (!invName.trim() || invPassword.length < 8) {
      setGlobalError('Indica tu nombre completo y una contraseña de al menos 8 caracteres.');
      return;
    }
    setInvBusy(true);
    try {
      const res = await fetch('/api/intranet/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: inviteToken,
          name: invName.trim(),
          phone: invPhone.trim() || undefined,
          password: invPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setGlobalError(data?.error || 'No se pudo activar tu invitación.');
        return;
      }
      if (data.requiresTwoFactorSetup) {
        await fetchMe();
        return;
      }
      routerRef.current.replace(data.redirectTo || '/club');
    } catch {
      setGlobalError('Error de red al activar la invitación.');
    } finally {
      setInvBusy(false);
    }
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError('');
    setGlobalSuccess('');
    setLoginBusy(true);
    try {
      const res = await fetch('/api/intranet/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setGlobalError(data?.error || 'Credenciales incorrectas.');
        return;
      }
      if (data.requiresTwoFactorChallenge || data.requiresTwoFactorSetup) {
        await fetchMe();
        return;
      }
      routerRef.current.replace(data.redirectTo || '/club');
    } catch {
      setGlobalError('Error de conexión al iniciar sesión.');
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleMagicSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError('');
    setGlobalSuccess('');
    setMagicBusy(true);
    try {
      const res = await fetch('/api/intranet/auth/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: magicEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setGlobalError(data?.error || 'No se pudo enviar el enlace mágico.');
        return;
      }
      setGlobalSuccess(
        data.message ||
          'Si el correo está autorizado en el club, recibirás un enlace directo de acceso en unos segundos.'
      );
    } catch {
      setGlobalError('Error de red al solicitar el enlace mágico.');
    } finally {
      setMagicBusy(false);
    }
  }

  async function handleTwoFactorSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setGlobalError('');
    setGlobalSuccess('');
    setTotpBusy(true);
    const isSetup = !session.user.totpEnabled;
    try {
      const res = await fetch('/api/intranet/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isSetup ? 'enable' : 'verify',
          code: totpCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setGlobalError(data?.error || 'Código incorrecto.');
        return;
      }

      if (isSetup && Array.isArray(data.backupCodes)) {
        setBackupCodes(data.backupCodes as string[]);
        setPendingRedirectTo(data.redirectTo || (session.isStaff ? '/club' : '/mi-club'));
        setGlobalSuccess('Autenticación en dos pasos (2FA) activada correctamente.');
        return;
      }

      routerRef.current.replace(data.redirectTo || (session.isStaff ? '/club' : '/mi-club'));
    } catch {
      setGlobalError('Error de red al verificar el código 2FA.');
    } finally {
      setTotpBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/intranet/auth/logout', { method: 'POST' });
    } finally {
      twoFaFetchedForRef.current = '';
      setBackupCodes(null);
      setTotpSecret('');
      setTotpUri('');
      setTotpCode('');
      setGlobalSuccess('');
      await fetchMe();
    }
  }

  const formattedSecret = useMemo(
    () => (totpSecret ? totpSecret.replace(/(.{4})/g, '$1 ').trim() : ''),
    [totpSecret]
  );

  if (loadingMe) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center px-4 py-12">
        <div className="bg-surface-container border border-white/10 p-8 max-w-sm w-full text-center shadow-[4px_4px_0px_0px_#0e0e0e] flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-primary-container animate-spin" aria-hidden="true" />
          <p className="font-headline-sm text-sm uppercase tracking-wider text-on-surface">
            Cargando acceso del club
          </p>
        </div>
      </div>
    );
  }

  const canAccessConsents =
    session?.isPresident ||
    session?.effectivePermissions.includes('consent.manage') ||
    session?.effectivePermissions.includes('consent.view_status');

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-10 overflow-x-hidden">
      {/* Cabecera */}
      <div className="mb-6 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-primary-container/20 border border-primary-container/40 text-primary text-[10px] font-label-sm uppercase tracking-widest font-bold mb-2">
          <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{CLUB_INFO.name} · Intranet y Familias</span>
        </div>
        <h1 className="font-display-xl text-3xl sm:text-5xl uppercase tracking-wide text-on-surface leading-none">
          Acceso Unificado
        </h1>
        <p className="text-sm text-tertiary mt-2">
          Entrada privada para Directiva, Cuerpo Técnico, Familias y Deportistas del club.
        </p>
      </div>

      {/* Alertas globales */}
      {globalError && (
        <div
          role="alert"
          className="mb-5 bg-error-container/50 border border-error/50 text-on-error-container px-4 py-3 text-xs sm:text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">{globalError}</p>
        </div>
      )}

      {globalSuccess && (
        <div
          role="status"
          className="mb-5 bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 px-4 py-3 text-xs sm:text-sm flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">{globalSuccess}</p>
        </div>
      )}

      {/* 1. BOOTSTRAP INICIAL DEL PRESIDENTE */}
      {!presidentExists ? (
        <section className="bg-surface-container border border-primary-container/60 p-5 sm:p-7 shadow-[4px_4px_0px_0px_#d90429] space-y-5">
          <div className="flex items-start gap-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 bg-primary-container text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold">
                Primer Arranque del Sistema
              </span>
              <h2 className="font-headline text-xl font-bold text-on-surface">
                Configuración Inicial del Presidente
              </h2>
              <p className="text-xs text-tertiary mt-1 leading-relaxed">
                Aún no existe una cuenta de Presidencia activa. Introduce las credenciales maestras del servidor (
                <code className="text-on-surface">ADMIN_USER</code> / <code className="text-on-surface">ADMIN_PASSWORD</code>) para dar de alta la cuenta ejecutiva única.
              </p>
            </div>
          </div>

          <form onSubmit={handleBootstrapSubmit} className="space-y-4">
            <div className="bg-surface-container-low border border-white/10 p-4 space-y-3">
              <p className="font-label-sm text-[10px] uppercase tracking-widest text-tertiary font-bold">
                1. Autorización Maestra del Servidor
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="bs-admin-user" className="block text-xs font-semibold text-on-surface mb-1">
                    Usuario maestro (ADMIN_USER)
                  </label>
                  <input
                    id="bs-admin-user"
                    type="text"
                    required
                    autoComplete="off"
                    value={bsAdminUser}
                    onChange={(e) => setBsAdminUser(e.target.value)}
                    placeholder="admin"
                    className="w-full bg-surface border border-white/15 px-3 py-2.5 text-sm text-on-surface focus:border-primary-container focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="bs-admin-pass" className="block text-xs font-semibold text-on-surface mb-1">
                    Contraseña maestra (ADMIN_PASSWORD)
                  </label>
                  <input
                    id="bs-admin-pass"
                    type="password"
                    required
                    autoComplete="off"
                    value={bsAdminPassword}
                    onChange={(e) => setBsAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-surface border border-white/15 px-3 py-2.5 text-sm text-on-surface focus:border-primary-container focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low border border-white/10 p-4 space-y-3">
              <p className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold">
                2. Datos de la Cuenta del Presidente
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="bs-name" className="block text-xs font-semibold text-on-surface mb-1">
                    Nombre completo
                  </label>
                  <input
                    id="bs-name"
                    type="text"
                    required
                    value={bsName}
                    onChange={(e) => setBsName(e.target.value)}
                    placeholder={CLUB_INFO.president}
                    className="w-full bg-surface border border-white/15 px-3 py-2.5 text-sm text-on-surface focus:border-primary-container focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="bs-phone" className="block text-xs font-semibold text-on-surface mb-1">
                    Teléfono (opcional)
                  </label>
                  <input
                    id="bs-phone"
                    type="tel"
                    value={bsPhone}
                    onChange={(e) => setBsPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                    className="w-full bg-surface border border-white/15 px-3 py-2.5 text-sm text-on-surface focus:border-primary-container focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bs-email" className="block text-xs font-semibold text-on-surface mb-1">
                  Correo electrónico personal
                </label>
                <input
                  id="bs-email"
                  type="email"
                  required
                  value={bsEmail}
                  onChange={(e) => setBsEmail(e.target.value)}
                  placeholder="presidencia@voleibolsanpedro.es"
                  className="w-full bg-surface border border-white/15 px-3 py-2.5 text-sm text-on-surface focus:border-primary-container focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="bs-password" className="block text-xs font-semibold text-on-surface mb-1">
                  Contraseña nueva (mínimo 10 caracteres)
                </label>
                <div className="relative">
                  <input
                    id="bs-password"
                    type={showBsPassword ? 'text' : 'password'}
                    required
                    minLength={10}
                    value={bsPassword}
                    onChange={(e) => setBsPassword(e.target.value)}
                    placeholder="Mínimo 10 caracteres seguros"
                    className="w-full bg-surface border border-white/15 pl-3 pr-10 py-2.5 text-sm text-on-surface focus:border-primary-container focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBsPassword((v) => !v)}
                    aria-label={showBsPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-white p-1 cursor-pointer"
                  >
                    {showBsPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={bsBusy}
              className="w-full py-3 px-4 bg-primary-container hover:bg-cta-hover text-white font-label-md text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition-colors shadow-[4px_4px_0px_0px_#0e0e0e] cursor-pointer disabled:opacity-50"
            >
              {bsBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{bsBusy ? 'Configurando Presidencia...' : 'Crear Cuenta de Presidente y Pasar a 2FA'}</span>
            </button>
          </form>
        </section>
      ) : needsTwoFactorView && session ? (
        /* 2. FLUJO DE VERIFICACIÓN / CONFIGURACIÓN 2FA */
        <section className="bg-surface-container border border-white/15 p-5 sm:p-7 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 bg-primary-container text-white flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold">
                  Seguridad en Dos Pasos (TOTP)
                </span>
                <h2 className="font-headline text-xl font-bold text-on-surface">
                  {backupCodes
                    ? 'Guarda tus Códigos de Respaldo'
                    : session.user.totpEnabled
                    ? 'Verificación de Identidad (2FA)'
                    : 'Configura tu Autenticador (2FA)'}
                </h2>
                <p className="text-xs text-tertiary mt-1 truncate">
                  Cuenta: <strong className="text-on-surface">{session.user.email}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-bright border border-white/10 text-[11px] font-bold uppercase tracking-wider text-tertiary hover:text-white shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Salir</span>
            </button>
          </div>

          {backupCodes ? (
            <div className="space-y-4">
              <div className="bg-amber-950/40 border border-amber-500/40 p-4 text-xs text-amber-200 leading-relaxed">
                <strong>Importante:</strong> Estos 8 códigos de un solo uso te permitirán acceder si pierdes tu teléfono. No volverán a mostrarse. Cópialos y guárdalos en un lugar seguro antes de entrar.
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {backupCodes.map((code) => (
                  <div
                    key={code}
                    className="bg-surface-container-lowest border border-white/15 py-2.5 px-3 text-center font-mono text-sm font-bold tracking-wider text-on-surface select-all"
                  >
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => copyText(backupCodes.join('\n'), 'backup')}
                  className="flex-1 py-2.5 px-4 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-on-surface font-label-md text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedKey === 'backup' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                      <span>Códigos copiados</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-primary" aria-hidden="true" />
                      <span>Copiar los 8 códigos</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => routerRef.current.replace(pendingRedirectTo)}
                  className="flex-1 py-2.5 px-4 bg-primary-container hover:bg-cta-hover text-white font-label-md text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#0e0e0e] cursor-pointer"
                >
                  <span>Entrar al Portal</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : !session.user.totpEnabled ? (
            <div className="space-y-5">
              {totpLoading ? (
                <div className="py-8 flex items-center justify-center gap-2 text-xs text-tertiary">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" aria-hidden="true" />
                  <span>Generando clave secreta TOTP...</span>
                </div>
              ) : (
                <>
                  <div className="bg-surface-container-low border border-white/10 p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-primary">
                          Paso 1 · Añade la clave a Google Authenticator o Authy
                        </p>
                        <p className="text-xs text-tertiary leading-relaxed">
                          Pulsa el enlace directo desde tu móvil o introduce manualmente esta clave Base32 en tu app de autenticación (TOTP SHA-1, 6 dígitos, 30 s).
                        </p>
                      </div>

                      {/* Insignia SVG ligera de verificación TOTP */}
                      <div className="shrink-0 self-start sm:self-center bg-surface border border-white/15 p-2.5 flex items-center gap-2">
                        <svg
                          viewBox="0 0 36 36"
                          className="w-9 h-9 text-primary-container shrink-0"
                          aria-hidden="true"
                        >
                          <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
                          <rect x="6" y="6" width="4" height="4" fill="currentColor" />
                          <rect x="22" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
                          <rect x="26" y="6" width="4" height="4" fill="currentColor" />
                          <rect x="2" y="22" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
                          <rect x="6" y="26" width="4" height="4" fill="currentColor" />
                          <rect x="18" y="18" width="5" height="5" fill="#e5e2e1" />
                          <rect x="26" y="18" width="8" height="4" fill="#e5e2e1" />
                          <rect x="18" y="26" width="4" height="8" fill="#e5e2e1" />
                          <rect x="26" y="26" width="8" height="8" fill="currentColor" />
                        </svg>
                        <div className="text-[10px] leading-tight">
                          <span className="block font-bold uppercase text-on-surface">TOTP RFC 6238</span>
                          <span className="text-tertiary">6 dígitos · 30s</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface border border-white/15 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-widest text-tertiary font-bold">
                          Clave secreta Base32
                        </span>
                        <code className="font-mono text-sm sm:text-base font-bold text-on-surface tracking-wider break-all select-all">
                          {formattedSecret || '—'}
                        </code>
                      </div>
                      <button
                        type="button"
                        disabled={!totpSecret}
                        onClick={() => copyText(totpSecret, 'secret')}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold uppercase tracking-wider text-on-surface shrink-0 cursor-pointer"
                      >
                        {copiedKey === 'secret' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                            <span>Copiada</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                            <span>Copiar clave</span>
                          </>
                        )}
                      </button>
                    </div>

                    {totpUri && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <a
                          href={totpUri}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-surface-container-high hover:border-primary border border-white/15 text-xs font-bold uppercase tracking-wider text-on-surface transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                          <span>Abrir en app autenticadora</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => copyText(totpUri, 'uri')}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-surface border border-white/15 hover:border-white/30 text-xs font-bold uppercase tracking-wider text-tertiary hover:text-white cursor-pointer"
                        >
                          {copiedKey === 'uri' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                              <span>URI copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Copiar otpauth://</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleTwoFactorSubmit} className="space-y-3">
                    <div>
                      <label htmlFor="totp-setup-code" className="block text-xs font-semibold text-on-surface mb-1">
                        Paso 2 · Introduce el código de 6 dígitos generado por tu app
                      </label>
                      <input
                        id="totp-setup-code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                        autoComplete="one-time-code"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full bg-surface border border-white/15 px-4 py-3 text-center font-mono text-xl tracking-[0.4em] text-on-surface focus:border-primary-container focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={totpBusy || totpCode.length !== 6}
                      className="w-full py-3 px-4 bg-primary-container hover:bg-cta-hover text-white font-label-md text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#0e0e0e] cursor-pointer disabled:opacity-50"
                    >
                      {totpBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                      )}
                      <span>{totpBusy ? 'Activando 2FA...' : 'Activar 2FA y Ver Códigos de Respaldo'}</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
              <p className="text-xs text-tertiary leading-relaxed">
                Introduce el código temporal de 6 dígitos de tu aplicación autenticadora, o uno de tus códigos de respaldo con formato <code className="text-on-surface">XXXX-XXXX</code>.
              </p>
              <div>
                <label htmlFor="totp-verify-code" className="block text-xs font-semibold text-on-surface mb-1">
                  Código 2FA o código de respaldo
                </label>
                <input
                  id="totp-verify-code"
                  type="text"
                  maxLength={9}
                  required
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 9))}
                  placeholder="123456 o A1B2-C3D4"
                  className="w-full bg-surface border border-white/15 px-4 py-3 text-center font-mono text-lg tracking-[0.25em] text-on-surface focus:border-primary-container focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={totpBusy || totpCode.trim().length < 6}
                className="w-full py-3 px-4 bg-primary-container hover:bg-cta-hover text-white font-label-md text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#0e0e0e] cursor-pointer disabled:opacity-50"
              >
                {totpBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{totpBusy ? 'Verificando...' : 'Verificar e Iniciar Sesión'}</span>
              </button>
            </form>
          )}
        </section>
      ) : inviteToken ? (
        /* 3. ACTIVACIÓN DE INVITACIÓN (?invite=TOKEN) */
        <section className="bg-surface-container border border-white/15 p-5 sm:p-7 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-5">
          <div className="flex items-start gap-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 bg-primary-container text-white flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold">
                Invitación Personal del Club
              </span>
              <h2 className="font-headline text-xl font-bold text-on-surface">
                Activación de Cuenta
              </h2>
              <p className="text-xs text-tertiary mt-1">
                Completa tu registro privado para acceder a la plataforma oficial.
              </p>
            </div>
          </div>

          {inviteLoading ? (
            <div className="py-8 flex items-center justify-center gap-2 text-xs text-tertiary">
              <Loader2 className="w-4 h-4 animate-spin text-primary" aria-hidden="true" />
              <span>Comprobando invitación...</span>
            </div>
          ) : inviteError || !inviteInfo ? (
            <div className="space-y-4">
              <div className="bg-error-container/40 border border-error/40 p-4 text-xs text-on-error-container leading-relaxed">
                {inviteError || 'La invitación no es válida o ha caducado.'}
              </div>
              <Link
                href="/acceso"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold uppercase tracking-wider text-on-surface"
              >
                <span>Volver al acceso ordinario</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-surface-container-low border border-white/10 p-4 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-tertiary">Correo invitado:</span>
                  <strong className="text-on-surface break-all">{inviteInfo.email}</strong>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-tertiary">Área asignada:</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary-container/20 text-primary border border-primary-container/40">
                    {inviteInfo.targetType === 'STAFF'
                      ? 'Cuerpo Técnico / Directiva'
                      : inviteInfo.targetType === 'GUARDIAN'
                      ? 'Tutor / Familia'
                      : 'Deportista'}
                  </span>
                </div>
                {inviteInfo.roleCodes.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-tertiary">Roles:</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {inviteInfo.roleCodes.map((rc) => (
                        <span
                          key={rc}
                          className="px-2 py-0.5 text-[10px] font-bold uppercase bg-surface-container-high border border-white/10 text-on-surface"
                        >
                          {ROLE_NAME_MAP.get(rc as never) || rc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                  <span className="text-tertiary">Válida hasta:</span>
                  <span className="text-on-surface/90">
                    {formatMadridDate(inviteInfo.expiresAt, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <form onSubmit={handleInviteSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="inv-name" className="block text-xs font-semibold text-on-surface mb-1">
                    Nombre y apellidos
                  </label>
                  <input
                    id="inv-name"
                    type="text"
                    required
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full bg-surface border border-white/15 px-3 py-2.5 text-sm text-on-surface focus:border-primary-container focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="inv-phone" className="block text-xs font-semibold text-on-surface mb-1">
                    Teléfono de contacto (opcional)
                  </label>
                  <input
                    id="inv-phone"
                    type="tel"
                    value={invPhone}
                    onChange={(e) => setInvPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                    className="w-full bg-surface border border-white/15 px-3 py-2.5 text-sm text-on-surface focus:border-primary-container focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="inv-password" className="block text-xs font-semibold text-on-surface mb-1">
                    Contraseña de acceso (mínimo 8 caracteres)
                  </label>
                  <div className="relative">
                    <input
                      id="inv-password"
                      type={showInvPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={invPassword}
                      onChange={(e) => setInvPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full bg-surface border border-white/15 pl-3 pr-10 py-2.5 text-sm text-on-surface focus:border-primary-container focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowInvPassword((v) => !v)}
                      aria-label={showInvPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-white p-1 cursor-pointer"
                    >
                      {showInvPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={invBusy}
                  className="w-full py-3 px-4 bg-primary-container hover:bg-cta-hover text-white font-label-md text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#0e0e0e] cursor-pointer disabled:opacity-50"
                >
                  {invBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <UserCheck className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{invBusy ? 'Activando cuenta...' : 'Activar Cuenta y Entrar'}</span>
                </button>
              </form>

              {/* OAuth rápido manteniendo ?invite= */}
              <div className="pt-4 border-t border-white/10 space-y-2.5">
                <p className="text-[11px] uppercase tracking-wider font-bold text-tertiary text-center">
                  O activa con tu cuenta vinculada ({inviteInfo.email})
                </p>
                {oauthConfig.google || oauthConfig.microsoft ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {oauthConfig.google && (
                      <a
                        href={`/api/intranet/auth/oauth/google?invite=${encodeURIComponent(inviteToken)}`}
                        className="flex items-center justify-center gap-2 py-2.5 px-3 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold text-on-surface transition-colors"
                      >
                        <GoogleMark />
                        <span>Activar con Google</span>
                      </a>
                    )}
                    {oauthConfig.microsoft && (
                      <a
                        href={`/api/intranet/auth/oauth/microsoft?invite=${encodeURIComponent(inviteToken)}`}
                        className="flex items-center justify-center gap-2 py-2.5 px-3 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold text-on-surface transition-colors"
                      >
                        <MicrosoftMark />
                        <span>Activar con Microsoft</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-tertiary text-center">
                    Acceso rápido con Google / Microsoft disponible cuando se configuren las credenciales OAuth en el servidor.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      ) : session ? (
        /* 4. USUARIO YA AUTENTICADO Y CON 2FA COMPLETADO */
        <section className="bg-surface-container border border-white/15 p-5 sm:p-7 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div className="min-w-0">
              <span className="font-label-sm text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
                Sesión Activa Verificada
              </span>
              <h2 className="font-headline text-xl font-bold text-on-surface truncate">
                {session.user.name}
              </h2>
              <p className="text-xs text-tertiary truncate mt-0.5">{session.user.email}</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-error-container/50 border border-white/15 text-xs font-bold uppercase tracking-wider text-tertiary hover:text-error shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {session.isStaff && (
              <Link
                href="/club"
                className="flex items-center justify-between gap-2 px-4 py-3.5 bg-primary-container hover:bg-cta-hover text-white font-label-md text-xs uppercase tracking-wider font-bold shadow-[4px_4px_0px_0px_#0e0e0e]"
              >
                <span>Entrar a Intranet Staff (/club)</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </Link>
            )}

            {session.isMemberPortal && (
              <Link
                href="/mi-club"
                className="flex items-center justify-between gap-2 px-4 py-3.5 bg-surface-container-high hover:border-primary border border-white/15 text-on-surface font-label-md text-xs uppercase tracking-wider font-bold"
              >
                <span>Portal Familias y Jugadores (/mi-club)</span>
                <ArrowRight className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              </Link>
            )}

            {canAccessConsents && (
              <Link
                href="/admin/consentimientos"
                className="flex items-center justify-between gap-2 px-4 py-3 bg-surface-container-low hover:border-primary border border-white/10 text-on-surface font-label-md text-xs uppercase tracking-wider font-bold"
              >
                <span>Autorizaciones LOPD</span>
                <ArrowRight className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              </Link>
            )}

            {!session.user.totpEnabled && (
              <Link
                href="/acceso?step=2fa"
                className="flex items-center justify-between gap-2 px-4 py-3 bg-surface-container-low hover:border-primary border border-white/10 text-on-surface font-label-md text-xs uppercase tracking-wider font-bold"
              >
                <span>Configurar 2FA opcional</span>
                <KeyRound className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              </Link>
            )}
          </div>
        </section>
      ) : (
        /* 5. INICIO DE SESIÓN ORDINARIO */
        <section className="bg-surface-container border border-white/15 shadow-[4px_4px_0px_0px_#0e0e0e] overflow-hidden">
          {/* Pestañas */}
          <div className="grid grid-cols-2 border-b border-white/10 bg-surface-container-low">
            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setGlobalError('');
                setGlobalSuccess('');
              }}
              className={`py-3.5 px-3 text-xs font-label-md uppercase tracking-wider font-bold flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'password'
                  ? 'border-primary-container text-white bg-surface-container'
                  : 'border-transparent text-tertiary hover:text-on-surface'
              }`}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Contraseña</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('magic');
                setGlobalError('');
                setGlobalSuccess('');
              }}
              className={`py-3.5 px-3 text-xs font-label-md uppercase tracking-wider font-bold flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'magic'
                  ? 'border-primary-container text-white bg-surface-container'
                  : 'border-transparent text-tertiary hover:text-on-surface'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Enlace mágico</span>
            </button>
          </div>

          <div className="p-5 sm:p-7 space-y-6">
            {activeTab === 'password' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-semibold text-on-surface mb-1">
                    Correo electrónico
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="usuario@voleibolsanpedro.es"
                    className="w-full bg-surface border border-white/15 px-3 py-2.5 text-sm text-on-surface focus:border-primary-container focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-xs font-semibold text-on-surface mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface border border-white/15 pl-3 pr-10 py-2.5 text-sm text-on-surface focus:border-primary-container focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-white p-1 cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginBusy}
                  className="w-full py-3 px-4 bg-primary-container hover:bg-cta-hover text-white font-label-md text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#0e0e0e] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loginBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{loginBusy ? 'Accediendo...' : 'Entrar al Club'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleMagicSubmit} className="space-y-4">
                <p className="text-xs text-tertiary leading-relaxed">
                  Recibirás un correo con un enlace directo de un solo uso válido durante 15 minutos, sin necesidad de recordar tu contraseña.
                </p>
                <div>
                  <label htmlFor="magic-email" className="block text-xs font-semibold text-on-surface mb-1">
                    Correo electrónico autorizado
                  </label>
                  <input
                    id="magic-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    placeholder="nombre@correo.com"
                    className="w-full bg-surface border border-white/15 px-3 py-2.5 text-sm text-on-surface focus:border-primary-container focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={magicBusy}
                  className="w-full py-3 px-4 bg-primary-container hover:bg-cta-hover text-white font-label-md text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#0e0e0e] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {magicBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Mail className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{magicBusy ? 'Enviando enlace...' : 'Enviar enlace mágico por email'}</span>
                </button>
              </form>
            )}

            {/* Acceso OAuth Google y Microsoft */}
            <div className="pt-5 border-t border-white/10 space-y-3">
              <p className="text-[11px] uppercase tracking-widest font-bold text-tertiary text-center">
                Acceso rápido con cuenta vinculada
              </p>

              {oauthConfig.google || oauthConfig.microsoft ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {oauthConfig.google ? (
                    <a
                      href="/api/intranet/auth/oauth/google"
                      className="flex items-center justify-center gap-2 py-2.5 px-3 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold text-on-surface transition-colors"
                    >
                      <GoogleMark />
                      <span>Google</span>
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-2.5 px-3 bg-surface-container-low border border-white/5 text-[11px] text-tertiary/80 text-center">
                      <span>Google OAuth no configurado</span>
                    </div>
                  )}

                  {oauthConfig.microsoft ? (
                    <a
                      href="/api/intranet/auth/oauth/microsoft"
                      className="flex items-center justify-center gap-2 py-2.5 px-3 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold text-on-surface transition-colors"
                    >
                      <MicrosoftMark />
                      <span>Microsoft / Outlook</span>
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-2.5 px-3 bg-surface-container-low border border-white/5 text-[11px] text-tertiary/80 text-center">
                      <span>Microsoft OAuth no configurado</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-surface-container-low border border-white/10 px-3.5 py-2.5 text-[11px] text-tertiary text-center leading-relaxed">
                  El acceso con <strong className="text-on-surface">Google</strong> y{' '}
                  <strong className="text-on-surface">Microsoft (Hotmail/Outlook)</strong> estará disponible al configurar las variables OAuth en el servidor.
                </div>
              )}
            </div>

            {/* Aviso sin registro abierto */}
            <div className="bg-surface-container-low border-l-2 border-primary-container px-3.5 py-2.5 text-xs text-tertiary leading-relaxed">
              <strong className="text-on-surface">Acceso privado por invitación:</strong> No existe registro abierto al público. Si eres entrenador, jugador/a o padre/madre y aún no tienes cuenta, solicita tu enlace de invitación al club en{' '}
              <a
                href={`mailto:${CLUB_INFO.contactEmail}`}
                className="text-primary hover:underline font-medium"
              >
                {CLUB_INFO.contactEmail}
              </a>
              .
            </div>
          </div>
        </section>
      )}

      {/* Enlace discreto al acceso legado de Secretariado */}
      <div className="mt-6 text-center">
        <Link
          href="/admin/consentimientos"
          className="inline-flex items-center gap-1.5 text-xs text-tertiary/80 hover:text-primary transition-colors"
        >
          <span>Acceso legado Secretariado (Autorizaciones)</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export default function AccesoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[65vh] flex items-center justify-center px-4 py-12">
          <div className="bg-surface-container border border-white/10 p-8 max-w-sm w-full text-center shadow-[4px_4px_0px_0px_#0e0e0e] flex flex-col items-center gap-3">
            <Loader2 className="w-7 h-7 text-primary-container animate-spin" aria-hidden="true" />
            <p className="font-headline-sm text-sm uppercase tracking-wider text-on-surface">
              Cargando acceso del club
            </p>
          </div>
        </div>
      }
    >
      <AccesoPageContent />
    </Suspense>
  );
}
