'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Users,
  RefreshCw,
  Upload,
  UserPlus,
  Download,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  Edit2,
  Eye,
  Mail,
  Send,
  Copy,
  Check,
  X,
  UserX,
  GitMerge,
  Trash2,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';
import {
  parseCsv,
  buildCsvString,
  FEELSPORTS_CSV_TEMPLATE,
} from '@/lib/intranet/csv-utils';
import { formatMadridDateString } from '@/lib/date-utils';

type AthleteStatus = 'IMPORTADO' | 'PENDIENTE_VALIDAR' | 'VERIFICADO' | 'BAJA' | 'SHREDDED';
type RgpdStatus = 'ACTIVE' | 'REVOKED' | 'SHREDDED' | 'PENDING';
type TrafficLight = 'GREEN' | 'YELLOW' | 'RED' | 'NONE';

interface AthleteTeamItem {
  teamSeasonId: string;
  teamName: string;
  isPrimary: boolean;
  dorsal: number | null;
  position: string | null;
}

interface AthleteRecord {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  birthYear: number | null;
  birthDateVerified: boolean;
  ageBracket: '<14' | '14-17' | '+18' | null;
  approxAge: number | null;
  dniLast5: string | null;
  gender: string;
  favbLicenseNumber: string | null;
  feelsportsId: string | null;
  shirtSize: string | null;
  jerseyNumber: number | null;
  status: AthleteStatus;
  isDemo: boolean;
  verifiedAt: string | null;
  updatedAt: string;
  teams: AthleteTeamItem[];
  primaryTeamId: string | null;
  rgpdStatus: RgpdStatus;
  rgpdSignedAt: string | null;
  consentFlags: {
    socialMedia: boolean;
    streaming: boolean;
    press: boolean;
    travel: boolean;
  } | null;
  paymentTrafficLight: TrafficLight | null;
  guardianName: string | null;
  guardianRelationship: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  hasGuardianEmail: boolean;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  hasGuardianAccount: boolean;
  hasAthleteAccount: boolean;
  canInvite: boolean;
  canEditRow: boolean;
}

interface TeamSummary {
  teamId: string;
  teamName: string;
  division: string;
  association: string;
  total: number;
  verificados: number;
  conRgpd: number;
  pendientesCuenta: number;
}

interface TeamOption {
  id: string;
  name: string;
  division: string;
  association: string;
  gender: string;
}

interface DedupItem {
  id: string;
  sourceType: string;
  matchReason: string;
  status: string;
  createdAt: string;
  payload: {
    firstName: string;
    lastName: string;
    dni?: string;
    birthDate?: string;
    teamNameOrId?: string;
    guardianName?: string;
    guardianDni?: string;
    email?: string;
    phone?: string;
    feelsportsId?: string;
  };
  candidate: {
    id: string;
    fullName: string;
    birthYear: number | null;
    dniLast5: string | null;
    status: string;
    teams: string[];
  } | null;
}

interface PermissionsInfo {
  isPresident: boolean;
  canImport: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canViewEmergency: boolean;
  canViewSensitive: boolean;
  canSendInvitation: boolean;
  canViewTrafficLight: boolean;
  canIncludeDemo: boolean;
}

interface SensitivePayload {
  athleteId: string;
  fullName: string;
  dni: string | null;
  dniLast5: string | null;
  birthDate: string | null;
  birthYear: number | null;
  medicalAllergies: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  guardianDni: string | null;
}

interface InviteResultItem {
  athleteId: string;
  athleteName: string;
  targetType: 'GUARDIAN' | 'ATHLETE';
  email: string;
  inviteUrl: string;
  emailSent: boolean;
  emailError?: string;
}

const STATUS_BADGE: Record<AthleteStatus, { label: string; cls: string }> = {
  VERIFICADO: {
    label: 'Verificado',
    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  PENDIENTE_VALIDAR: {
    label: 'Pendiente validar',
    cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  IMPORTADO: {
    label: 'Importado',
    cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  BAJA: {
    label: 'Baja',
    cls: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  },
  SHREDDED: {
    label: 'Suprimido',
    cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
};

const RGPD_BADGE: Record<RgpdStatus, { label: string; cls: string }> = {
  ACTIVE: {
    label: 'RGPD Activo',
    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  PENDING: {
    label: 'RGPD Pendiente',
    cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  REVOKED: {
    label: 'RGPD Revocado',
    cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  SHREDDED: {
    label: 'Suprimido Art.17',
    cls: 'bg-rose-950/60 text-rose-300 border-rose-500/40',
  },
};

const TRAFFIC_LIGHT_META: Record<TrafficLight, { dot: string; label: string; cls: string }> = {
  GREEN: { dot: '🟢', label: 'Al corriente', cls: 'text-emerald-300' },
  YELLOW: { dot: '🟡', label: 'Pendiente', cls: 'text-amber-300' },
  RED: { dot: '🔴', label: 'Vencido', cls: 'text-rose-300' },
  NONE: { dot: '⚪', label: 'Sin cuota', cls: 'text-zinc-400' },
};

type CsvColumnKey =
  | 'firstName'
  | 'lastName'
  | 'dni'
  | 'birthDate'
  | 'email'
  | 'phone'
  | 'teamNameOrId'
  | 'guardianName'
  | 'guardianDni'
  | 'feelsportsId';

const CSV_FIELD_LABELS: Array<{ key: CsvColumnKey; label: string; hints: string[] }> = [
  { key: 'firstName', label: 'Nombre *', hints: ['nombre', 'first', 'firstname'] },
  { key: 'lastName', label: 'Apellidos', hints: ['apellido', 'last', 'lastname'] },
  { key: 'dni', label: 'DNI / NIE', hints: ['dni', 'nie', 'nif', 'documento'] },
  { key: 'birthDate', label: 'Fecha nacimiento', hints: ['fecha', 'nacimiento', 'birth', 'fnac'] },
  { key: 'email', label: 'Email', hints: ['email', 'correo', 'mail'] },
  { key: 'phone', label: 'Teléfono', hints: ['telefono', 'teléfono', 'movil', 'móvil', 'phone'] },
  { key: 'teamNameOrId', label: 'Equipo / Categoría', hints: ['equipo', 'categoria', 'categoría', 'team'] },
  { key: 'guardianName', label: 'Tutor Legal', hints: ['tutor', 'padre', 'madre', 'responsable'] },
  { key: 'guardianDni', label: 'DNI Tutor', hints: ['dni tutor', 'nif tutor'] },
  { key: 'feelsportsId', label: 'ID FeelSports', hints: ['feelsports', 'id externo'] },
];

function normalizeHeader(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function ClubCensoPage() {
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [teamSummaries, setTeamSummaries] = useState<TeamSummary[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [dedupQueue, setDedupQueue] = useState<DedupItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionsInfo>({
    isPresident: false,
    canImport: false,
    canEdit: false,
    canDeactivate: false,
    canViewEmergency: false,
    canViewSensitive: false,
    canSendInvitation: false,
    canViewTrafficLight: false,
    canIncludeDemo: false,
  });

  const [activeTab, setActiveTab] = useState<'censo' | 'dedup'>('censo');
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [rgpdFilter, setRgpdFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [includeDemo, setIncludeDemo] = useState<boolean>(false);

  const [syncing, setSyncing] = useState(false);

  // Modal Ficha / Edición / Datos sensibles
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<AthleteRecord | null>(null);
  const [sensitiveData, setSensitiveData] = useState<SensitivePayload | null>(null);
  const [loadingSensitive, setLoadingSensitive] = useState(false);
  const [savingAthlete, setSavingAthlete] = useState(false);

  // Campos formulario ficha
  const [fFirstName, setFFirstName] = useState('');
  const [fLastName, setFLastName] = useState('');
  const [fBirthDate, setFBirthDate] = useState('');
  const [fBirthYear, setFBirthYear] = useState('');
  const [fDni, setFDni] = useState('');
  const [fGender, setFGender] = useState<'FEMENINO' | 'MASCULINO'>('FEMENINO');
  const [fStatus, setFStatus] = useState<AthleteStatus>('PENDIENTE_VALIDAR');
  const [fPrimaryTeam, setFPrimaryTeam] = useState('');
  const [fSecondaryTeams, setFSecondaryTeams] = useState<string[]>([]);
  const [fFavbLicense, setFFavbLicense] = useState('');
  const [fShirtSize, setFShirtSize] = useState('');
  const [fJerseyNumber, setFJerseyNumber] = useState('');
  const [fEmergName, setFEmergName] = useState('');
  const [fEmergPhone, setFEmergPhone] = useState('');
  const [fAllergies, setFAllergies] = useState('');
  const [fGuardianName, setFGuardianName] = useState('');
  const [fGuardianRel, setFGuardianRel] = useState<'PADRE' | 'MADRE' | 'TUTOR_LEGAL'>('TUTOR_LEGAL');
  const [fGuardianEmail, setFGuardianEmail] = useState('');
  const [fGuardianPhone, setFGuardianPhone] = useState('');
  const [fGuardianDni, setFGuardianDni] = useState('');

  // Modal Importador CSV FeelSports
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [csvMapping, setCsvMapping] = useState<Record<CsvColumnKey, number>>({
    firstName: -1,
    lastName: -1,
    dni: -1,
    birthDate: -1,
    email: -1,
    phone: -1,
    teamNameOrId: -1,
    guardianName: -1,
    guardianDni: -1,
    feelsportsId: -1,
  });
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState<{
    created: number;
    enriched: number;
    queuedForDedup: number;
    skippedShredded: number;
  } | null>(null);

  // Modal Invitaciones (individual o masivo)
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<'SINGLE' | 'BATCH'>('SINGLE');
  const [inviteAthlete, setInviteAthlete] = useState<AthleteRecord | null>(null);
  const [inviteTeamId, setInviteTeamId] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteTargetType, setInviteTargetType] = useState<'AUTO' | 'GUARDIAN' | 'ATHLETE'>('AUTO');
  const [inviteSendEmail, setInviteSendEmail] = useState<boolean>(true);
  const [inviteOnlyPending, setInviteOnlyPending] = useState<boolean>(true);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteResults, setInviteResults] = useState<InviteResultItem[]>([]);
  const [inviteSkipped, setInviteSkipped] = useState<Array<{ athleteId: string; athleteName: string; reason: string }>>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Cola dedup loading por fila
  const [resolvingDedupId, setResolvingDedupId] = useState<string | null>(null);

  // Referencia estable para evitar bucles en useEffect
  const includeDemoRef = useRef(includeDemo);
  includeDemoRef.current = includeDemo;
  const isFetchingRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 5000);
  }, []);

  const loadCensus = useCallback(async (demoFlag?: boolean) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setErrorBanner(null);

    try {
      const useDemo = demoFlag !== undefined ? demoFlag : includeDemoRef.current;
      const url = useDemo ? '/api/intranet/census?includeDemo=1' : '/api/intranet/census';
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        setAuthError(data?.error || 'Acceso no autorizado a este módulo.');
        setLoading(false);
        return;
      }

      if (!res.ok || !data?.success) {
        setErrorBanner(data?.error || 'Error cargando el censo unificado.');
        setLoading(false);
        return;
      }

      setAuthError(null);
      setAthletes(Array.isArray(data.athletes) ? data.athletes : []);
      setTeamSummaries(Array.isArray(data.teamSummaries) ? data.teamSummaries : []);
      setTeams(Array.isArray(data.teams) ? data.teams : []);
      setDedupQueue(Array.isArray(data.dedupQueue) ? data.dedupQueue : []);
      if (data.permissions) {
        setPermissions(data.permissions);
      }
    } catch {
      setErrorBanner('Error de red cargando el censo.');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCensus(false);
  }, [loadCensus]);

  const filteredAthletes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return athletes.filter((a) => {
      if (teamFilter && !a.teams.some((t) => t.teamSeasonId === teamFilter)) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      if (rgpdFilter && a.rgpdStatus !== rgpdFilter) return false;
      if (q) {
        const hay = `${a.fullName} ${a.guardianName || ''} ${a.dniLast5 || ''} ${a.favbLicenseNumber || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [athletes, teamFilter, statusFilter, rgpdFilter, searchQuery]);

  const globalStats = useMemo(() => {
    const active = athletes.filter((a) => a.status !== 'BAJA' && a.status !== 'SHREDDED');
    const verified = active.filter((a) => a.status === 'VERIFICADO').length;
    const rgpdActive = active.filter((a) => a.rgpdStatus === 'ACTIVE').length;
    const withoutAccount = active.filter((a) => !a.hasGuardianAccount && !a.hasAthleteAccount).length;
    return {
      totalActive: active.length,
      verified,
      rgpdActive,
      withoutAccount,
    };
  }, [athletes]);

  // Sincronización con fuentes del club
  const handleSyncSources = async () => {
    setSyncing(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/intranet/census', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_sources' }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setErrorBanner(data?.error || 'No se pudo sincronizar el censo.');
        return;
      }
      const s = data.summary;
      showToast(
        `Sincronización completada: ${s.athletesInsertedOrUpdated} fichas procesadas, ${s.guardiansLinked} tutores vinculados.`
      );
      await loadCensus();
    } catch {
      setErrorBanner('Error de red sincronizando el censo.');
    } finally {
      setSyncing(false);
    }
  };

  // Exportar CSV con datos básicos autorizados
  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Nombre',
      'Apellidos',
      'Equipo Principal',
      'Otros Equipos',
      'Estado Ficha',
      'Tramo Edad',
      'Año Nacimiento',
      'DNI (últ. 5)',
      'Licencia FAVB',
      'Dorsal',
      'Talla',
      'Estado RGPD',
      ...(permissions.canViewTrafficLight ? ['Semáforo Cuotas'] : []),
      'Tutor Legal',
      ...(permissions.canViewEmergency ? ['Email Tutor', 'Teléfono Tutor'] : []),
    ];

    const rows = filteredAthletes.map((a) => {
      const primary = a.teams.find((t) => t.isPrimary)?.teamName || a.teams[0]?.teamName || '';
      const others = a.teams
        .filter((t) => t.teamName !== primary)
        .map((t) => t.teamName)
        .join(', ');
      return [
        a.id,
        a.firstName,
        a.lastName,
        primary,
        others,
        a.status,
        a.ageBracket || 'Sin dato',
        a.birthYear ?? '',
        a.dniLast5 ? `***${a.dniLast5}` : '',
        a.favbLicenseNumber || '',
        a.jerseyNumber ?? '',
        a.shirtSize || '',
        a.rgpdStatus,
        ...(permissions.canViewTrafficLight
          ? [a.paymentTrafficLight ? TRAFFIC_LIGHT_META[a.paymentTrafficLight].label : '']
          : []),
        a.guardianName || '',
        ...(permissions.canViewEmergency ? [a.guardianEmail || '', a.guardianPhone || ''] : []),
      ];
    });

    const csv = buildCsvString(headers, rows, ';');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `censo-cdvsp-${formatMadridDateString(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exportadas ${filteredAthletes.length} fichas a CSV.`);
  };

  // Abrir modal ficha (crear o editar/ver)
  const openAthleteModal = (ath: AthleteRecord | null, revealImmediately = false) => {
    setEditingAthlete(ath);
    setSensitiveData(null);
    setErrorBanner(null);

    if (ath) {
      setFFirstName(ath.firstName);
      setFLastName(ath.lastName);
      setFBirthDate('');
      setFBirthYear(ath.birthYear ? String(ath.birthYear) : '');
      setFDni('');
      setFGender(ath.gender === 'MASCULINO' ? 'MASCULINO' : 'FEMENINO');
      setFStatus(ath.status);
      setFPrimaryTeam(ath.primaryTeamId || '');
      setFSecondaryTeams(
        ath.teams.filter((t) => t.teamSeasonId !== ath.primaryTeamId).map((t) => t.teamSeasonId)
      );
      setFFavbLicense(ath.favbLicenseNumber || '');
      setFShirtSize(ath.shirtSize || '');
      setFJerseyNumber(ath.jerseyNumber !== null ? String(ath.jerseyNumber) : '');
      setFEmergName(ath.emergencyContactName || '');
      setFEmergPhone(ath.emergencyContactPhone || '');
      setFAllergies('');
      setFGuardianName(ath.guardianName || '');
      setFGuardianRel(
        ath.guardianRelationship === 'PADRE' || ath.guardianRelationship === 'MADRE'
          ? ath.guardianRelationship
          : 'TUTOR_LEGAL'
      );
      setFGuardianEmail(ath.guardianEmail || '');
      setFGuardianPhone(ath.guardianPhone || '');
      setFGuardianDni('');
    } else {
      setFFirstName('');
      setFLastName('');
      setFBirthDate('');
      setFBirthYear('');
      setFDni('');
      setFGender('FEMENINO');
      setFStatus('PENDIENTE_VALIDAR');
      setFPrimaryTeam(teamFilter || teams[0]?.id || '');
      setFSecondaryTeams([]);
      setFFavbLicense('');
      setFShirtSize('');
      setFJerseyNumber('');
      setFEmergName('');
      setFEmergPhone('');
      setFAllergies('');
      setFGuardianName('');
      setFGuardianRel('TUTOR_LEGAL');
      setFGuardianEmail('');
      setFGuardianPhone('');
      setFGuardianDni('');
    }

    setEditorOpen(true);

    if (ath && revealImmediately && permissions.canViewSensitive && ath.status !== 'SHREDDED') {
      void handleRevealSensitive(ath.id);
    }
  };

  const handleRevealSensitive = async (athleteId: string) => {
    setLoadingSensitive(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/intranet/census', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view_sensitive', athleteId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setErrorBanner(data?.error || 'No se pudieron revelar los datos sensibles.');
        return;
      }
      const s = data.sensitive as SensitivePayload;
      setSensitiveData(s);
      if (s.dni) setFDni(s.dni);
      if (s.birthDate) setFBirthDate(s.birthDate);
      if (s.medicalAllergies) setFAllergies(s.medicalAllergies);
      if (s.guardianDni) setFGuardianDni(s.guardianDni);
      showToast('Acceso a datos sensibles registrado en auditoría.');
    } catch {
      setErrorBanner('Error de red revelando datos sensibles.');
    } finally {
      setLoadingSensitive(false);
    }
  };

  const handleSaveAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAthlete(true);
    setErrorBanner(null);

    try {
      const parsedYear = fBirthYear.trim() ? Number(fBirthYear.trim()) : null;
      const parsedJersey = fJerseyNumber.trim() ? Number(fJerseyNumber.trim()) : null;

      const payload = {
        action: 'create_or_update_athlete',
        athleteId: editingAthlete?.id || undefined,
        firstName: fFirstName.trim(),
        lastName: fLastName.trim(),
        birthDate: fBirthDate.trim() || undefined,
        birthYear: parsedYear && Number.isInteger(parsedYear) ? parsedYear : null,
        dni: fDni.trim() || undefined,
        gender: fGender,
        status: fStatus,
        primaryTeamId: fPrimaryTeam || null,
        secondaryTeamIds: fSecondaryTeams,
        favbLicenseNumber: fFavbLicense.trim() || null,
        shirtSize: fShirtSize.trim() || null,
        jerseyNumber: parsedJersey !== null && Number.isInteger(parsedJersey) ? parsedJersey : null,
        emergencyContactName: fEmergName.trim() || null,
        emergencyContactPhone: fEmergPhone.trim() || null,
        medicalAllergies: fAllergies.trim() || undefined,
        guardian:
          fGuardianName.trim() || fGuardianEmail.trim() || fGuardianPhone.trim() || fGuardianDni.trim()
            ? {
                fullName: fGuardianName.trim(),
                relationship: fGuardianRel,
                email: fGuardianEmail.trim() || undefined,
                phone: fGuardianPhone.trim() || undefined,
                dni: fGuardianDni.trim() || undefined,
              }
            : undefined,
      };

      const res = await fetch('/api/intranet/census', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setErrorBanner(data?.error || 'Error guardando la ficha.');
        return;
      }

      setEditorOpen(false);
      showToast(editingAthlete ? 'Ficha actualizada correctamente.' : 'Deportista creado en el censo.');
      await loadCensus();
    } catch {
      setErrorBanner('Error de red guardando la ficha.');
    } finally {
      setSavingAthlete(false);
    }
  };

  const handleDeactivateAthlete = async (ath: AthleteRecord) => {
    if (!window.confirm(`¿Confirmas dar de baja a ${ath.fullName}?`)) return;
    setErrorBanner(null);
    try {
      const res = await fetch('/api/intranet/census', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate_athlete', athleteId: ath.id }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setErrorBanner(data?.error || 'No se pudo dar de baja.');
        return;
      }
      showToast(`${ath.fullName} marcado como BAJA.`);
      await loadCensus();
    } catch {
      setErrorBanner('Error de red al dar de baja.');
    }
  };

  // CSV FeelSports parsing & auto-mapping
  const csvMatrix = useMemo(() => {
    if (!csvRawText.trim()) return [];
    return parseCsv(csvRawText);
  }, [csvRawText]);

  const csvHeaders = useMemo(() => (csvMatrix.length > 0 ? csvMatrix[0] : []), [csvMatrix]);
  const csvDataRows = useMemo(() => (csvMatrix.length > 1 ? csvMatrix.slice(1) : []), [csvMatrix]);

  const applyAutoMapping = (text: string) => {
    setCsvRawText(text);
    setCsvImportResult(null);
    const matrix = parseCsv(text);
    if (matrix.length === 0) return;
    const headers = matrix[0].map(normalizeHeader);
    const nextMap: Record<CsvColumnKey, number> = {
      firstName: -1,
      lastName: -1,
      dni: -1,
      birthDate: -1,
      email: -1,
      phone: -1,
      teamNameOrId: -1,
      guardianName: -1,
      guardianDni: -1,
      feelsportsId: -1,
    };
    for (const field of CSV_FIELD_LABELS) {
      const idx = headers.findIndex((h) => field.hints.some((hint) => h === hint || h.includes(hint)));
      nextMap[field.key] = idx;
    }
    // Evitar colisión dni vs guardianDni
    if (nextMap.guardianDni !== -1 && nextMap.dni === nextMap.guardianDni) {
      const altDni = headers.findIndex(
        (h, idx) => idx !== nextMap.guardianDni && (h.includes('dni') || h.includes('nie'))
      );
      nextMap.dni = altDni;
    }
    setCsvMapping(nextMap);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        applyAutoMapping(reader.result);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDownloadFeelSportsTemplate = () => {
    const blob = new Blob([FEELSPORTS_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-feelsports-cdvsp.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const mappedPreviewRows = useMemo(() => {
    return csvDataRows
      .map((cols) => ({
        firstName: csvMapping.firstName >= 0 ? (cols[csvMapping.firstName] || '').trim() : '',
        lastName: csvMapping.lastName >= 0 ? (cols[csvMapping.lastName] || '').trim() : '',
        dni: csvMapping.dni >= 0 ? (cols[csvMapping.dni] || '').trim() || undefined : undefined,
        birthDate: csvMapping.birthDate >= 0 ? (cols[csvMapping.birthDate] || '').trim() || undefined : undefined,
        email: csvMapping.email >= 0 ? (cols[csvMapping.email] || '').trim() || undefined : undefined,
        phone: csvMapping.phone >= 0 ? (cols[csvMapping.phone] || '').trim() || undefined : undefined,
        teamNameOrId:
          csvMapping.teamNameOrId >= 0 ? (cols[csvMapping.teamNameOrId] || '').trim() || undefined : undefined,
        guardianName:
          csvMapping.guardianName >= 0 ? (cols[csvMapping.guardianName] || '').trim() || undefined : undefined,
        guardianDni:
          csvMapping.guardianDni >= 0 ? (cols[csvMapping.guardianDni] || '').trim() || undefined : undefined,
        feelsportsId:
          csvMapping.feelsportsId >= 0 ? (cols[csvMapping.feelsportsId] || '').trim() || undefined : undefined,
      }))
      .filter((r) => Boolean(r.firstName || r.lastName));
  }, [csvDataRows, csvMapping]);

  const handleRunCsvImport = async () => {
    if (mappedPreviewRows.length === 0) return;
    setImportingCsv(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/intranet/census', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import_feelsports_csv', rows: mappedPreviewRows }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setErrorBanner(data?.error || 'Error importando el CSV.');
        return;
      }
      setCsvImportResult(data.result);
      showToast(
        `CSV importado: ${data.result.created} creados, ${data.result.enriched} enriquecidos, ${data.result.queuedForDedup} en revisión.`
      );
      await loadCensus();
    } catch {
      setErrorBanner('Error de red importando CSV.');
    } finally {
      setImportingCsv(false);
    }
  };

  // Resolver cola de deduplicación
  const handleResolveDedup = async (
    queueId: string,
    resolution: 'MERGE' | 'CREATE_NEW' | 'DISCARD'
  ) => {
    setResolvingDedupId(queueId);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/intranet/census', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve_dedup', queueId, resolution }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setErrorBanner(data?.error || 'No se pudo resolver la coincidencia.');
        return;
      }
      showToast(
        resolution === 'MERGE'
          ? 'Fichas fusionadas correctamente.'
          : resolution === 'CREATE_NEW'
            ? 'Nueva ficha creada desde cola de revisión.'
            : 'Registro descartado.'
      );
      await loadCensus();
    } catch {
      setErrorBanner('Error de red resolviendo deduplicación.');
    } finally {
      setResolvingDedupId(null);
    }
  };

  // Modal Invitaciones
  const openSingleInviteModal = (ath: AthleteRecord) => {
    setInviteMode('SINGLE');
    setInviteAthlete(ath);
    setInviteEmail(ath.guardianEmail || '');
    setInviteTargetType(ath.ageBracket === '+18' ? 'ATHLETE' : 'GUARDIAN');
    setInviteSendEmail(true);
    setInviteResults([]);
    setInviteSkipped([]);
    setInviteModalOpen(true);
  };

  const openBatchInviteModal = () => {
    setInviteMode('BATCH');
    setInviteAthlete(null);
    setInviteTeamId(teamFilter || teams[0]?.id || '');
    setInviteTargetType('AUTO');
    setInviteSendEmail(true);
    setInviteOnlyPending(true);
    setInviteResults([]);
    setInviteSkipped([]);
    setInviteModalOpen(true);
  };

  const handleSendInvitations = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingInvite(true);
    setErrorBanner(null);
    try {
      const body =
        inviteMode === 'SINGLE' && inviteAthlete
          ? {
              action: 'send_invitations',
              athleteId: inviteAthlete.id,
              email: inviteEmail.trim() || undefined,
              targetType: inviteTargetType,
              sendEmail: inviteSendEmail,
            }
          : {
              action: 'send_invitations',
              teamSeasonId: inviteTeamId,
              onlyPending: inviteOnlyPending,
              sendEmail: inviteSendEmail,
            };

      const res = await fetch('/api/intranet/census', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setErrorBanner(data?.error || 'Error enviando invitaciones.');
        return;
      }

      setInviteResults(Array.isArray(data.results) ? data.results : []);
      setInviteSkipped(Array.isArray(data.skipped) ? data.skipped : []);
      showToast(
        `Generadas ${data.results?.length || 0} invitaciones (${data.results?.filter((r: InviteResultItem) => r.emailSent).length || 0} enviadas por SMTP).`
      );
    } catch {
      setErrorBanner('Error de red generando invitaciones.');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCopyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2500);
    } catch {
      showToast('No se pudo copiar automáticamente; selecciona el enlace.');
    }
  };

  if (authError) {
    return (
      <main className="min-h-[75vh] bg-surface px-4 py-12 text-on-surface">
        <div className="mx-auto max-w-xl rounded-2xl border border-rose-500/30 bg-surface-container p-8 text-center">
          <Lock className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="font-headline text-2xl font-bold text-white">Acceso restringido</h1>
          <p className="mt-2 text-sm text-zinc-300">{authError}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/acceso"
              className="rounded-xl bg-primary-container px-5 py-2.5 text-sm font-bold text-white transition hover:bg-cta-hover"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/club"
              className="rounded-xl border border-white/15 bg-surface-container-high px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
            >
              Volver al panel
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface pb-16 pt-6 text-on-surface">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Cabecera */}
        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-container-low p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <Link
                href="/club"
                className="inline-flex items-center gap-1.5 font-medium text-zinc-300 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Panel Club
              </Link>
              <span>/</span>
              <span className="font-semibold text-primary">Censo Unificado</span>
              <span className="rounded-full border border-white/10 bg-surface-container-high px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300">
                Temporada 2026/2027
              </span>
            </div>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Censo Unificado, Deduplicación e Invitaciones
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Gestión centralizada de plantillas FAVB/AFADE, FeelSports, estados RGPD, semáforo de cuotas e invitaciones de onboarding.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {permissions.canImport && (
              <button
                type="button"
                onClick={handleSyncSources}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50 sm:text-sm"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sincronizar FAVB + Censo + RGPD
              </button>
            )}

            {permissions.canImport && (
              <button
                type="button"
                onClick={() => {
                  setCsvImportResult(null);
                  setCsvModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-surface-container-high px-3.5 py-2.5 text-xs font-bold text-white transition hover:border-primary/50 hover:bg-white/10 sm:text-sm"
              >
                <Upload className="h-4 w-4 text-primary" />
                Importar CSV FeelSports
              </button>
            )}

            {permissions.canEdit && (
              <button
                type="button"
                onClick={() => openAthleteModal(null)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-container px-4 py-2.5 text-xs font-bold text-white shadow-glow-crimson transition hover:bg-cta-hover sm:text-sm"
              >
                <UserPlus className="h-4 w-4" />
                Nuevo Deportista
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredAthletes.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-surface-container-high px-3.5 py-2.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/10 disabled:opacity-40 sm:text-sm"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          </div>
        </header>

        {/* Alertas y Toast */}
        {errorBanner && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              aria-label="Cerrar error"
              className="text-rose-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {toastMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* KPIs rápidos */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-surface-container p-4">
            <div className="text-xs font-medium text-zinc-400">Deportistas activos</div>
            <div className="mt-1 font-headline text-2xl font-bold text-white">
              {globalStats.totalActive}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-surface-container p-4">
            <div className="text-xs font-medium text-zinc-400">Fichas verificadas</div>
            <div className="mt-1 font-headline text-2xl font-bold text-emerald-400">
              {globalStats.verified}
              <span className="ml-1.5 text-xs font-normal text-zinc-400">
                / {globalStats.totalActive}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-surface-container p-4">
            <div className="text-xs font-medium text-zinc-400">RGPD Activo</div>
            <div className="mt-1 font-headline text-2xl font-bold text-sky-400">
              {globalStats.rgpdActive}
              <span className="ml-1.5 text-xs font-normal text-zinc-400">
                / {globalStats.totalActive}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-surface-container p-4">
            <div className="text-xs font-medium text-zinc-400">Pendientes de cuenta</div>
            <div className="mt-1 font-headline text-2xl font-bold text-amber-400">
              {globalStats.withoutAccount}
            </div>
          </div>
        </section>

        {/* Tarjetas de Progreso de campaña por equipo */}
        {teamSummaries.length > 0 && (
          <section className="mb-6">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Progreso de campaña por equipo
              </h2>
              {teamFilter && (
                <button
                  type="button"
                  onClick={() => setTeamFilter('')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Ver todos los equipos
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {teamSummaries.map((ts) => {
                const pct = ts.total > 0 ? Math.round((ts.verificados / ts.total) * 100) : 0;
                const isSelected = teamFilter === ts.teamId;
                return (
                  <button
                    key={ts.teamId}
                    type="button"
                    onClick={() =>
                      setTeamFilter((prev) => (prev === ts.teamId ? '' : ts.teamId))
                    }
                    className={`rounded-xl border p-3.5 text-left transition ${
                      isSelected
                        ? 'border-primary bg-primary-container/15 shadow-glow-crimson'
                        : 'border-white/10 bg-surface-container hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-sm font-bold text-white">
                        {ts.teamName}
                      </span>
                      <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
                        {ts.association}
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between text-xs">
                      <span className="font-semibold text-emerald-300">
                        {ts.verificados}/{ts.total} verificadas
                      </span>
                      <span className="text-zinc-400">{ts.conRgpd} RGPD</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-primary-container transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Pestañas principales */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('censo')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                activeTab === 'censo'
                  ? 'bg-primary-container text-white'
                  : 'bg-surface-container text-zinc-300 hover:bg-white/10'
              }`}
            >
              <Users className="h-4 w-4" />
              Censo unificado
              <span className="rounded-full bg-black/30 px-2 py-0.5 text-xs">
                {filteredAthletes.length}
              </span>
            </button>

            {permissions.canImport && (
              <button
                type="button"
                onClick={() => setActiveTab('dedup')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                  activeTab === 'dedup'
                    ? 'bg-primary-container text-white'
                    : 'bg-surface-container text-zinc-300 hover:bg-white/10'
                }`}
              >
                <GitMerge className="h-4 w-4" />
                Cola de Deduplicación
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    dedupQueue.length > 0
                      ? 'bg-amber-500 text-black'
                      : 'bg-black/30 text-zinc-300'
                  }`}
                >
                  {dedupQueue.length}
                </span>
              </button>
            )}
          </div>

          {permissions.canSendInvitation && activeTab === 'censo' && (
            <button
              type="button"
              onClick={openBatchInviteModal}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/25 sm:text-sm"
            >
              <Send className="h-4 w-4" />
              Invitar pendientes del equipo
            </button>
          )}
        </div>

        {/* TAB 1: CENSO */}
        {activeTab === 'censo' && (
          <>
            {/* Barra de filtros */}
            <section className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-surface-container p-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, tutor, DNI (últ. 5) o licencia..."
                  className="w-full rounded-xl border border-white/10 bg-surface-container-lowest py-2.5 pl-9 pr-3 text-sm text-white placeholder-zinc-500 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  aria-label="Filtrar por equipo"
                  className="w-full appearance-none rounded-xl border border-white/10 bg-surface-container-lowest py-2.5 pl-9 pr-3 text-sm text-white focus:border-primary focus:outline-none"
                >
                  <option value="">Todos los equipos</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filtrar por estado de ficha"
                className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
              >
                <option value="">Todos los estados</option>
                <option value="VERIFICADO">Verificado</option>
                <option value="PENDIENTE_VALIDAR">Pendiente validar</option>
                <option value="IMPORTADO">Importado</option>
                <option value="BAJA">Baja</option>
                <option value="SHREDDED">Suprimido</option>
              </select>

              <select
                value={rgpdFilter}
                onChange={(e) => setRgpdFilter(e.target.value)}
                aria-label="Filtrar por estado RGPD"
                className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
              >
                <option value="">Todo RGPD</option>
                <option value="ACTIVE">RGPD Activo</option>
                <option value="PENDING">RGPD Pendiente</option>
                <option value="REVOKED">RGPD Revocado</option>
                <option value="SHREDDED">Suprimido Art.17</option>
              </select>

              {permissions.canIncludeDemo && (
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-300 sm:col-span-2 lg:col-span-5">
                  <input
                    type="checkbox"
                    checked={includeDemo}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setIncludeDemo(next);
                      void loadCensus(next);
                    }}
                    className="h-4 w-4 rounded border-white/20 bg-surface-container-lowest accent-primary-container"
                  />
                  Incluir perfiles de demostración (demo)
                </label>
              )}
            </section>

            {/* Estado de carga / vacío */}
            {loading ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-surface-container py-16 text-zinc-400">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Cargando censo unificado...</p>
              </div>
            ) : filteredAthletes.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-surface-container p-10 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-zinc-500" />
                <h3 className="text-base font-bold text-white">No hay deportistas que coincidan</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {athletes.length === 0 && permissions.canImport
                    ? 'Pulsa "Sincronizar FAVB + Censo + RGPD" o importa un CSV de FeelSports para poblar el censo.'
                    : 'Prueba limpiando los filtros o cambiando la búsqueda.'}
                </p>
              </div>
            ) : (
              <>
                {/* Vista Desktop: Tabla */}
                <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-surface-container md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 bg-surface-container-lowest text-xs uppercase tracking-wider text-zinc-400">
                          <th className="px-4 py-3.5 font-bold">Deportista</th>
                          <th className="px-4 py-3.5 font-bold">Equipo(s)</th>
                          <th className="px-4 py-3.5 font-bold">Estado Ficha</th>
                          {permissions.canViewTrafficLight && (
                            <th className="px-4 py-3.5 font-bold">Semáforo Cuotas</th>
                          )}
                          <th className="px-4 py-3.5 font-bold">Estado RGPD</th>
                          <th className="px-4 py-3.5 font-bold">Tutor / Contacto</th>
                          <th className="px-4 py-3.5 text-right font-bold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredAthletes.map((ath) => {
                          const stMeta = STATUS_BADGE[ath.status] || STATUS_BADGE.IMPORTADO;
                          const rgpdMeta = RGPD_BADGE[ath.rgpdStatus] || RGPD_BADGE.PENDING;
                          const lightMeta = ath.paymentTrafficLight
                            ? TRAFFIC_LIGHT_META[ath.paymentTrafficLight]
                            : null;

                          return (
                            <tr
                              key={ath.id}
                              className="transition hover:bg-surface-container-high/50"
                            >
                              <td className="px-4 py-3.5 align-top">
                                <div className="flex flex-wrap items-center gap-1.5 font-bold text-white">
                                  <span>{ath.fullName}</span>
                                  {ath.isDemo && (
                                    <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                                      DEMO
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                                  {ath.ageBracket && (
                                    <span className="rounded bg-white/5 px-1.5 py-0.5 font-semibold text-zinc-300">
                                      {ath.ageBracket}
                                      {ath.approxAge !== null ? ` (~${ath.approxAge}a)` : ''}
                                    </span>
                                  )}
                                  {ath.dniLast5 && <span>DNI ***{ath.dniLast5}</span>}
                                  {ath.jerseyNumber !== null && <span>#{ath.jerseyNumber}</span>}
                                  {ath.shirtSize && <span>Talla {ath.shirtSize}</span>}
                                </div>
                              </td>

                              <td className="px-4 py-3.5 align-top">
                                <div className="flex flex-wrap gap-1">
                                  {ath.teams.length === 0 ? (
                                    <span className="text-xs text-zinc-500">Sin equipo</span>
                                  ) : (
                                    ath.teams.map((t) => (
                                      <span
                                        key={t.teamSeasonId}
                                        className={`inline-block rounded-lg px-2 py-0.5 text-xs font-medium ${
                                          t.isPrimary
                                            ? 'border border-primary/30 bg-primary-container/15 text-primary'
                                            : 'border border-white/10 bg-white/5 text-zinc-300'
                                        }`}
                                      >
                                        {t.teamName}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </td>

                              <td className="px-4 py-3.5 align-top">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stMeta.cls}`}
                                >
                                  {stMeta.label}
                                </span>
                              </td>

                              {permissions.canViewTrafficLight && (
                                <td className="px-4 py-3.5 align-top">
                                  {lightMeta ? (
                                    <span
                                      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${lightMeta.cls}`}
                                    >
                                      <span>{lightMeta.dot}</span>
                                      <span>{lightMeta.label}</span>
                                    </span>
                                  ) : (
                                    <span className="text-xs text-zinc-500">—</span>
                                  )}
                                </td>
                              )}

                              <td className="px-4 py-3.5 align-top">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${rgpdMeta.cls}`}
                                >
                                  {rgpdMeta.label}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 align-top">
                                {ath.guardianName ? (
                                  <div>
                                    <div className="font-medium text-zinc-200">{ath.guardianName}</div>
                                    {permissions.canViewEmergency && (
                                      <div className="mt-0.5 text-xs text-zinc-400">
                                        {ath.guardianPhone && <div>{ath.guardianPhone}</div>}
                                        {ath.guardianEmail && (
                                          <div className="truncate max-w-[200px]">
                                            {ath.guardianEmail}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {(ath.hasGuardianAccount || ath.hasAthleteAccount) && (
                                      <span className="mt-1 inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                        Cuenta activa
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-zinc-500">Sin tutor vinculado</span>
                                )}
                              </td>

                              <td className="px-4 py-3.5 text-right align-top">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openAthleteModal(ath)}
                                    title={ath.canEditRow ? 'Ver / Editar ficha' : 'Ver ficha'}
                                    className="rounded-lg border border-white/10 bg-surface-container-high p-2 text-zinc-200 transition hover:border-white/30 hover:text-white"
                                  >
                                    {ath.canEditRow ? (
                                      <Edit2 className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>

                                  {permissions.canViewSensitive && ath.status !== 'SHREDDED' && (
                                    <button
                                      type="button"
                                      onClick={() => openAthleteModal(ath, true)}
                                      title="Ver datos sensibles (auditado)"
                                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-amber-300 transition hover:bg-amber-500/20"
                                    >
                                      <ShieldAlert className="h-4 w-4" />
                                    </button>
                                  )}

                                  {ath.canInvite && (
                                    <button
                                      type="button"
                                      onClick={() => openSingleInviteModal(ath)}
                                      title="Enviar o copiar invitación de onboarding"
                                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-300 transition hover:bg-emerald-500/20"
                                    >
                                      <Mail className="h-4 w-4" />
                                    </button>
                                  )}

                                  {permissions.canDeactivate &&
                                    ath.status !== 'BAJA' &&
                                    ath.status !== 'SHREDDED' && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeactivateAthlete(ath)}
                                        title="Dar de baja"
                                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300 transition hover:bg-rose-500/20"
                                      >
                                        <UserX className="h-4 w-4" />
                                      </button>
                                    )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Vista Mobile (375px): Cards limpias sin desbordamiento */}
                <div className="space-y-3 md:hidden">
                  {filteredAthletes.map((ath) => {
                    const stMeta = STATUS_BADGE[ath.status] || STATUS_BADGE.IMPORTADO;
                    const rgpdMeta = RGPD_BADGE[ath.rgpdStatus] || RGPD_BADGE.PENDING;
                    const lightMeta = ath.paymentTrafficLight
                      ? TRAFFIC_LIGHT_META[ath.paymentTrafficLight]
                      : null;

                    return (
                      <article
                        key={ath.id}
                        className="rounded-2xl border border-white/10 bg-surface-container p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate font-headline text-base font-bold text-white">
                              {ath.fullName}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
                              {ath.ageBracket && (
                                <span className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-300">
                                  {ath.ageBracket}
                                </span>
                              )}
                              {ath.dniLast5 && <span>***{ath.dniLast5}</span>}
                              {ath.jerseyNumber !== null && <span>#{ath.jerseyNumber}</span>}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stMeta.cls}`}
                          >
                            {stMeta.label}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {ath.teams.map((t) => (
                            <span
                              key={t.teamSeasonId}
                              className={`rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                                t.isPrimary
                                  ? 'border border-primary/30 bg-primary-container/15 text-primary'
                                  : 'border border-white/10 bg-white/5 text-zinc-300'
                              }`}
                            >
                              {t.teamName}
                            </span>
                          ))}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-surface-container-lowest p-2.5 text-xs">
                          <div>
                            <div className="text-[10px] uppercase text-zinc-500">RGPD</div>
                            <div className="mt-0.5 font-semibold text-zinc-200">
                              {rgpdMeta.label}
                            </div>
                          </div>
                          {permissions.canViewTrafficLight && (
                            <div>
                              <div className="text-[10px] uppercase text-zinc-500">Cuotas</div>
                              <div
                                className={`mt-0.5 font-semibold ${
                                  lightMeta ? lightMeta.cls : 'text-zinc-500'
                                }`}
                              >
                                {lightMeta ? `${lightMeta.dot} ${lightMeta.label}` : '—'}
                              </div>
                            </div>
                          )}
                          <div className="col-span-2">
                            <div className="text-[10px] uppercase text-zinc-500">Tutor</div>
                            <div className="mt-0.5 truncate text-zinc-200">
                              {ath.guardianName || 'Sin tutor'}
                              {permissions.canViewEmergency && ath.guardianPhone
                                ? ` · ${ath.guardianPhone}`
                                : ''}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openAthleteModal(ath)}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-surface-container-high px-3 py-2 text-xs font-bold text-white"
                          >
                            {ath.canEditRow ? (
                              <Edit2 className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                            {ath.canEditRow ? 'Editar' : 'Ficha'}
                          </button>

                          {permissions.canViewSensitive && ath.status !== 'SHREDDED' && (
                            <button
                              type="button"
                              onClick={() => openAthleteModal(ath, true)}
                              aria-label="Ver datos sensibles"
                              className="inline-flex items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300"
                            >
                              <ShieldAlert className="h-4 w-4" />
                            </button>
                          )}

                          {ath.canInvite && (
                            <button
                              type="button"
                              onClick={() => openSingleInviteModal(ath)}
                              className="inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              Invitar
                            </button>
                          )}

                          {permissions.canDeactivate &&
                            ath.status !== 'BAJA' &&
                            ath.status !== 'SHREDDED' && (
                              <button
                                type="button"
                                onClick={() => handleDeactivateAthlete(ath)}
                                aria-label="Dar de baja"
                                className="inline-flex items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300"
                              >
                                <UserX className="h-4 w-4" />
                              </button>
                            )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* TAB 2: COLA DE DEDUPLICACIÓN */}
        {activeTab === 'dedup' && permissions.canImport && (
          <section className="space-y-4">
            {dedupQueue.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-surface-container p-10 text-center">
                <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Cola de deduplicación limpia</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  No hay coincidencias dudosas de FeelSports pendientes de revisión manual.
                </p>
              </div>
            ) : (
              dedupQueue.map((item) => {
                const isBusy = resolvingDedupId === item.id;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-amber-500/30 bg-surface-container p-5"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                          {item.sourceType}
                        </span>
                        <p className="mt-1.5 text-sm font-semibold text-white">
                          {item.matchReason}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.candidate && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleResolveDedup(item.id, 'MERGE')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                          >
                            <GitMerge className="h-4 w-4" />
                            Fusionar
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleResolveDedup(item.id, 'CREATE_NEW')}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-sky-500 disabled:opacity-50"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Crear nuevo
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleResolveDedup(item.id, 'DISCARD')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-surface-container-high px-3.5 py-2 text-xs font-bold text-zinc-300 transition hover:bg-rose-500/20 hover:text-rose-200 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Descartar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-surface-container-lowest p-4">
                        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                          Registro importado (FeelSports CSV)
                        </div>
                        <dl className="space-y-1 text-xs text-zinc-300">
                          <div>
                            <dt className="inline text-zinc-500">Nombre: </dt>
                            <dd className="inline font-semibold text-white">
                              {item.payload.firstName} {item.payload.lastName}
                            </dd>
                          </div>
                          <div>
                            <dt className="inline text-zinc-500">Fecha nac.: </dt>
                            <dd className="inline">{item.payload.birthDate || '—'}</dd>
                          </div>
                          <div>
                            <dt className="inline text-zinc-500">DNI: </dt>
                            <dd className="inline">{item.payload.dni || '—'}</dd>
                          </div>
                          <div>
                            <dt className="inline text-zinc-500">Equipo: </dt>
                            <dd className="inline">{item.payload.teamNameOrId || '—'}</dd>
                          </div>
                          <div>
                            <dt className="inline text-zinc-500">Tutor / Contacto: </dt>
                            <dd className="inline">
                              {[item.payload.guardianName, item.payload.email, item.payload.phone]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-surface-container-lowest p-4">
                        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                          Ficha existente candidata en Censo
                        </div>
                        {item.candidate ? (
                          <dl className="space-y-1 text-xs text-zinc-300">
                            <div>
                              <dt className="inline text-zinc-500">Nombre: </dt>
                              <dd className="inline font-semibold text-white">
                                {item.candidate.fullName}
                              </dd>
                            </div>
                            <div>
                              <dt className="inline text-zinc-500">Año nac.: </dt>
                              <dd className="inline">{item.candidate.birthYear ?? '—'}</dd>
                            </div>
                            <div>
                              <dt className="inline text-zinc-500">DNI (últ. 5): </dt>
                              <dd className="inline">
                                {item.candidate.dniLast5 ? `***${item.candidate.dniLast5}` : '—'}
                              </dd>
                            </div>
                            <div>
                              <dt className="inline text-zinc-500">Equipos: </dt>
                              <dd className="inline">
                                {item.candidate.teams.join(', ') || '—'}
                              </dd>
                            </div>
                            <div>
                              <dt className="inline text-zinc-500">Estado: </dt>
                              <dd className="inline">{item.candidate.status}</dd>
                            </div>
                          </dl>
                        ) : (
                          <p className="text-xs text-zinc-500">
                            No se encontró ficha candidata activa.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}
      </div>

      {/* MODAL FICHA / EDICIÓN / DATOS SENSIBLES AUDITADOS */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-surface-container-low p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h2 className="font-headline text-xl font-bold text-white">
                  {editingAthlete
                    ? `Ficha de ${editingAthlete.fullName}`
                    : 'Nuevo Deportista en el Censo'}
                </h2>
                {editingAthlete && (
                  <p className="mt-0.5 text-xs text-zinc-400">
                    ID: {editingAthlete.id} · Estado RGPD: {editingAthlete.rgpdStatus}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                aria-label="Cerrar modal"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Bloque Datos Sensibles Auditados */}
            {editingAthlete &&
              permissions.canViewSensitive &&
              editingAthlete.status !== 'SHREDDED' && (
                <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
                      <ShieldAlert className="h-4 w-4 text-amber-400" />
                      Acceso a datos sensibles cifrados (DNI completo, fecha exacta y alergias)
                    </div>
                    {!sensitiveData && (
                      <button
                        type="button"
                        disabled={loadingSensitive}
                        onClick={() => handleRevealSensitive(editingAthlete.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-amber-400 disabled:opacity-50"
                      >
                        {loadingSensitive ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShieldAlert className="h-3.5 w-3.5" />
                        )}
                        Revelar (auditado)
                      </button>
                    )}
                  </div>

                  {sensitiveData && (
                    <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg bg-black/30 p-3 text-xs text-zinc-200 sm:grid-cols-2">
                      <div>
                        <span className="text-zinc-400">DNI / NIE: </span>
                        <strong className="text-white">{sensitiveData.dni || 'No registrado'}</strong>
                      </div>
                      <div>
                        <span className="text-zinc-400">Fecha nacimiento: </span>
                        <strong className="text-white">
                          {sensitiveData.birthDate || 'No verificada'}
                        </strong>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-zinc-400">Alergias / Notas médicas: </span>
                        <strong className="text-white">
                          {sensitiveData.medicalAllergies || 'Ninguna registrada'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-zinc-400">DNI Tutor: </span>
                        <strong className="text-white">
                          {sensitiveData.guardianDni || 'No registrado'}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

            <form onSubmit={handleSaveAthlete} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fFirstName}
                    onChange={(e) => setFFirstName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fLastName}
                    onChange={(e) => setFLastName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Fecha nacimiento (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fBirthDate}
                    onChange={(e) => setFBirthDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Año nacimiento (aprox. si no hay fecha)
                  </label>
                  <input
                    type="number"
                    min={1950}
                    max={2026}
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fBirthYear}
                    onChange={(e) => setFBirthYear(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    DNI / NIE / Pasaporte{' '}
                    {editingAthlete?.dniLast5 && !fDni ? `(actual: ***${editingAthlete.dniLast5})` : ''}
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fDni}
                    onChange={(e) => setFDni(e.target.value)}
                    placeholder={editingAthlete?.dniLast5 ? 'Dejar vacío para mantener' : '12345678Z'}
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">Estado</label>
                  <select
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fStatus}
                    onChange={(e) => setFStatus(e.target.value as AthleteStatus)}
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    <option value="IMPORTADO">Importado</option>
                    <option value="PENDIENTE_VALIDAR">Pendiente validar</option>
                    <option value="VERIFICADO">Verificado</option>
                    <option value="BAJA">Baja</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Equipo principal
                  </label>
                  <select
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fPrimaryTeam}
                    onChange={(e) => setFPrimaryTeam(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    <option value="">Sin equipo asignado</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">Género</label>
                  <select
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fGender}
                    onChange={(e) =>
                      setFGender(e.target.value === 'MASCULINO' ? 'MASCULINO' : 'FEMENINO')
                    }
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    <option value="FEMENINO">Femenino</option>
                    <option value="MASCULINO">Masculino</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Licencia FAVB
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fFavbLicense}
                    onChange={(e) => setFFavbLicense(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">Dorsal</label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                      value={fJerseyNumber}
                      onChange={(e) => setFJerseyNumber(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">Talla</label>
                    <input
                      type="text"
                      placeholder="S / M / L"
                      disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                      value={fShirtSize}
                      onChange={(e) => setFShirtSize(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              {/* Equipos secundarios */}
              {teams.length > 0 && (!editingAthlete || editingAthlete.canEditRow) && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
                    Equipos secundarios (convocatorias)
                  </label>
                  <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-xl border border-white/10 bg-surface-container-lowest p-2.5">
                    {teams
                      .filter((t) => t.id !== fPrimaryTeam)
                      .map((t) => {
                        const checked = fSecondaryTeams.includes(t.id);
                        return (
                          <label
                            key={t.id}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-surface-container px-2.5 py-1 text-xs text-zinc-200"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFSecondaryTeams((prev) => [...prev, t.id]);
                                } else {
                                  setFSecondaryTeams((prev) => prev.filter((id) => id !== t.id));
                                }
                              }}
                              className="accent-primary-container"
                            />
                            {t.name}
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Emergencia y Alergias */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-surface-container p-3.5 sm:grid-cols-2">
                <div className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Contacto de emergencia y datos médicos
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-300">Contacto emergencia</label>
                  <input
                    type="text"
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fEmergName}
                    onChange={(e) => setFEmergName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-300">Teléfono emergencia</label>
                  <input
                    type="text"
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fEmergPhone}
                    onChange={(e) => setFEmergPhone(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-zinc-300">
                    Alergias o indicaciones médicas (cifrado AES-256-GCM)
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fAllergies}
                    onChange={(e) => setFAllergies(e.target.value)}
                    placeholder="Dejar vacío si no se desea sobrescribir sin revelar"
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Tutor principal */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-surface-container p-3.5 sm:grid-cols-2">
                <div className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Tutor / Representante legal
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-300">Nombre completo tutor</label>
                  <input
                    type="text"
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fGuardianName}
                    onChange={(e) => setFGuardianName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-300">Parentesco</label>
                  <select
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fGuardianRel}
                    onChange={(e) =>
                      setFGuardianRel(
                        e.target.value as 'PADRE' | 'MADRE' | 'TUTOR_LEGAL'
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    <option value="MADRE">Madre</option>
                    <option value="PADRE">Padre</option>
                    <option value="TUTOR_LEGAL">Tutor legal</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-300">Email tutor</label>
                  <input
                    type="email"
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fGuardianEmail}
                    onChange={(e) => setFGuardianEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-300">Teléfono tutor</label>
                  <input
                    type="text"
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fGuardianPhone}
                    onChange={(e) => setFGuardianPhone(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-zinc-300">DNI / NIE tutor</label>
                  <input
                    type="text"
                    disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                    value={fGuardianDni}
                    onChange={(e) => setFGuardianDni(e.target.value)}
                    placeholder="Dejar vacío para mantener existente"
                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/10"
                >
                  Cerrar
                </button>
                {(!editingAthlete || editingAthlete.canEditRow) && permissions.canEdit && (
                  <button
                    type="submit"
                    disabled={savingAthlete}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-container px-5 py-2 text-sm font-bold text-white transition hover:bg-cta-hover disabled:opacity-50"
                  >
                    {savingAthlete && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingAthlete ? 'Guardar cambios' : 'Crear deportista'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORTADOR CSV FEELSPORTS */}
      {csvModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/15 bg-surface-container-low p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h2 className="font-headline text-xl font-bold text-white">
                  Importador CSV FeelSports
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Deduplicación automática por DNI (Blind Index) o nombre + año de nacimiento. Los casos dudosos pasan a la cola de revisión.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                aria-label="Cerrar importador"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadFeelSportsTemplate}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-surface-container-high px-3.5 py-2 text-xs font-bold text-white hover:bg-white/10"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                Descargar plantilla CSV FeelSports
              </button>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/40 bg-primary-container/15 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary-container/25">
                <Upload className="h-4 w-4" />
                Subir archivo .csv
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
                O pega aquí el contenido CSV (separado por punto y coma `;` o coma `,`)
              </label>
              <textarea
                rows={5}
                value={csvRawText}
                onChange={(e) => applyAutoMapping(e.target.value)}
                placeholder="Nombre;Apellidos;DNI/NIE;Fecha Nacimiento;Email;Teléfono;Categoría;Equipo;Tutor Legal"
                className="w-full rounded-xl border border-white/10 bg-surface-container-lowest p-3 font-mono text-xs text-white placeholder-zinc-600 focus:border-primary focus:outline-none"
              />
            </div>

            {csvHeaders.length > 0 && (
              <div className="mb-4 space-y-3 rounded-xl border border-white/10 bg-surface-container p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Mapeo de columnas detectadas ({csvDataRows.length} filas)
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                  {CSV_FIELD_LABELS.map((field) => (
                    <div key={field.key}>
                      <label className="mb-1 block text-[11px] font-semibold text-zinc-300">
                        {field.label}
                      </label>
                      <select
                        value={csvMapping[field.key]}
                        onChange={(e) =>
                          setCsvMapping((prev) => ({
                            ...prev,
                            [field.key]: Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-white/10 bg-surface-container-lowest px-2 py-1.5 text-xs text-white"
                      >
                        <option value={-1}>— Ignorar —</option>
                        {csvHeaders.map((h, idx) => (
                          <option key={`${h}-${idx}`} value={idx}>
                            {h || `Col ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {mappedPreviewRows.length > 0 && (
                  <div className="overflow-x-auto pt-2">
                    <div className="mb-1.5 text-xs font-semibold text-zinc-400">
                      Vista previa (primeras {Math.min(5, mappedPreviewRows.length)} filas de{' '}
                      {mappedPreviewRows.length}):
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-zinc-400">
                          <th className="py-1.5 pr-3">Nombre</th>
                          <th className="py-1.5 pr-3">DNI</th>
                          <th className="py-1.5 pr-3">Nacimiento</th>
                          <th className="py-1.5 pr-3">Equipo</th>
                          <th className="py-1.5 pr-3">Tutor / Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-zinc-200">
                        {mappedPreviewRows.slice(0, 5).map((r, i) => (
                          <tr key={i}>
                            <td className="py-1.5 pr-3 font-medium">
                              {r.firstName} {r.lastName}
                            </td>
                            <td className="py-1.5 pr-3">{r.dni || '—'}</td>
                            <td className="py-1.5 pr-3">{r.birthDate || '—'}</td>
                            <td className="py-1.5 pr-3">{r.teamNameOrId || '—'}</td>
                            <td className="py-1.5 pr-3">
                              {[r.guardianName, r.email].filter(Boolean).join(' · ') || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {csvImportResult && (
              <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center sm:grid-cols-4">
                <div>
                  <div className="text-xs text-zinc-400">Creados</div>
                  <div className="text-xl font-bold text-emerald-300">{csvImportResult.created}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Enriquecidos</div>
                  <div className="text-xl font-bold text-sky-300">{csvImportResult.enriched}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">En cola revisión</div>
                  <div className="text-xl font-bold text-amber-300">
                    {csvImportResult.queuedForDedup}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Suprimidos omitidos</div>
                  <div className="text-xl font-bold text-zinc-300">
                    {csvImportResult.skippedShredded}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/10"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={importingCsv || mappedPreviewRows.length === 0}
                onClick={handleRunCsvImport}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-container px-5 py-2 text-sm font-bold text-white transition hover:bg-cta-hover disabled:opacity-50"
              >
                {importingCsv && <Loader2 className="h-4 w-4 animate-spin" />}
                Importar {mappedPreviewRows.length} filas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INVITACIONES ONBOARDING */}
      {inviteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-surface-container-low p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h2 className="font-headline text-xl font-bold text-white">
                  {inviteMode === 'SINGLE' && inviteAthlete
                    ? `Invitar a ${inviteAthlete.fullName}`
                    : 'Invitar pendientes del equipo'}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Genera enlaces personales de activación (`/mi-club/onboarding?invite=...`) válidos durante 14 días.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                aria-label="Cerrar modal invitaciones"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvitations} className="space-y-4">
              {inviteMode === 'SINGLE' && inviteAthlete ? (
                <>
                  <div className="rounded-xl border border-white/10 bg-surface-container p-3.5 text-xs text-zinc-300">
                    Tramo de edad detectado:{' '}
                    <strong className="text-white">
                      {inviteAthlete.ageBracket || 'Sin fecha verificada (tratado como menor)'}
                    </strong>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">
                      Tipo de cuenta destino
                    </label>
                    <select
                      value={inviteTargetType}
                      onChange={(e) =>
                        setInviteTargetType(e.target.value as 'AUTO' | 'GUARDIAN' | 'ATHLETE')
                      }
                      className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white"
                    >
                      <option value="GUARDIAN">Tutor legal / Padre / Madre (GUARDIAN)</option>
                      {(inviteAthlete.ageBracket === '14-17' ||
                        inviteAthlete.ageBracket === '+18') && (
                        <option value="ATHLETE">
                          Cuenta propia de deportista (ATHLETE · ≥14 años)
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">
                      Correo electrónico destinatario *
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="familia@ejemplo.com"
                      className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">
                      Equipo a invitar *
                    </label>
                    <select
                      required
                      value={inviteTeamId}
                      onChange={(e) => setInviteTeamId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={inviteOnlyPending}
                      onChange={(e) => setInviteOnlyPending(e.target.checked)}
                      className="accent-primary-container"
                    />
                    Solo deportistas sin cuenta de tutor o deportista activada
                  </label>
                </>
              )}

              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={inviteSendEmail}
                  onChange={(e) => setInviteSendEmail(e.target.checked)}
                  className="accent-primary-container"
                />
                Enviar invitación automáticamente por correo electrónico (SMTP)
              </label>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/10"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {sendingInvite ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {inviteSendEmail ? 'Generar y enviar' : 'Generar enlace copiable'}
                </button>
              </div>
            </form>

            {inviteResults.length > 0 && (
              <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Enlaces generados ({inviteResults.length})
                </div>
                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {inviteResults.map((r) => (
                    <div
                      key={r.athleteId}
                      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-surface-container-lowest p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white">
                          {r.athleteName}{' '}
                          <span className="font-normal text-zinc-400">({r.targetType})</span>
                        </div>
                        <div className="truncate text-zinc-400">
                          {r.email} ·{' '}
                          {r.emailSent ? (
                            <span className="text-emerald-400">Email SMTP enviado</span>
                          ) : r.emailError ? (
                            <span className="text-amber-300">SMTP: {r.emailError}</span>
                          ) : (
                            <span className="text-zinc-400">Solo enlace</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(r.athleteId, r.inviteUrl)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-surface-container-high px-3 py-1.5 font-bold text-white hover:bg-white/10"
                      >
                        {copiedKey === r.athleteId ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copiar enlace
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inviteSkipped.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-200">
                <div className="mb-1 font-bold">Omitidos ({inviteSkipped.length}):</div>
                <ul className="max-h-32 list-disc space-y-0.5 overflow-y-auto pl-4 text-zinc-300">
                  {inviteSkipped.map((s) => (
                    <li key={s.athleteId}>
                      {s.athleteName}: {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
