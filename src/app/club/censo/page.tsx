'use client';

import React, { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  RefreshCw,
  UserPlus,
  Download,
  Search,
  Filter,
  Edit2,
  Eye,
  Copy,
  Check,
  X,
  UserX,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Lock,
  Link2,
  Share2,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  CreditCard,
  BarChart3,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
} from 'lucide-react';
import {
  CLUB_CATEGORIES_META,
  getShortTeamLabelInFamily,
  getTeamColorTheme,
  groupByCategoryFamily,
} from '@/lib/club-info';
import { buildCsvString } from '@/lib/intranet/csv-utils';
import { formatMadridDateString } from '@/lib/date-utils';
import IntranetModal from '@/components/intranet/IntranetModal';

type AthleteStatus = 'IMPORTADO' | 'PENDIENTE_VALIDAR' | 'VERIFICADO' | 'BAJA' | 'SHREDDED';
type RgpdStatus = 'ACTIVE' | 'REVOKED' | 'SHREDDED' | 'PENDING';
type TrafficLight = 'GREEN' | 'YELLOW' | 'RED' | 'NONE';
type SortField = 'athlete' | 'team' | 'age' | 'status' | 'rgpd' | 'payment';
type SortDir = 'asc' | 'desc';

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

interface PermissionsInfo {
  isPresident: boolean;
  canImport: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canViewEmergency: boolean;
  canViewSensitive: boolean;
  canViewTrafficLight: boolean;
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

interface RegLinkRecord {
  id: string;
  token: string;
  categoryCode: string;
  categoryLabel: string;
  defaultTeamSeasonId: string | null;
  defaultTeamName: string | null;
  seasonId: string;
  isActive: boolean;
  submissionsCount: number;
  expiresAt: string | null;
  createdAt: string;
  registrationPath: string;
  registrationUrl: string;
}

interface RegRequestRecord {
  id: string;
  athleteId: string;
  userId: string;
  linkId: string | null;
  defaultTeamSeasonId: string | null;
  categoryCode: string;
  categoryLabel: string;
  athleteFirstName: string;
  athleteLastName: string;
  athleteFullName: string;
  birthYear: number | null;
  gender: string;
  dniMasked: string | null;
  shirtSize: string | null;
  jerseyNumber: number | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  athleteStatus: AthleteStatus;
  selectedProductId: string | null;
  selectedProductName: string | null;
  selectedPricePlanId: string | null;
  selectedPlanName: string | null;
  selectedPlanPeriodicity: string | null;
  selectedPlanAmount: number | null;
  isMinor: boolean;
  guardianName: string | null;
  guardianRelationship: string | null;
  contactEmail: string;
  contactPhone: string | null;
  consentImage: boolean;
  consentTravel: boolean;
  consentDocumentHash: string | null;
  consentId: string | null;
  isConsentSigned?: boolean;
  consentStatus: string;
  consentSignedAt: string | null;
  assignedTeamIds: string[];
  athleteTeams: AthleteTeamItem[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  enrollmentId: string | null;
  adminNotes: string | null;
  createdAt: string;
}

interface FavbMissingReportItem {
  favbId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  teamId: string;
  teamName: string;
  dorsal: number | null;
  birthYear: number | null;
  registrationUrl: string | null;
}

interface FavbMismatchReportItem {
  athleteId: string;
  clubFullName: string;
  favbFullName: string;
  clubStatus: string;
  missingTeamIds: string[];
  missingTeamNames: string[];
  dorsalDiff: { clubDorsal: number | null; favbDorsal: number } | null;
  nameDiff: { clubName: string; favbName: string } | null;
}

interface FavbOnlyClubReportItem {
  athleteId: string;
  fullName: string;
  teamNames: string[];
  status: string;
}

interface FavbDiscrepancyReport {
  checkedAtIso: string;
  favbPlayersCount: number;
  clubAthletesCount: number;
  missingInClub: FavbMissingReportItem[];
  discrepancies: FavbMismatchReportItem[];
  onlyInClub: FavbOnlyClubReportItem[];
}

interface RegPaymentPlanOption {
  planId: string;
  productId: string;
  productName: string;
  productType: string;
  planName: string;
  periodicity: string;
  totalAmount: number;
  installmentsCount: number;
  dueDay: number;
}

interface RegDiscountOption {
  id: string;
  name: string;
  kind: string;
  valueType: 'PERCENTAGE' | 'FIXED';
  value: number;
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
    label: 'Sin registrar',
    cls: 'bg-white/5 text-on-surface/85 border-white/15',
  },
  BAJA: {
    label: 'Baja',
    cls: 'bg-white/10 text-on-surface/90 border-white/20',
  },
  SHREDDED: {
    label: 'Suprimido',
    cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
};

const RGPD_BADGE: Record<RgpdStatus, { label: string; cls: string }> = {
  ACTIVE: {
    label: 'Firmado',
    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  PENDING: {
    label: 'No firmado',
    cls: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  },
  REVOKED: {
    label: 'Revocado',
    cls: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
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
  NONE: { dot: '⚪', label: 'Sin cuota', cls: 'text-tertiary' },
};

function ClubCensoPageContent() {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get('tab');

  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [teamSummaries, setTeamSummaries] = useState<TeamSummary[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [permissions, setPermissions] = useState<PermissionsInfo>({
    isPresident: false,
    canImport: false,
    canEdit: false,
    canDeactivate: false,
    canViewEmergency: false,
    canViewSensitive: false,
    canViewTrafficLight: false,
  });

  const [activeTab, setActiveTab] = useState<'plantilla' | 'inscripciones'>(
    initialTabParam === 'inscripciones' ? 'inscripciones' : 'plantilla'
  );
  const [sortField, setSortField] = useState<SortField>('athlete');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Estado módulo Inscripciones y Enlaces por Categoría
  const [regSupported, setRegSupported] = useState(false);
  const [regCanApprove, setRegCanApprove] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regLinks, setRegLinks] = useState<RegLinkRecord[]>([]);
  const [regRequests, setRegRequests] = useState<RegRequestRecord[]>([]);
  const [regTeams, setRegTeams] = useState<TeamOption[]>([]);
  const [regPaymentPlans, setRegPaymentPlans] = useState<RegPaymentPlanOption[]>([]);
  const [regDiscountRules, setRegDiscountRules] = useState<RegDiscountOption[]>([]);
  const [regStatusFilter, setRegStatusFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [regTeamFilter, setRegTeamFilter] = useState<string>('');
  const [regPage, setRegPage] = useState<number>(1);

  // Modales de resumen por equipo y nuevo enlace categoría
  const [teamSummaryModalOpen, setTeamSummaryModalOpen] = useState(false);
  const [newLinkModalOpen, setNewLinkModalOpen] = useState(false);

  // Crear nuevo enlace categoría
  const [newLinkCatCode, setNewLinkCatCode] = useState(CLUB_CATEGORIES_META[0]?.id || 'cat-cadete-fem-rojo');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkTeamId, setNewLinkTeamId] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);
  const [busyLinkId, setBusyLinkId] = useState<string | null>(null);

  // Modal Aceptar Inscripción y Asignar Equipos
  const [approveModalReq, setApproveModalReq] = useState<RegRequestRecord | null>(null);
  const [appFirstName, setAppFirstName] = useState<string>('');
  const [appLastName, setAppLastName] = useState<string>('');
  const [appShirtSize, setAppShirtSize] = useState<string>('');
  const [appTeamIds, setAppTeamIds] = useState<string[]>([]);
  const [appPrimaryTeamId, setAppPrimaryTeamId] = useState<string>('');
  const [appDorsal, setAppDorsal] = useState<string>('');
  const [appPosition, setAppPosition] = useState<string>('');
  const [appPlanId, setAppPlanId] = useState<string>('');
  const [appDiscountIds, setAppDiscountIds] = useState<string[]>([]);
  const [appNotes, setAppNotes] = useState<string>('');
  const [approvingBusy, setApprovingBusy] = useState(false);
  const [rejectModalReq, setRejectModalReq] = useState<RegRequestRecord | null>(null);
  const [rejectNotes, setRejectNotes] = useState<string>('');
  const [rejectingReqId, setRejectingReqId] = useState<string | null>(null);

  // Modal Confirmar Baja y Comprobador FAVB
  const [deactivateModalAth, setDeactivateModalAth] = useState<AthleteRecord | null>(null);
  const [deactivateReason, setDeactivateReason] = useState<string>('');
  const [deactivatingBusy, setDeactivatingBusy] = useState(false);
  const [favbModalOpen, setFavbModalOpen] = useState(false);
  const [favbLoading, setFavbLoading] = useState(false);
  const [favbReport, setFavbReport] = useState<FavbDiscrepancyReport | null>(null);
  const [favbBusyId, setFavbBusyId] = useState<string | null>(null);
  const regFetchingRef = useRef(false);
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [rgpdFilter, setRgpdFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal Ficha / Edición / Datos sensibles
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<AthleteRecord | null>(null);
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

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Referencia estable para evitar bucles en useEffect
  const isFetchingRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 5000);
  }, []);

  const loadCensus = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setErrorBanner(null);

    try {
      const res = await fetch('/api/intranet/census', { cache: 'no-store' });
      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        setAuthError(data?.error || 'Acceso no autorizado a este módulo.');
        setLoading(false);
        return;
      }

      if (!res.ok || !data?.success) {
        setErrorBanner(data?.error || 'Error cargando el módulo de Jugadoras/es.');
        setLoading(false);
        return;
      }

      setAuthError(null);
      setAthletes(Array.isArray(data.athletes) ? data.athletes : []);
      setTeamSummaries(Array.isArray(data.teamSummaries) ? data.teamSummaries : []);
      setTeams(Array.isArray(data.teams) ? data.teams : []);
      if (data.permissions) {
        setPermissions(data.permissions);
      }
    } catch {
      setErrorBanner('Error de red cargando el listado de jugadoras/es.');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCensus();
  }, [loadCensus]);

  useEffect(() => {
    if (initialTabParam === 'inscripciones') setActiveTab('inscripciones');
  }, [initialTabParam]);

  const loadRegistrations = useCallback(async () => {
    if (regFetchingRef.current) return;
    regFetchingRef.current = true;
    setRegLoading(true);
    try {
      const res = await fetch('/api/intranet/registration?mode=admin', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        setRegSupported(false);
        return;
      }
      const data = await res.json();
      if (res.ok && data?.success) {
        setRegSupported(true);
        setRegCanApprove(Boolean(data.canApprove));
        setRegLinks(Array.isArray(data.links) ? data.links : []);
        setRegRequests(Array.isArray(data.requests) ? data.requests : []);
        setRegTeams(Array.isArray(data.teams) ? data.teams : []);
        setRegPaymentPlans(Array.isArray(data.paymentPlans) ? data.paymentPlans : []);
        setRegDiscountRules(Array.isArray(data.discountRules) ? data.discountRules : []);
      }
    } catch {
      // No bloquear carga principal del censo
    } finally {
      regFetchingRef.current = false;
      setRegLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

  const pendingRegCount = useMemo(
    () => regRequests.filter((r) => r.status === 'PENDING').length,
    [regRequests]
  );

  const REG_PAGE_SIZE = 15;

  const visibleRegRequests = useMemo(() => {
    const selectedTeamMeta = (regTeams.length > 0 ? regTeams : teams).find(
      (t) => t.id === regTeamFilter
    );
    return regRequests.filter((r) => {
      if (regStatusFilter === 'PENDING' && r.status !== 'PENDING') return false;
      if (regTeamFilter) {
        const matchDefault = r.defaultTeamSeasonId === regTeamFilter;
        const matchAssigned = r.assignedTeamIds.includes(regTeamFilter);
        const matchAthleteTeams = r.athleteTeams.some((t) => t.teamSeasonId === regTeamFilter);
        const matchCategory =
          Boolean((selectedTeamMeta as { categoryId?: string } | undefined)?.categoryId) &&
          r.categoryCode === (selectedTeamMeta as { categoryId?: string }).categoryId;
        if (!matchDefault && !matchAssigned && !matchAthleteTeams && !matchCategory) {
          return false;
        }
      }
      return true;
    });
  }, [regRequests, regStatusFilter, regTeamFilter, regTeams, teams]);

  const regTotalPages = Math.max(1, Math.ceil(visibleRegRequests.length / REG_PAGE_SIZE));
  const currentRegPage = Math.min(regPage, regTotalPages);
  const paginatedRegRequests = useMemo(() => {
    const start = (currentRegPage - 1) * REG_PAGE_SIZE;
    return visibleRegRequests.slice(start, start + REG_PAGE_SIZE);
  }, [visibleRegRequests, currentRegPage]);

  useEffect(() => {
    setRegPage(1);
  }, [regStatusFilter, regTeamFilter]);

  const handleCreateRegLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const catMeta = CLUB_CATEGORIES_META.find((c) => c.id === newLinkCatCode);
    const label = newLinkLabel.trim() || catMeta?.name || newLinkCatCode;
    if (!label) return;
    setCreatingLink(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/intranet/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_link',
          categoryCode: newLinkCatCode,
          categoryLabel: label,
          defaultTeamSeasonId: newLinkTeamId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorBanner(json.error || 'No se pudo crear el enlace de categoría.');
        return;
      }
      setNewLinkLabel('');
      setNewLinkModalOpen(false);
      showToast(`Enlace creado para ${label}.`);
      await loadRegistrations();
    } catch {
      setErrorBanner('Error de red al crear el enlace.');
    } finally {
      setCreatingLink(false);
    }
  };

  const handleToggleRegLink = async (link: RegLinkRecord) => {
    setBusyLinkId(link.id);
    try {
      const res = await fetch('/api/intranet/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_link',
          linkId: link.id,
          isActive: !link.isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorBanner(json.error || 'No se pudo cambiar el estado del enlace.');
        return;
      }
      showToast(`Enlace ${!link.isActive ? 'activado' : 'pausado'}.`);
      await loadRegistrations();
    } catch {
      setErrorBanner('Error de red actualizando enlace.');
    } finally {
      setBusyLinkId(null);
    }
  };

  const handleRegenerateRegLink = async (link: RegLinkRecord) => {
    setBusyLinkId(link.id);
    try {
      const res = await fetch('/api/intranet/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate_link', linkId: link.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorBanner(json.error || 'No se pudo regenerar el enlace.');
        return;
      }
      showToast(`Token regenerado para ${link.categoryLabel}.`);
      await loadRegistrations();
    } catch {
      setErrorBanner('Error de red regenerando enlace.');
    } finally {
      setBusyLinkId(null);
    }
  };

  const openApproveModal = (reqItem: RegRequestRecord) => {
    setErrorBanner(null);
    const initialTeams =
      reqItem.defaultTeamSeasonId
        ? [reqItem.defaultTeamSeasonId]
        : reqItem.athleteTeams.length > 0
          ? reqItem.athleteTeams.map((t) => t.teamSeasonId)
          : [];
    setApproveModalReq(reqItem);
    setAppFirstName(reqItem.athleteFirstName || '');
    setAppLastName(reqItem.athleteLastName || '');
    setAppShirtSize(reqItem.shirtSize || '');
    setAppTeamIds(initialTeams);
    setAppPrimaryTeamId(initialTeams[0] || '');
    setAppDorsal(reqItem.jerseyNumber ? String(reqItem.jerseyNumber) : '');
    setAppPosition('');
    setAppPlanId(reqItem.selectedPricePlanId || regPaymentPlans[0]?.planId || '');
    setAppDiscountIds([]);
    setAppNotes('');
  };

  const toggleApproveTeam = (tid: string) => {
    setAppTeamIds((prev) => {
      const next = prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid];
      if (!next.includes(appPrimaryTeamId)) {
        setAppPrimaryTeamId(next[0] || '');
      }
      return next;
    });
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveModalReq) return;
    if (appTeamIds.length === 0) {
      setErrorBanner('Debes seleccionar al menos un equipo para activar al deportista.');
      return;
    }
    const chosenPlan = regPaymentPlans.find((p) => p.planId === appPlanId) || null;
    setApprovingBusy(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/intranet/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_registration',
          requestId: approveModalReq.id,
          firstName: appFirstName.trim() || undefined,
          lastName: appLastName.trim() || undefined,
          shirtSize: appShirtSize.trim() || undefined,
          teamSeasonIds: appTeamIds,
          primaryTeamId: appPrimaryTeamId || appTeamIds[0],
          dorsal: appDorsal ? Number(appDorsal) : undefined,
          position: appPosition.trim() || undefined,
          productId: chosenPlan?.productId || approveModalReq.selectedProductId || undefined,
          pricePlanId: chosenPlan?.planId || approveModalReq.selectedPricePlanId || undefined,
          discountRuleIds: appDiscountIds.length > 0 ? appDiscountIds : undefined,
          adminNotes: appNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorBanner(json.error || 'No se pudo aprobar la inscripción.');
        return;
      }
      const approvedDisplay = `${appFirstName.trim()} ${appLastName.trim()}`.trim() || approveModalReq.athleteFullName;
      showToast(
        `Inscripción de ${approvedDisplay} aceptada y equipo/cuota actualizados${json.emailSent ? ' (aviso enviado por email)' : ''}.`
      );
      setApproveModalReq(null);
      window.dispatchEvent(new Event('cdv-refresh-me'));
      await Promise.all([loadRegistrations(), loadCensus()]);
    } catch {
      setErrorBanner('Error de red al aprobar la solicitud.');
    } finally {
      setApprovingBusy(false);
    }
  };

  const openRejectModal = (reqItem: RegRequestRecord) => {
    setErrorBanner(null);
    setRejectModalReq(reqItem);
    setRejectNotes('');
  };

  const handleRejectRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalReq) return;
    const cleanReason = rejectNotes.trim();
    if (cleanReason.length < 5) {
      setErrorBanner('Debes indicar el motivo del rechazo (mínimo 5 caracteres) para enviarlo al solicitante.');
      return;
    }
    const reqItem = rejectModalReq;
    setRejectingReqId(reqItem.id);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/intranet/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_registration',
          requestId: reqItem.id,
          adminNotes: cleanReason,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorBanner(json.error || 'No se pudo rechazar la solicitud.');
        return;
      }
      showToast(
        `Solicitud de ${reqItem.athleteFullName} rechazada${json.emailSent ? ' (correo con motivo enviado al solicitante)' : ''}.`
      );
      setRejectModalReq(null);
      setRejectNotes('');
      window.dispatchEvent(new Event('cdv-refresh-me'));
      await loadRegistrations();
    } catch {
      setErrorBanner('Error de red rechazando solicitud.');
    } finally {
      setRejectingReqId(null);
    }
  };

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

  const toggleSort = useCallback((field: SortField) => {
    setSortField((prevField) => {
      if (prevField === field) {
        setSortDir((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prevField;
      }
      setSortDir(field === 'age' ? 'desc' : 'asc');
      return field;
    });
  }, []);

  const sortedAthletes = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const paymentRank: Record<TrafficLight, number> = {
      RED: 1,
      YELLOW: 2,
      GREEN: 3,
      NONE: 4,
    };
    const currentYear = new Date().getUTCFullYear();
    const getPrimaryTeamName = (a: AthleteRecord) =>
      a.teams.find((t) => t.isPrimary)?.teamName || a.teams[0]?.teamName || '';
    const getBirthYear = (a: AthleteRecord) =>
      a.birthYear ?? (a.approxAge !== null ? currentYear - a.approxAge : null);

    return [...filteredAthletes].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'athlete':
          cmp = a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' });
          break;
        case 'team': {
          const tA = getPrimaryTeamName(a);
          const tB = getPrimaryTeamName(b);
          if (!tA && tB) return 1;
          if (tA && !tB) return -1;
          cmp = tA.localeCompare(tB, 'es', { sensitivity: 'base' });
          break;
        }
        case 'age': {
          const yA = getBirthYear(a);
          const yB = getBirthYear(b);
          if (yA === null && yB !== null) return 1;
          if (yA !== null && yB === null) return -1;
          cmp = (yA ?? 0) - (yB ?? 0);
          break;
        }
        case 'status': {
          const sA = STATUS_BADGE[a.status]?.label || a.status;
          const sB = STATUS_BADGE[b.status]?.label || b.status;
          cmp = sA.localeCompare(sB, 'es', { sensitivity: 'base' });
          break;
        }
        case 'rgpd': {
          const rA = RGPD_BADGE[a.rgpdStatus]?.label || a.rgpdStatus;
          const rB = RGPD_BADGE[b.rgpdStatus]?.label || b.rgpdStatus;
          cmp = rA.localeCompare(rB, 'es', { sensitivity: 'base' });
          break;
        }
        case 'payment': {
          const pA = paymentRank[a.paymentTrafficLight || 'NONE'] ?? 4;
          const pB = paymentRank[b.paymentTrafficLight || 'NONE'] ?? 4;
          cmp = pA - pB;
          break;
        }
      }
      if (cmp !== 0) return cmp * dir;
      return a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' });
    });
  }, [filteredAthletes, sortField, sortDir]);

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

  // Comprobador no destructivo de discrepancias frente a actas FAVB
  const handleCheckFavbDiscrepancies = async () => {
    setFavbModalOpen(true);
    setFavbLoading(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/intranet/census', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_federation_discrepancies' }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setErrorBanner(data?.error || 'No se pudo comprobar las discrepancias con FAVB.');
        return;
      }
      setFavbReport(data.report as FavbDiscrepancyReport);
    } catch {
      setErrorBanner('Error de red comprobando discrepancias con Federación.');
    } finally {
      setFavbLoading(false);
    }
  };

  const handleResolveFavbDiscrepancy = async (item: FavbMismatchReportItem) => {
    setFavbBusyId(item.athleteId);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/intranet/census', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_federation_discrepancy',
          athleteId: item.athleteId,
          addTeamIds: item.missingTeamIds.length > 0 ? item.missingTeamIds : undefined,
          applyDorsal: item.dorsalDiff ? item.dorsalDiff.favbDorsal : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setErrorBanner(data?.error || 'No se pudo subsanar la discrepancia.');
        return;
      }
      showToast(`Discrepancia de ${item.clubFullName} subsanada.`);
      await Promise.all([loadCensus(), handleCheckFavbDiscrepancies()]);
    } catch {
      setErrorBanner('Error de red al subsanar discrepancia.');
    } finally {
      setFavbBusyId(null);
    }
  };

  const openNewAthleteFromFavb = (missing: FavbMissingReportItem) => {
    setFavbModalOpen(false);
    openAthleteModal(null);
    setFFirstName(missing.firstName);
    setFLastName(missing.lastName);
    setFPrimaryTeam(missing.teamId);
    if (missing.birthYear) setFBirthYear(String(missing.birthYear));
    if (missing.dorsal) setFJerseyNumber(String(missing.dorsal));
    setFStatus('VERIFICADO');
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

    const rows = sortedAthletes.map((a) => {
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
    showToast(`Exportadas ${sortedAthletes.length} fichas a CSV.`);
  };

  // Abrir modal ficha (crear o editar/ver cargando automáticamente los campos completos para el staff)
  const openAthleteModal = (ath: AthleteRecord | null) => {
    setEditingAthlete(ath);
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
      setFStatus('VERIFICADO');
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

    if (ath && permissions.canViewSensitive && ath.status !== 'SHREDDED') {
      void handleRevealSensitive(ath.id);
    }
  };

  const handleRevealSensitive = async (athleteId: string) => {
    setLoadingSensitive(true);
    try {
      const res = await fetch('/api/intranet/census', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view_sensitive', athleteId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        return;
      }
      const s = data.sensitive as SensitivePayload;
      if (s.dni) setFDni(s.dni);
      if (s.birthDate) setFBirthDate(s.birthDate);
      if (s.medicalAllergies) setFAllergies(s.medicalAllergies);
      if (s.guardianDni) setFGuardianDni(s.guardianDni);
    } catch {
      // Silencioso para no bloquear visualización base de ficha
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

  const openDeactivateModal = (ath: AthleteRecord) => {
    setErrorBanner(null);
    setDeactivateModalAth(ath);
    setDeactivateReason('');
  };

  const handleConfirmDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deactivateModalAth) return;
    setDeactivatingBusy(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/intranet/census', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deactivate_athlete',
          athleteId: deactivateModalAth.id,
          reason: deactivateReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setErrorBanner(data?.error || 'No se pudo dar de baja.');
        return;
      }
      showToast(`${deactivateModalAth.fullName} marcado como BAJA.`);
      setDeactivateModalAth(null);
      setDeactivateReason('');
      await loadCensus();
    } catch {
      setErrorBanner('Error de red al dar de baja.');
    } finally {
      setDeactivatingBusy(false);
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
        <div className="mx-auto max-w-xl rounded-none border border-rose-500/30 bg-surface-container p-8 text-center">
          <Lock className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="font-headline text-2xl font-bold text-white">Acceso restringido</h1>
          <p className="mt-2 text-sm text-on-surface/90">{authError}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/acceso"
              className="rounded-none bg-primary-container px-5 py- active:translate-x-[1px] active:translate-y-[1px]2.5 text-sm font-bold text-white transition hover:bg-cta-hover"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/club"
              className="rounded-none border border-white/15 bg-surface-container-high px-5 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-white/10"
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
        <header className="mb-6 flex flex-col gap-4 rounded-none border border-white/10 bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 shadow-brutal-dark">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-tertiary">
              <Link
                href="/club"
                className="inline-flex items-center gap-1.5 font-medium text-on-surface/90 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Panel Club
              </Link>
              <span>/</span>
              <span className="font-semibold text-primary">Jugadoras/es</span>
              <span className="rounded-none border border-white/10 bg-surface-container-high px-2.5 py-0.5 text-[11px] font-semibold text-on-surface/90">
                Temporada 2026/2027
              </span>
            </div>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Jugadoras/es
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(permissions.canImport || permissions.canEdit) && (
              <button
                type="button"
                onClick={handleCheckFavbDiscrepancies}
                disabled={favbLoading}
                title="Comprobar discrepancias con Federación (FAVB)"
                aria-label="Comprobar discrepancias con Federación (FAVB)"
                className="inline-flex h-10 items-center gap-1.5 rounded-none border border-amber-500/35 bg-amber-500/10 px-3 text-xs font-bold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
              >
                {favbLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Comprobar FAVB</span>
              </button>
            )}

            {permissions.canEdit && (
              <button
                type="button"
                onClick={() => openAthleteModal(null)}
                title="Nuevo Deportista"
                aria-label="Nuevo Deportista"
                className="inline-flex h-10 w-10 items-center justify-center rounded-none bg-primary-container text-white shadow-glow-crimson transition hover:bg-cta-hover"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={sortedAthletes.length === 0}
              title="Exportar CSV"
              aria-label="Exportar CSV"
              className="inline-flex h-10 w-10 items-center justify-center rounded-none border border-white/15 bg-surface-container-high text-on-surface transition hover:bg-white/10 disabled:opacity-40"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Alertas y Toast */}
        {errorBanner && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-none border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
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
          <div className="mb-4 flex items-center gap-2 rounded-none border border-emerald-500/40 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* KPIs rápidos */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-none border border-white/10 bg-surface-container p-4 shadow-brutal-dark">
            <div className="text-xs font-medium text-tertiary">Deportistas activos</div>
            <div className="mt-1 font-headline text-2xl font-bold text-white">
              {globalStats.totalActive}
            </div>
          </div>
          <div className="rounded-none border border-white/10 bg-surface-container p-4 shadow-brutal-dark">
            <div className="text-xs font-medium text-tertiary">Fichas verificadas</div>
            <div className="mt-1 font-headline text-2xl font-bold text-emerald-400">
              {globalStats.verified}
              <span className="ml-1.5 text-xs font-normal text-tertiary">
                / {globalStats.totalActive}
              </span>
            </div>
          </div>
          <div className="rounded-none border border-white/10 bg-surface-container p-4 shadow-brutal-dark">
            <div className="text-xs font-medium text-tertiary">RGPD Firmado</div>
            <div className="mt-1 font-headline text-2xl font-bold text-sky-400">
              {globalStats.rgpdActive}
              <span className="ml-1.5 text-xs font-normal text-tertiary">
                / {globalStats.totalActive}
              </span>
            </div>
          </div>
          <div className="rounded-none border border-white/10 bg-surface-container p-4 shadow-brutal-dark">
            <div className="text-xs font-medium text-tertiary">Pendientes de cuenta</div>
            <div className="mt-1 font-headline text-2xl font-bold text-amber-400">
              {globalStats.withoutAccount}
            </div>
          </div>
        </section>

        {/* Pestañas principales */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('plantilla')}
              className={`inline-flex items-center gap-2 rounded-none px-4 py-2 text-sm font-bold transition ${
                activeTab === 'plantilla'
                  ? 'bg-primary-container text-white'
                  : 'bg-surface-container text-on-surface/90 hover:bg-white/10'
              }`}
            >
              <Users className="h-4 w-4" />
              Plantilla
              <span className="rounded-none bg-black/30 px-2 py-0.5 text-xs">
                {sortedAthletes.length}
              </span>
            </button>

            {regSupported && (
              <button
                type="button"
                onClick={() => setActiveTab('inscripciones')}
                className={`inline-flex items-center gap-2 rounded-none px-4 py-2 text-sm font-bold transition ${
                  activeTab === 'inscripciones'
                    ? 'bg-primary-container text-white'
                    : 'bg-surface-container text-on-surface/90 hover:bg-white/10'
                }`}
              >
                <Link2 className="h-4 w-4" />
                Inscripciones y Enlaces
                <span
                  className={`rounded-none px-2 py-0.5 text-xs ${
                    pendingRegCount > 0
                      ? 'bg-amber-400 text-black'
                      : 'bg-black/30 text-on-surface/90'
                  }`}
                >
                  {pendingRegCount}
                </span>
              </button>
            )}
          </div>

          {activeTab === 'plantilla' && (
            <div className="flex flex-wrap items-center gap-2">
              {teamSummaries.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTeamSummaryModalOpen(true)}
                  className={`inline-flex items-center gap-2 rounded-none border px-3.5 py-2 text-xs font-bold transition sm:text-sm ${
                    teamFilter
                      ? 'border-primary bg-primary-container/15 text-primary'
                      : 'border-white/15 bg-surface-container text-on-surface hover:bg-white/10'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Resumen por equipo
                  <span className="rounded-none bg-black/30 px-2 py-0.5 text-[11px] text-on-surface">
                    {teamSummaries.length}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* TAB 1: PLANTILLA */}
        {activeTab === 'plantilla' && (
          <>
            {/* Barra de filtros */}
            <section className="mb-5 grid grid-cols-1 gap-3 rounded-none border border-white/10 bg-surface-container p-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Buscar por nombre, tutor, DNI o licencia"
                  placeholder="Buscar por nombre, tutor, DNI (últ. 5) o licencia..."
                  className="w-full rounded-none border border-white/10 bg-surface-container-lowest py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-tertiary/75 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary" />
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  aria-label="Filtrar por equipo"
                  className="w-full appearance-none rounded-none border border-white/10 bg-surface-container-lowest py-2.5 pl-9 pr-3 text-sm text-white focus:border-primary focus:outline-none"
                >
                  <option value="">Todos los equipos</option>
                  {groupByCategoryFamily(teams, (t) => `${t.id} ${t.name}`).map(
                    ({ family, items: familyTeams }) => (
                      <optgroup key={family.code} label={family.label}>
                        {familyTeams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {getShortTeamLabelInFamily(t.name, family.code)}
                          </option>
                        ))}
                      </optgroup>
                    )
                  )}
                </select>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filtrar por estado de ficha"
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
              >
                <option value="">Todos los estados</option>
                <option value="VERIFICADO">Verificado</option>
                <option value="IMPORTADO">Sin registrar</option>
                <option value="PENDIENTE_VALIDAR">Pendiente validar</option>
                <option value="BAJA">Baja</option>
              </select>

              <select
                value={rgpdFilter}
                onChange={(e) => setRgpdFilter(e.target.value)}
                aria-label="Filtrar por estado RGPD"
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
              >
                <option value="">Todo RGPD</option>
                <option value="ACTIVE">Firmado</option>
                <option value="PENDING">No firmado</option>
                <option value="REVOKED">Revocado</option>
              </select>
            </section>

            {/* Estado de carga / vacío */}
            {loading ? (
              <div className="flex flex-col items-center justify-center rounded-none border border-white/10 bg-surface-container py-16 text-tertiary">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Cargando plantilla del club...</p>
              </div>
            ) : sortedAthletes.length === 0 ? (
              <div className="rounded-none border border-white/10 bg-surface-container p-8 text-center shadow-brutal-dark">
                <Users className="mx-auto mb-2.5 h-8 w-8 text-tertiary" aria-hidden="true" />
                <h2 className="text-sm font-bold text-white">Sin deportistas en esta vista</h2>
              </div>
            ) : (
              <>
                <h2 className="sr-only">Listado de deportistas de la plantilla</h2>
                {/* Vista Desktop: Tabla */}
                <div className="hidden overflow-hidden rounded-none border border-white/10 bg-surface-container shadow-brutal-dark md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 bg-surface-container-lowest text-xs uppercase tracking-wider text-tertiary">
                          <th
                            className="px-4 py-3.5 font-bold"
                            aria-sort={
                              sortField === 'athlete'
                                ? sortDir === 'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                          >
                            <button
                              type="button"
                              onClick={() => toggleSort('athlete')}
                              className="inline-flex cursor-pointer items-center gap-1.5 font-bold uppercase tracking-wider text-on-surface/90 transition hover:text-white"
                            >
                              <span>Deportista</span>
                              {sortField === 'athlete' ? (
                                sortDir === 'asc' ? (
                                  <ArrowUp className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <ArrowDown className="h-3.5 w-3.5 text-primary" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 text-tertiary" />
                              )}
                            </button>
                          </th>
                          <th
                            className="px-4 py-3.5 font-bold"
                            aria-sort={
                              sortField === 'team'
                                ? sortDir === 'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                          >
                            <button
                              type="button"
                              onClick={() => toggleSort('team')}
                              className="inline-flex cursor-pointer items-center gap-1.5 font-bold uppercase tracking-wider text-on-surface/90 transition hover:text-white"
                            >
                              <span>Equipo</span>
                              {sortField === 'team' ? (
                                sortDir === 'asc' ? (
                                  <ArrowUp className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <ArrowDown className="h-3.5 w-3.5 text-primary" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 text-tertiary" />
                              )}
                            </button>
                          </th>
                          <th
                            className="px-4 py-3.5 font-bold"
                            aria-sort={
                              sortField === 'age'
                                ? sortDir === 'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                          >
                            <button
                              type="button"
                              onClick={() => toggleSort('age')}
                              className="inline-flex cursor-pointer items-center gap-1.5 font-bold uppercase tracking-wider text-on-surface/90 transition hover:text-white"
                            >
                              <span>Año / Edad</span>
                              {sortField === 'age' ? (
                                sortDir === 'asc' ? (
                                  <ArrowUp className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <ArrowDown className="h-3.5 w-3.5 text-primary" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 text-tertiary" />
                              )}
                            </button>
                          </th>
                          <th
                            className="px-4 py-3.5 font-bold"
                            aria-sort={
                              sortField === 'status'
                                ? sortDir === 'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                          >
                            <button
                              type="button"
                              onClick={() => toggleSort('status')}
                              className="inline-flex cursor-pointer items-center gap-1.5 font-bold uppercase tracking-wider text-on-surface/90 transition hover:text-white"
                            >
                              <span>Estado ficha</span>
                              {sortField === 'status' ? (
                                sortDir === 'asc' ? (
                                  <ArrowUp className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <ArrowDown className="h-3.5 w-3.5 text-primary" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 text-tertiary" />
                              )}
                            </button>
                          </th>
                          {permissions.canViewTrafficLight && (
                            <th
                              className="px-4 py-3.5 font-bold"
                              aria-sort={
                                sortField === 'payment'
                                  ? sortDir === 'asc'
                                    ? 'ascending'
                                    : 'descending'
                                  : 'none'
                              }
                            >
                              <button
                                type="button"
                                onClick={() => toggleSort('payment')}
                                className="inline-flex cursor-pointer items-center gap-1.5 font-bold uppercase tracking-wider text-on-surface/90 transition hover:text-white"
                              >
                                <span>Cuota</span>
                                {sortField === 'payment' ? (
                                  sortDir === 'asc' ? (
                                    <ArrowUp className="h-3.5 w-3.5 text-primary" />
                                  ) : (
                                    <ArrowDown className="h-3.5 w-3.5 text-primary" />
                                  )
                                ) : (
                                  <ArrowUpDown className="h-3.5 w-3.5 text-tertiary" />
                                )}
                              </button>
                            </th>
                          )}
                          <th
                            className="px-4 py-3.5 font-bold"
                            aria-sort={
                              sortField === 'rgpd'
                                ? sortDir === 'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                          >
                            <button
                              type="button"
                              onClick={() => toggleSort('rgpd')}
                              className="inline-flex cursor-pointer items-center gap-1.5 font-bold uppercase tracking-wider text-on-surface/90 transition hover:text-white"
                            >
                              <span>RGPD</span>
                              {sortField === 'rgpd' ? (
                                sortDir === 'asc' ? (
                                  <ArrowUp className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <ArrowDown className="h-3.5 w-3.5 text-primary" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 text-tertiary" />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-3.5 font-bold">Tutor / Contacto</th>
                          <th className="px-4 py-3.5 text-right font-bold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {sortedAthletes.map((ath) => {
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
                                    <span className="rounded-none bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                                      DEMO
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-tertiary">
                                  {ath.dniLast5 && <span>DNI ***{ath.dniLast5}</span>}
                                  {ath.jerseyNumber !== null && <span>#{ath.jerseyNumber}</span>}
                                  {ath.shirtSize && <span>Talla {ath.shirtSize}</span>}
                                </div>
                              </td>

                              <td className="px-4 py-3.5 align-top">
                                <div className="flex flex-wrap gap-1">
                                  {ath.teams.length === 0 ? (
                                    <span className="text-xs text-tertiary">Sin equipo</span>
                                  ) : (
                                    ath.teams.map((t) => {
                                      const tTheme = getTeamColorTheme(t.teamName);
                                      return (
                                        <span
                                          key={t.teamSeasonId}
                                          className={`inline-block rounded-none px-2 py-0.5 text-xs font-medium ${
                                            t.isPrimary
                                              ? `border border-white/15 bg-surface-container-highest ${tTheme.textClass}`
                                              : `border border-white/10 bg-white/5 ${
                                                  tTheme.colorKey ? tTheme.textClass : 'text-on-surface/90'
                                                }`
                                          }`}
                                        >
                                          {t.teamName}
                                        </span>
                                      );
                                    })
                                  )}
                                </div>
                              </td>

                              <td className="px-4 py-3.5 align-top whitespace-nowrap">
                                {ath.birthYear || ath.approxAge !== null || ath.ageBracket ? (
                                  <div className="space-y-0.5">
                                    <div className="text-xs font-semibold text-on-surface">
                                      {ath.birthYear ? ath.birthYear : '—'}
                                      {ath.approxAge !== null ? ` (${ath.approxAge}a)` : ''}
                                    </div>
                                    {ath.ageBracket && (
                                      <span className="inline-block rounded-none bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-tertiary">
                                        {ath.ageBracket}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-tertiary">—</span>
                                )}
                              </td>

                              <td className="px-4 py-3.5 align-top">
                                <span
                                  className={`inline-flex items-center rounded-none border px-2.5 py-0.5 text-xs font-semibold ${stMeta.cls}`}
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
                                    <span className="text-xs text-tertiary">—</span>
                                  )}
                                </td>
                              )}

                              <td className="px-4 py-3.5 align-top">
                                <span
                                  className={`inline-flex items-center rounded-none border px-2.5 py-0.5 text-xs font-semibold ${rgpdMeta.cls}`}
                                >
                                  {rgpdMeta.label}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 align-top">
                                {ath.guardianName ? (
                                  <div>
                                    <div className="font-medium text-on-surface">{ath.guardianName}</div>
                                    {permissions.canViewEmergency && (
                                      <div className="mt-0.5 text-xs text-tertiary">
                                        {ath.guardianPhone && <div>{ath.guardianPhone}</div>}
                                        {ath.guardianEmail && (
                                          <div className="truncate max-w-[200px]">
                                            {ath.guardianEmail}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {(ath.hasGuardianAccount || ath.hasAthleteAccount) && (
                                      <span className="mt-1 inline-block rounded-none bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                        Cuenta activa
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-tertiary">Sin tutor vinculado</span>
                                )}
                              </td>

                              <td className="px-4 py-3.5 text-right align-top">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openAthleteModal(ath)}
                                    title={ath.canEditRow ? 'Ver / Editar ficha' : 'Ver ficha'}
                                    className="rounded-none border border-white/10 bg-surface-container-high p-2 text-on-surface transition hover:border-white/30 hover:text-white"
                                  >
                                    {ath.canEditRow ? (
                                      <Edit2 className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>

                                  {permissions.canDeactivate &&
                                    ath.status !== 'BAJA' &&
                                    ath.status !== 'SHREDDED' && (
                                      <button
                                        type="button"
                                        onClick={() => openDeactivateModal(ath)}
                                        title="Dar de baja"
                                        className="rounded-none border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300 transition hover:bg-rose-500/20"
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
                  <div className="flex items-center justify-between gap-2 rounded-none border border-white/10 bg-surface-container px-3 py-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary">
                      Ordenar
                    </span>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={sortField}
                        onChange={(e) => setSortField(e.target.value as SortField)}
                        aria-label="Ordenar plantilla por"
                        className="rounded-none border border-white/10 bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        <option value="athlete">Deportista</option>
                        <option value="team">Equipo</option>
                        <option value="age">Año / Edad</option>
                        <option value="status">Estado ficha</option>
                        <option value="rgpd">RGPD</option>
                        {permissions.canViewTrafficLight && <option value="payment">Cuota</option>}
                      </select>
                      <button
                        type="button"
                        onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                        aria-label="Invertir orden"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-none border border-white/10 bg-surface-container-high text-on-surface"
                      >
                        {sortDir === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-primary" />
                        )}
                      </button>
                    </div>
                  </div>

                  {sortedAthletes.map((ath) => {
                    const stMeta = STATUS_BADGE[ath.status] || STATUS_BADGE.IMPORTADO;
                    const rgpdMeta = RGPD_BADGE[ath.rgpdStatus] || RGPD_BADGE.PENDING;
                    const lightMeta = ath.paymentTrafficLight
                      ? TRAFFIC_LIGHT_META[ath.paymentTrafficLight]
                      : null;

                    return (
                      <article
                        key={ath.id}
                        className="rounded-none border border-white/10 bg-surface-container p-4 shadow-brutal-dark"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate font-headline text-base font-bold text-white">
                              {ath.fullName}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-tertiary">
                              {ath.birthYear && (
                                <span className="rounded-none bg-white/5 px-1.5 py-0.5 text-on-surface">
                                  {ath.birthYear}
                                  {ath.approxAge !== null ? ` (${ath.approxAge}a)` : ''}
                                </span>
                              )}
                              {ath.ageBracket && (
                                <span className="rounded-none bg-white/5 px-1.5 py-0.5 text-on-surface/90">
                                  {ath.ageBracket}
                                </span>
                              )}
                              {ath.dniLast5 && <span>***{ath.dniLast5}</span>}
                              {ath.jerseyNumber !== null && <span>#{ath.jerseyNumber}</span>}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-none border px-2 py-0.5 text-[11px] font-semibold ${stMeta.cls}`}
                          >
                            {stMeta.label}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {ath.teams.map((t) => (
                            <span
                              key={t.teamSeasonId}
                              className={`rounded-none px-2 py-0.5 text-[11px] font-medium ${
                                t.isPrimary
                                  ? 'border border-primary/30 bg-primary-container/15 text-primary'
                                  : 'border border-white/10 bg-white/5 text-on-surface/90'
                              }`}
                            >
                              {t.teamName}
                            </span>
                          ))}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-none bg-surface-container-lowest p-2.5 text-xs">
                          <div>
                            <div className="text-[10px] uppercase text-tertiary">RGPD</div>
                            <div className="mt-0.5 font-semibold text-on-surface">
                              {rgpdMeta.label}
                            </div>
                          </div>
                          {permissions.canViewTrafficLight && (
                            <div>
                              <div className="text-[10px] uppercase text-tertiary">Cuotas</div>
                              <div
                                className={`mt-0.5 font-semibold ${
                                  lightMeta ? lightMeta.cls : 'text-tertiary'
                                }`}
                              >
                                {lightMeta ? `${lightMeta.dot} ${lightMeta.label}` : '—'}
                              </div>
                            </div>
                          )}
                          <div className="col-span-2">
                            <div className="text-[10px] uppercase text-tertiary">Tutor</div>
                            <div className="mt-0.5 truncate text-on-surface">
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
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-none border border-white/15 bg-surface-container-high px-3 py-2 text-xs font-bold text-white"
                          >
                            {ath.canEditRow ? (
                              <Edit2 className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                            {ath.canEditRow ? 'Editar' : 'Ficha'}
                          </button>

                          {permissions.canDeactivate &&
                            ath.status !== 'BAJA' &&
                            ath.status !== 'SHREDDED' && (
                              <button
                                type="button"
                                onClick={() => openDeactivateModal(ath)}
                                aria-label="Dar de baja"
                                className="inline-flex items-center justify-center rounded-none border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300"
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

        {/* TAB 2: INSCRIPCIONES Y GENERADOR DE ENLACES POR CATEGORÍA */}
        {activeTab === 'inscripciones' && regSupported && (
          <section className="space-y-6">
            {/* Sub-sección 1: Bandeja de Solicitudes Recibidas */}
            <div className="rounded-none border border-white/10 bg-surface-container p-5">
              <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-headline text-lg font-bold text-white flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-amber-400 shrink-0" />
                  Solicitudes de Alta ({pendingRegCount} pendientes)
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={regTeamFilter}
                    onChange={(e) => setRegTeamFilter(e.target.value)}
                    aria-label="Filtrar solicitudes por equipo"
                    className="rounded-none border border-white/15 bg-surface-container-lowest px-3 py-1.5 text-xs text-white focus:border-primary focus:outline-none"
                  >
                    <option value="">Todos los equipos</option>
                    {groupByCategoryFamily(
                      regTeams.length > 0 ? regTeams : teams,
                      (t) => `${t.id} ${t.name}`
                    ).map(({ family, items: familyTeams }) => (
                      <optgroup key={family.code} label={family.label}>
                        {familyTeams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {getShortTeamLabelInFamily(t.name, family.code)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setRegStatusFilter('PENDING')}
                    className={`rounded-none px-3 py-1.5 text-xs font-bold transition ${
                      regStatusFilter === 'PENDING'
                        ? 'bg-amber-400 text-black'
                        : 'bg-surface-container-high text-on-surface/90 hover:bg-white/10'
                    }`}
                  >
                    Pendientes ({pendingRegCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegStatusFilter('ALL')}
                    className={`rounded-none px-3 py-1.5 text-xs font-bold transition ${
                      regStatusFilter === 'ALL'
                        ? 'bg-primary-container text-white'
                        : 'bg-surface-container-high text-on-surface/90 hover:bg-white/10'
                    }`}
                  >
                    Todas ({regRequests.length})
                  </button>
                </div>
              </div>

              {regLoading ? (
                <div className="py-10 text-center text-sm text-tertiary">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
                  Cargando solicitudes...
                </div>
              ) : visibleRegRequests.length === 0 ? (
                <div className="rounded-none border border-white/10 bg-surface-container-lowest p-6 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-400" />
                  <p className="text-sm font-semibold text-white">No hay solicitudes en este filtro</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedRegRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`rounded-none border p-4 ${
                        req.status === 'PENDING'
                          ? 'border-amber-500/40 bg-amber-950/15'
                          : req.status === 'APPROVED'
                            ? 'border-emerald-500/30 bg-emerald-950/10'
                            : 'border-rose-500/30 bg-rose-950/10'
                      }`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-none px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                                req.status === 'PENDING'
                                  ? 'bg-amber-400 text-black'
                                  : req.status === 'APPROVED'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {req.status === 'PENDING'
                                ? 'Pendiente validar'
                                : req.status === 'APPROVED'
                                  ? 'Aprobada'
                                  : 'Rechazada'}
                            </span>
                            <span className="rounded-none bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-on-surface">
                              {req.categoryLabel}
                            </span>
                            {req.isMinor ? (
                              <span className="rounded-none bg-sky-500/20 border border-sky-500/30 px-2 py-0.5 text-[11px] font-semibold text-sky-200">
                                Menor (&lt;18) · Tutor: {req.guardianName}
                              </span>
                            ) : (
                              <span className="rounded-none bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-[11px] font-semibold text-purple-200">
                                Adulto (+18)
                              </span>
                            )}
                            {!req.athleteId.startsWith('reg-') ? (
                              <span className="rounded-none bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                                Ficha existente unificada
                              </span>
                            ) : (
                              <span className="rounded-none bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[11px] font-semibold text-sky-300">
                                Nueva ficha
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-white">
                            {req.athleteFullName}{' '}
                            {req.birthYear ? (
                              <span className="text-xs font-normal text-tertiary">
                                ({req.birthYear})
                              </span>
                            ) : null}
                          </h3>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface/90">
                            <span>Email acceso: <strong className="text-white">{req.contactEmail}</strong></span>
                            {req.contactPhone && <span>Tel: {req.contactPhone}</span>}
                            {req.selectedPlanName && (
                              <span className="text-emerald-300">
                                {req.status === 'APPROVED' ? 'Cuota asignada: ' : 'Cuota elegida: '}
                                <strong>{req.selectedPlanName}</strong>
                                {req.selectedPlanAmount !== null ? ` (${req.selectedPlanAmount} €)` : ''}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span
                              className={`rounded-none border px-2 py-0.5 text-[11px] font-bold ${
                                req.consentStatus === 'Revocado'
                                  ? 'border-rose-500/40 bg-rose-500/20 text-rose-200'
                                  : req.isConsentSigned || req.consentStatus === 'Firmado'
                                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                    : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                              }`}
                            >
                              RGPD:{' '}
                              {req.consentStatus === 'Revocado'
                                ? 'Revocado'
                                : req.isConsentSigned || req.consentStatus === 'Firmado'
                                  ? 'Firmado'
                                  : 'No firmado'}
                            </span>
                            <span
                              className={`rounded-none border px-2 py-0.5 text-[11px] font-semibold ${
                                req.consentImage
                                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                  : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                              }`}
                            >
                              Imágenes: {req.consentImage ? 'Sí autorizo' : 'No autorizo'}
                            </span>
                            <span
                              className={`rounded-none border px-2 py-0.5 text-[11px] font-semibold ${
                                req.consentTravel
                                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                  : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                              }`}
                            >
                              Viajes: {req.consentTravel ? 'Sí autorizo' : 'No autorizo'}
                            </span>
                          </div>

                          {req.status === 'REJECTED' && req.adminNotes && (
                            <p className="text-[11px] text-rose-300/90">
                              Motivo rechazo: {req.adminNotes}
                            </p>
                          )}

                          {req.athleteTeams.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {req.athleteTeams.map((t) => (
                                <span
                                  key={t.teamSeasonId}
                                  className="rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200"
                                >
                                  {t.teamName}{t.isPrimary ? ' (Principal)' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {req.status === 'PENDING' && regCanApprove && (
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => openApproveModal(req)}
                              className="inline-flex items-center gap-1.5 rounded-none bg-emerald-600 hover:bg-emerald-500 active:translate-x-[1px] active:translate-y-[1px] px-4 py-2 text-xs font-bold text-white transition"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Aceptar y Asignar Equipo
                            </button>
                            <button
                              type="button"
                              disabled={rejectingReqId === req.id}
                              onClick={() => openRejectModal(req)}
                              className="inline-flex items-center gap-1.5 rounded-none border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 px-3 py-2 text-xs font-bold text-rose-200 transition disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {visibleRegRequests.length > REG_PAGE_SIZE && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-on-surface/90">
                      <span>
                        Mostrando {(currentRegPage - 1) * REG_PAGE_SIZE + 1}–
                        {Math.min(currentRegPage * REG_PAGE_SIZE, visibleRegRequests.length)} de{' '}
                        <strong>{visibleRegRequests.length}</strong> solicitudes
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={currentRegPage <= 1}
                          onClick={() => setRegPage((p) => Math.max(1, p - 1))}
                          className="inline-flex items-center gap-1 rounded-none border border-white/15 bg-surface-container-high px-3 py-1.5 font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Anterior
                        </button>
                        <span className="font-mono text-tertiary">
                          Página {currentRegPage} / {regTotalPages}
                        </span>
                        <button
                          type="button"
                          disabled={currentRegPage >= regTotalPages}
                          onClick={() => setRegPage((p) => Math.min(regTotalPages, p + 1))}
                          className="inline-flex items-center gap-1 rounded-none border border-white/15 bg-surface-container-high px-3 py-1.5 font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
                        >
                          Siguiente
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sub-sección 2: Enlaces por Categoría para WhatsApp */}
            <div className="rounded-none border border-white/10 bg-surface-container p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <h2 className="font-headline text-lg font-bold text-white flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary shrink-0" />
                  Enlaces por Equipo / Categoría (WhatsApp)
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setErrorBanner(null);
                    setNewLinkModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-none bg-primary-container hover:bg-cta-hover px-3.5 py- active:translate-x-[1px] active:translate-y-[1px]2 text-xs font-bold text-white shadow-glow-crimson transition"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo enlace
                </button>
              </div>

              {regLinks.length === 0 ? (
                <div className="rounded-none border border-white/10 bg-surface-container-lowest p-6 text-center text-xs text-tertiary">
                  Sin enlaces registrados
                </div>
              ) : (
                <div className="space-y-3">
                  {groupByCategoryFamily(
                    regLinks,
                    (lnk) => `${lnk.categoryCode} ${lnk.categoryLabel} ${lnk.defaultTeamName || ''}`
                  ).map(({ family, items: familyLinks }) => {
                    const activeCount = familyLinks.filter((l) => l.isActive).length;
                    const submissionsSum = familyLinks.reduce(
                      (acc, l) => acc + l.submissionsCount,
                      0
                    );
                    return (
                      <details
                        key={family.code}
                        open={family.code === 'SENIOR'}
                        className="group rounded-none border border-white/10 bg-surface-container-lowest/60 overflow-hidden"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-2">
                            <span>{family.label}</span>
                            <span className="rounded-none bg-white/10 px-2 py-0.5 text-[10px] font-mono text-on-surface">
                              {familyLinks.length}{' '}
                              {familyLinks.length === 1 ? 'enlace' : 'enlaces'}
                            </span>
                          </span>
                          <span className="flex items-center gap-2 text-[11px] font-normal text-tertiary">
                            <span>
                              {activeCount} activos · {submissionsSum} envíos
                            </span>
                            <ChevronDown className="h-4 w-4 text-tertiary transition-transform group-open:rotate-180" />
                          </span>
                        </summary>
                        <div className="grid grid-cols-1 gap-3 border-t border-white/10 p-3 md:grid-cols-2">
                          {familyLinks.map((lnk) => {
                            const fullUrl =
                              typeof window !== 'undefined'
                                ? `${window.location.origin}${lnk.registrationPath}`
                                : lnk.registrationUrl;
                            const waMessage = `Inscripción oficial C.D. Voleibol San Pedro\nCategoría: ${lnk.categoryLabel}\nCompleta tus datos, modalidad de cuota y autorizaciones aquí:\n${fullUrl}`;
                            const isBusyLnk = busyLinkId === lnk.id;
                            return (
                              <div
                                key={lnk.id}
                                className={`rounded-none border p-4 space-y-2.5 min-w-0 ${
                                  lnk.isActive
                                    ? 'border-white/10 bg-surface-container-lowest'
                                    : 'border-white/15 bg-surface-container-low/60 opacity-75'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-bold text-sm text-white truncate">
                                        {lnk.categoryLabel}
                                      </span>
                                      <span
                                        className={`rounded-none px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                          lnk.isActive
                                            ? 'bg-emerald-500/20 text-emerald-300'
                                            : 'bg-white/15 text-on-surface/90'
                                        }`}
                                      >
                                        {lnk.isActive ? 'Activo' : 'Pausado'}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-tertiary mt-0.5 truncate">
                                      {lnk.defaultTeamName
                                        ? `Equipo sugerido: ${lnk.defaultTeamName} · `
                                        : ''}
                                      Inscripciones recibidas:{' '}
                                      <strong className="text-white">{lnk.submissionsCount}</strong>
                                    </p>
                                  </div>
                                </div>

                                <div className="rounded-none bg-black/30 px-2.5 py-1.5 font-mono text-[11px] text-on-surface/90 truncate select-all">
                                  {fullUrl}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(`url-${lnk.id}`, fullUrl)}
                                    className="inline-flex items-center gap-1 rounded-none border border-white/15 bg-surface-container-high px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-white/10"
                                  >
                                    {copiedKey === `url-${lnk.id}` ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                    {copiedKey === `url-${lnk.id}` ? 'Copiado' : 'Copiar enlace'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(`wa-${lnk.id}`, waMessage)}
                                    className="inline-flex items-center gap-1 rounded-none border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/25"
                                  >
                                    {copiedKey === `wa-${lnk.id}` ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-300" />
                                    ) : (
                                      <Share2 className="h-3.5 w-3.5" />
                                    )}
                                    {copiedKey === `wa-${lnk.id}`
                                      ? 'Mensaje copiado'
                                      : 'Copiar para WhatsApp'}
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isBusyLnk}
                                    onClick={() => handleToggleRegLink(lnk)}
                                    className="inline-flex items-center gap-1 rounded-none border border-white/15 bg-surface-container-high px-2.5 py-1.5 text-[11px] font-semibold text-on-surface hover:bg-white/10 disabled:opacity-50"
                                  >
                                    {lnk.isActive ? (
                                      <ToggleRight className="h-3.5 w-3.5 text-emerald-400" />
                                    ) : (
                                      <ToggleLeft className="h-3.5 w-3.5 text-tertiary" />
                                    )}
                                    {lnk.isActive ? 'Pausar' : 'Activar'}
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isBusyLnk}
                                    onClick={() => handleRegenerateRegLink(lnk)}
                                    className="inline-flex items-center gap-1 rounded-none border border-white/15 bg-surface-container-high px-2.5 py-1.5 text-[11px] font-semibold text-on-surface hover:bg-white/10 disabled:opacity-50"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Regenerar
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* MODAL RESUMEN POR EQUIPO */}
      <IntranetModal
        isOpen={teamSummaryModalOpen}
        onClose={() => setTeamSummaryModalOpen(false)}
        title="Progreso de campaña por equipo"
        subtitle="Haz clic en un equipo para filtrar la tabla"
        size="xl"
        accent="primary"
        headerRight={
          teamFilter ? (
            <button
              type="button"
              onClick={() => {
                setTeamFilter('');
                setTeamSummaryModalOpen(false);
              }}
              className="rounded-none border border-white/15 bg-surface-container-high px-2.5 py-1 text-xs font-semibold text-primary hover:bg-white/10"
            >
              Ver todos
            </button>
          ) : undefined
        }
      >
        <div className="space-y-3">
          {groupByCategoryFamily(teamSummaries, (ts) => `${ts.teamId} ${ts.teamName}`).map(
            ({ family, items: familySummaries }) => {
              const catVerif = familySummaries.reduce((acc, ts) => acc + ts.verificados, 0);
              const catTotal = familySummaries.reduce((acc, ts) => acc + ts.total, 0);
              const hasActiveFilter = familySummaries.some((ts) => teamFilter === ts.teamId);
              return (
                <details
                  key={family.code}
                  open={hasActiveFilter || family.code === 'SENIOR'}
                  className="group rounded-none border border-white/10 bg-surface-container-lowest/60 overflow-hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <span>{family.label}</span>
                      <span className="rounded-none bg-white/10 px-2 py-0.5 text-[10px] font-mono text-on-surface">
                        {familySummaries.length}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-[11px] font-semibold text-emerald-300">
                      <span>
                        {catVerif}/{catTotal} verificadas
                      </span>
                      <ChevronDown className="h-4 w-4 text-tertiary transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="grid grid-cols-1 gap-3 border-t border-white/10 p-3 sm:grid-cols-2 lg:grid-cols-3">
                    {familySummaries.map((ts) => {
                      const pct = ts.total > 0 ? Math.round((ts.verificados / ts.total) * 100) : 0;
                      const isSelected = teamFilter === ts.teamId;
                      return (
                        <button
                          key={ts.teamId}
                          type="button"
                          onClick={() => {
                            setTeamFilter((prev) => (prev === ts.teamId ? '' : ts.teamId));
                            setTeamSummaryModalOpen(false);
                          }}
                          className={`rounded-none border p-3.5 text-left transition ${
                            isSelected
                              ? 'border-primary bg-primary-container/15 shadow-glow-crimson'
                              : 'border-white/10 bg-surface-container hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`truncate text-sm font-bold ${
                                getTeamColorTheme(ts.teamName).colorKey
                                  ? getTeamColorTheme(ts.teamName).textClass
                                  : 'text-white'
                              }`}
                            >
                              {getShortTeamLabelInFamily(ts.teamName, family.code)}
                            </span>
                            <span className="shrink-0 rounded-none bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-on-surface/90">
                              {ts.association}
                            </span>
                          </div>
                          <div className="mt-2 flex items-baseline justify-between text-xs">
                            <span className="font-semibold text-emerald-300">
                              {ts.verificados}/{ts.total} verificadas
                            </span>
                            <span className="text-tertiary">{ts.conRgpd} RGPD</span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-none bg-white/10">
                            <div
                              className="h-full rounded-none bg-primary-container transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </details>
              );
            }
          )}
        </div>
      </IntranetModal>

      {/* MODAL NUEVO ENLACE POR CATEGORÍA */}
      <IntranetModal
        isOpen={newLinkModalOpen}
        onClose={() => setNewLinkModalOpen(false)}
        title="Crear enlace por equipo / categoría"
        subtitle="Enlace directo para grupos de WhatsApp"
        size="md"
        accent="primary"
      >
        <form onSubmit={handleCreateRegLink} className="space-y-4">
          {errorBanner && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-none border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs text-rose-200"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorBanner}</span>
            </div>
          )}

          <div>
            <label htmlFor="censo-new-link-cat" className="mb-1 block text-xs font-semibold text-on-surface/90">
              Categoría oficial
            </label>
            <select
              id="censo-new-link-cat"
              value={newLinkCatCode}
              onChange={(e) => setNewLinkCatCode(e.target.value)}
              className="w-full rounded-none border border-white/15 bg-surface px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
            >
              {groupByCategoryFamily(CLUB_CATEGORIES_META, (c) => c.id).map(
                ({ family, items: familyCats }) => (
                  <optgroup key={family.code} label={family.label}>
                    {familyCats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getShortTeamLabelInFamily(c.name, family.code)}
                      </option>
                    ))}
                  </optgroup>
                )
              )}
            </select>
          </div>

          <div>
            <label htmlFor="censo-new-link-label" className="mb-1 block text-xs font-semibold text-on-surface/90">
              Etiqueta visible (opcional)
            </label>
            <input
              id="censo-new-link-label"
              type="text"
              value={newLinkLabel}
              onChange={(e) => setNewLinkLabel(e.target.value)}
              placeholder="Ej. Cadete Femenino Rojo 26/27"
              className="w-full rounded-none border border-white/15 bg-surface px-3 py-2 text-xs text-white placeholder:text-tertiary/75 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="censo-new-link-team" className="mb-1 block text-xs font-semibold text-on-surface/90">
              Equipo preseleccionado
            </label>
            <select
              id="censo-new-link-team"
              value={newLinkTeamId}
              onChange={(e) => setNewLinkTeamId(e.target.value)}
              className="w-full rounded-none border border-white/15 bg-surface px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
            >
              <option value="">Según selección en aprobación</option>
              {groupByCategoryFamily(regTeams, (t) => `${t.id} ${t.name}`).map(
                ({ family, items: familyTeams }) => (
                  <optgroup key={family.code} label={family.label}>
                    {familyTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {getShortTeamLabelInFamily(t.name, family.code)}
                      </option>
                    ))}
                  </optgroup>
                )
              )}
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => setNewLinkModalOpen(false)}
              className="rounded-none border border-white/15 px-4 py-2 text-xs font-semibold text-on-surface/90 hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creatingLink}
              className="inline-flex items-center justify-center gap-2 rounded-none bg-primary-container hover:bg-cta-hover px-4 py- active:translate-x-[1px] active:translate-y-[1px]2 text-xs font-bold text-white transition disabled:opacity-50"
            >
              {creatingLink ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
              Crear Enlace
            </button>
          </div>
        </form>
      </IntranetModal>

      {/* MODAL ACEPTAR INSCRIPCIÓN Y ASIGNAR EQUIPO(S) */}
      <IntranetModal
        isOpen={Boolean(approveModalReq)}
        onClose={() => setApproveModalReq(null)}
        title={
          approveModalReq
            ? `Aceptar Inscripción · ${approveModalReq.athleteFullName}`
            : 'Aceptar Inscripción'
        }
        subtitle={
          approveModalReq
            ? `Categoría origen: ${approveModalReq.categoryLabel} · Email: ${approveModalReq.contactEmail}`
            : undefined
        }
        size="lg"
        accent="emerald"
      >
        {approveModalReq && (
          <form onSubmit={handleApproveSubmit} className="space-y-4">
            {!approveModalReq.athleteId.startsWith('reg-') ? (
              <div className="rounded-none border border-emerald-500/40 bg-emerald-950/35 px-3 py-2.5 text-xs text-emerald-200">
                <strong>Ficha existente unificada ({approveModalReq.athleteId}):</strong> al aprobar se unificarán la cuenta de acceso, los datos verificados y la autorización RGPD sobre la ficha deportiva que ya existía en el censo.
              </div>
            ) : (
              <div className="rounded-none border border-sky-500/35 bg-sky-950/30 px-3 py-2 text-xs text-sky-200">
                <strong>Nueva ficha ({approveModalReq.athleteId}):</strong> se dará de alta como nuevo deportista en el censo tras asignar equipo.
              </div>
            )}

            {errorBanner && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-none border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs text-rose-200"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorBanner}</span>
              </div>
            )}

            <div className="rounded-none border border-white/10 bg-surface p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary">
                  Datos ajustables por Staff (prevalecen y se envían en el email)
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div>
                  <label htmlFor="censo-app-first" className="mb-1 block text-[11px] font-semibold text-on-surface/90">
                    Nombre
                  </label>
                  <input
                    id="censo-app-first"
                    type="text"
                    required
                    value={appFirstName}
                    onChange={(e) => setAppFirstName(e.target.value)}
                    className="w-full rounded-none border border-white/15 bg-surface-container px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label htmlFor="censo-app-last" className="mb-1 block text-[11px] font-semibold text-on-surface/90">
                    Apellidos
                  </label>
                  <input
                    id="censo-app-last"
                    type="text"
                    value={appLastName}
                    onChange={(e) => setAppLastName(e.target.value)}
                    className="w-full rounded-none border border-white/15 bg-surface-container px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label htmlFor="censo-app-shirt" className="mb-1 block text-[11px] font-semibold text-on-surface/90">
                    Talla camiseta
                  </label>
                  <input
                    id="censo-app-shirt"
                    type="text"
                    value={appShirtSize}
                    onChange={(e) => setAppShirtSize(e.target.value)}
                    placeholder="S / M / L / XL"
                    className="w-full rounded-none border border-white/15 bg-surface-container px-2.5 py-1.5 text-xs text-white placeholder:text-tertiary/75"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 block text-xs font-bold uppercase tracking-wider text-primary">
                1. Asignar Equipo(s) *
              </p>
              <div className="max-h-60 space-y-2 overflow-y-auto rounded-none border border-white/10 bg-surface p-2.5">
                {groupByCategoryFamily(
                  regTeams.length > 0 ? regTeams : teams,
                  (t) => `${t.id} ${t.name}`
                ).map(({ family, items: familyTeams }, familyIdx) => {
                  const selectedInFamily = familyTeams.filter((t) => appTeamIds.includes(t.id)).length;
                  return (
                    <details
                      key={family.code}
                      open={selectedInFamily > 0 || (familyIdx === 0 && appTeamIds.length === 0)}
                      className="group rounded-none border border-white/10 bg-surface-container-lowest/70 overflow-hidden"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                        <span>{family.label}</span>
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-tertiary">
                          {selectedInFamily > 0 && (
                            <span className="rounded-none bg-emerald-500/20 px-1.5 py-0.5 text-emerald-300">
                              {selectedInFamily} selec.
                            </span>
                          )}
                          <span>{familyTeams.length} eq.</span>
                          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                        </span>
                      </summary>
                      <div className="grid grid-cols-1 gap-1.5 border-t border-white/10 p-2 sm:grid-cols-2">
                        {familyTeams.map((t) => {
                          const checked = appTeamIds.includes(t.id);
                          return (
                            <label
                              key={t.id}
                              className={`flex items-center gap-2 rounded-none border px-2.5 py-1.5 text-xs cursor-pointer ${
                                checked
                                  ? 'border-emerald-500/50 bg-emerald-500/15 text-white'
                                  : 'border-white/10 bg-surface-container text-on-surface/90'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleApproveTeam(t.id)}
                                className="accent-emerald-500"
                              />
                              <span className="truncate font-semibold">
                                {getShortTeamLabelInFamily(t.name, family.code)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>

            {appTeamIds.length > 1 && (
              <div>
                <label htmlFor="censo-app-primary-team" className="mb-1 block text-xs font-semibold text-on-surface/90">
                  Equipo principal
                </label>
                <select
                  id="censo-app-primary-team"
                  value={appPrimaryTeamId}
                  onChange={(e) => setAppPrimaryTeamId(e.target.value)}
                  className="w-full rounded-none border border-white/15 bg-surface px-3 py-2 text-xs text-white"
                >
                  {appTeamIds.map((tid) => {
                    const t = (regTeams.length > 0 ? regTeams : teams).find((x) => x.id === tid);
                    return (
                      <option key={tid} value={tid}>
                        {t?.name || tid}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="censo-app-dorsal" className="mb-1 block text-xs font-semibold text-on-surface/90">
                  Dorsal asignado (opcional)
                </label>
                <input
                  id="censo-app-dorsal"
                  type="number"
                  min={1}
                  max={99}
                  value={appDorsal}
                  onChange={(e) => setAppDorsal(e.target.value)}
                  placeholder="1-99"
                  className="w-full rounded-none border border-white/15 bg-surface px-3 py-2 text-xs text-white placeholder:text-tertiary/75"
                />
              </div>
              <div>
                <label htmlFor="censo-app-position" className="mb-1 block text-xs font-semibold text-on-surface/90">
                  Posición (opcional)
                </label>
                <input
                  id="censo-app-position"
                  type="text"
                  value={appPosition}
                  onChange={(e) => setAppPosition(e.target.value)}
                  placeholder="Colocadora, Receptora, Central..."
                  className="w-full rounded-none border border-white/15 bg-surface px-3 py-2 text-xs text-white placeholder:text-tertiary/75"
                />
              </div>
            </div>

            <div className="rounded-none border border-white/10 bg-surface p-3 space-y-3">
              <label htmlFor="censo-app-plan" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                2. Modalidad de Pago / Cuota
              </label>
              <select
                id="censo-app-plan"
                value={appPlanId}
                onChange={(e) => setAppPlanId(e.target.value)}
                className="w-full rounded-none border border-white/15 bg-surface-container px-3 py-2 text-xs text-white"
              >
                {regPaymentPlans.map((p) => (
                  <option key={p.planId} value={p.planId}>
                    {p.productName} · {p.planName} ({p.totalAmount.toFixed(2)} € / {p.installmentsCount} plazo{p.installmentsCount === 1 ? '' : 's'})
                  </option>
                ))}
              </select>

              {regDiscountRules.length > 0 && (
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-semibold text-on-surface/90">
                    Descuentos configurables (opcional)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {regDiscountRules.map((d) => {
                      const sel = appDiscountIds.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() =>
                            setAppDiscountIds((prev) =>
                              prev.includes(d.id)
                                ? prev.filter((x) => x !== d.id)
                                : [...prev, d.id]
                            )
                          }
                          className={`rounded-none border px-2.5 py-1 text-[11px] font-semibold ${
                            sel
                              ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                              : 'border-white/15 bg-surface-container text-on-surface/90'
                          }`}
                        >
                          {d.name} ({d.valueType === 'PERCENTAGE' ? `${d.value}%` : `${d.value}€`})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="censo-app-notes" className="mb-1 block text-xs font-semibold text-on-surface/90">
                Notas internas (opcional)
              </label>
              <input
                id="censo-app-notes"
                type="text"
                value={appNotes}
                onChange={(e) => setAppNotes(e.target.value)}
                placeholder="Observaciones de Secretaría / Coordinación"
                className="w-full rounded-none border border-white/15 bg-surface px-3 py-2 text-xs text-white placeholder:text-tertiary/75"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setApproveModalReq(null)}
                className="rounded-none border border-white/15 bg-surface-container-high px-4 py-2 text-xs font-semibold text-on-surface"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={approvingBusy || appTeamIds.length === 0}
                className="inline-flex items-center gap-2 rounded-none bg-emerald-600 hover:bg-emerald-500 active:translate-x-[1px] active:translate-y-[1px] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {approvingBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Aceptar Inscripción y Activar Acceso
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* MODAL CONFIRMAR RECHAZO DE SOLICITUD */}
      <IntranetModal
        isOpen={Boolean(rejectModalReq)}
        onClose={() => {
          if (!rejectingReqId) {
            setRejectModalReq(null);
            setRejectNotes('');
          }
        }}
        title={
          rejectModalReq
            ? `Rechazar Solicitud · ${rejectModalReq.athleteFullName}`
            : 'Rechazar Solicitud'
        }
        subtitle={
          rejectModalReq
            ? `Email: ${rejectModalReq.contactEmail} · ${!rejectModalReq.athleteId.startsWith('reg-') ? 'Ficha existente sin usuario (quedará intacta para nuevo intento)' : 'Nueva ficha (quedará en Baja para permitir reintento limpio)'}`
            : undefined
        }
        size="md"
        accent="rose"
      >
        {rejectModalReq && (
          <form onSubmit={handleRejectRequest} className="space-y-4">
            <p className="text-xs text-on-surface/90 leading-relaxed">
              Esta acción marcará la solicitud como rechazada, liberará la vinculación pendiente y <strong>enviará un correo electrónico al solicitante con el motivo indicado</strong> y el enlace directo para volver a rellenar el formulario si se trata de un dato subsanable.
            </p>
            <div>
              <label
                htmlFor="censo-reject-notes"
                className="mb-1 block text-xs font-semibold text-on-surface/90"
              >
                Motivo del rechazo (se enviará por email al solicitante) *
              </label>
              <textarea
                id="censo-reject-notes"
                rows={3}
                required
                minLength={5}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Ej. El DNI introducido no coincide con el del deportista o el enlace elegido corresponde a otra categoría. Vuelve a enviarlo con los datos corregidos."
                className="w-full rounded-none border border-white/15 bg-surface px-3 py-2 text-xs text-white placeholder:text-tertiary/75"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={Boolean(rejectingReqId)}
                onClick={() => {
                  setRejectModalReq(null);
                  setRejectNotes('');
                }}
                className="rounded-none border border-white/15 bg-surface-container-high px-4 py-2 text-xs font-semibold text-on-surface disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={rejectingReqId === rejectModalReq.id || rejectNotes.trim().length < 5}
                className="inline-flex items-center gap-2 rounded-none bg-rose-600 hover:bg-rose-500 active:translate-x-[1px] active:translate-y-[1px] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {rejectingReqId === rejectModalReq.id && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar Rechazo y Enviar Email
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* MODAL FICHA / EDICIÓN / DATOS SENSIBLES AUDITADOS */}
      <IntranetModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={
          editingAthlete
            ? `Ficha de ${editingAthlete.fullName}`
            : 'Nuevo Deportista'
        }
        subtitle={
          editingAthlete
            ? `ID: ${editingAthlete.id} · Estado RGPD: ${RGPD_BADGE[editingAthlete.rgpdStatus]?.label || editingAthlete.rgpdStatus}`
            : undefined
        }
        size="xl"
        accent="primary"
      >
        {errorBanner && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-none border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs text-rose-200"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorBanner}</span>
          </div>
        )}

        {editingAthlete && loadingSensitive && (
          <div className="flex items-center gap-2 rounded-none border border-white/10 bg-surface-container px-3 py-2 text-xs text-tertiary">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>Cargando DNI completo, fecha exacta y datos médicos...</span>
          </div>
        )}

        <form onSubmit={handleSaveAthlete} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="censo-f-first-name" className="mb-1 block text-xs font-semibold text-on-surface/90">
                Nombre *
              </label>
              <input
                id="censo-f-first-name"
                type="text"
                required
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fFirstName}
                onChange={(e) => setFFirstName(e.target.value)}
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="censo-f-last-name" className="mb-1 block text-xs font-semibold text-on-surface/90">
                Apellidos
              </label>
              <input
                id="censo-f-last-name"
                type="text"
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fLastName}
                onChange={(e) => setFLastName(e.target.value)}
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="censo-f-birth-date" className="mb-1 block text-xs font-semibold text-on-surface/90">
                Fecha de nacimiento
              </label>
              <input
                id="censo-f-birth-date"
                type="date"
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fBirthDate}
                onChange={(e) => setFBirthDate(e.target.value)}
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="censo-f-birth-year" className="mb-1 block text-xs font-semibold text-on-surface/90">
                Año nacimiento (aprox. si no hay fecha)
              </label>
              <input
                id="censo-f-birth-year"
                type="number"
                min={1950}
                max={2026}
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fBirthYear}
                onChange={(e) => setFBirthYear(e.target.value)}
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="censo-f-dni" className="mb-1 block text-xs font-semibold text-on-surface/90">
                DNI / NIE / Pasaporte{' '}
                {editingAthlete?.dniLast5 && !fDni ? `(actual: ***${editingAthlete.dniLast5})` : ''}
              </label>
              <input
                id="censo-f-dni"
                type="text"
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fDni}
                onChange={(e) => setFDni(e.target.value)}
                placeholder={editingAthlete?.dniLast5 ? 'Dejar vacío para mantener' : '12345678Z'}
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white placeholder:text-tertiary/75 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="censo-f-status" className="mb-1 block text-xs font-semibold text-on-surface/90">Estado</label>
              <select
                id="censo-f-status"
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value as AthleteStatus)}
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                <option value="IMPORTADO">Sin registrar</option>
                <option value="PENDIENTE_VALIDAR">Pendiente validar</option>
                <option value="VERIFICADO">Verificado</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>

            <div>
              <label htmlFor="censo-f-primary-team" className="mb-1 block text-xs font-semibold text-on-surface/90">
                Equipo principal
              </label>
              <select
                id="censo-f-primary-team"
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fPrimaryTeam}
                onChange={(e) => setFPrimaryTeam(e.target.value)}
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                <option value="">Sin equipo asignado</option>
                {groupByCategoryFamily(teams, (t) => `${t.id} ${t.name}`).map(
                  ({ family, items: familyTeams }) => (
                    <optgroup key={family.code} label={family.label}>
                      {familyTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {getShortTeamLabelInFamily(t.name, family.code)}
                        </option>
                      ))}
                    </optgroup>
                  )
                )}
              </select>
            </div>

            <div>
              <label htmlFor="censo-f-gender" className="mb-1 block text-xs font-semibold text-on-surface/90">Género</label>
              <select
                id="censo-f-gender"
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fGender}
                onChange={(e) =>
                  setFGender(e.target.value === 'MASCULINO' ? 'MASCULINO' : 'FEMENINO')
                }
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                <option value="FEMENINO">Femenino</option>
                <option value="MASCULINO">Masculino</option>
              </select>
            </div>

            <div>
              <label htmlFor="censo-f-favb" className="mb-1 block text-xs font-semibold text-on-surface/90">
                Licencia FAVB
              </label>
              <input
                id="censo-f-favb"
                type="text"
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fFavbLicense}
                onChange={(e) => setFFavbLicense(e.target.value)}
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="censo-f-jersey" className="mb-1 block text-xs font-semibold text-on-surface/90">Dorsal</label>
                <input
                  id="censo-f-jersey"
                  type="number"
                  min={0}
                  max={99}
                  disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                  value={fJerseyNumber}
                  onChange={(e) => setFJerseyNumber(e.target.value)}
                  className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
                />
              </div>
              <div>
                <label htmlFor="censo-f-shirt" className="mb-1 block text-xs font-semibold text-on-surface/90">Talla</label>
                <input
                  id="censo-f-shirt"
                  type="text"
                  placeholder="S / M / L"
                  disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                  value={fShirtSize}
                  onChange={(e) => setFShirtSize(e.target.value)}
                  className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white placeholder:text-tertiary/75 disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Equipos secundarios */}
          {teams.length > 0 && (!editingAthlete || editingAthlete.canEditRow) && (
            <div>
              <p className="mb-1.5 block text-xs font-semibold text-on-surface/90">
                Equipos secundarios (convocatorias)
              </p>
              <div className="max-h-44 space-y-2 overflow-y-auto rounded-none border border-white/10 bg-surface-container-lowest p-2.5">
                {groupByCategoryFamily(
                  teams.filter((t) => t.id !== fPrimaryTeam),
                  (t) => `${t.id} ${t.name}`
                ).map(({ family, items: familyTeams }) => {
                  const selectedCount = familyTeams.filter((t) =>
                    fSecondaryTeams.includes(t.id)
                  ).length;
                  return (
                    <details
                      key={family.code}
                      open={selectedCount > 0}
                      className="group rounded-none border border-white/10 bg-surface-container/60 overflow-hidden"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-on-surface hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                        <span>{family.label}</span>
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-tertiary">
                          {selectedCount > 0 && (
                            <span className="rounded-none bg-primary-container/30 px-1.5 py- active:translate-x-[1px] active:translate-y-[1px]0.5 text-primary">
                              {selectedCount} selec.
                            </span>
                          )}
                          <span>{familyTeams.length} eq.</span>
                          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                        </span>
                      </summary>
                      <div className="flex flex-wrap gap-1.5 border-t border-white/10 p-2">
                        {familyTeams.map((t) => {
                          const checked = fSecondaryTeams.includes(t.id);
                          return (
                            <label
                              key={t.id}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-none border border-white/10 bg-surface-container px-2.5 py-1 text-xs text-on-surface"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFSecondaryTeams((prev) => [...prev, t.id]);
                                  } else {
                                    setFSecondaryTeams((prev) =>
                                      prev.filter((id) => id !== t.id)
                                    );
                                  }
                                }}
                                className="accent-primary-container"
                              />
                              {getShortTeamLabelInFamily(t.name, family.code)}
                            </label>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          )}

          {/* Emergencia y Alergias */}
          <div className="grid grid-cols-1 gap-3 rounded-none border border-white/10 bg-surface-container p-3.5 sm:grid-cols-2">
            <div className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-tertiary">
              Contacto de emergencia y datos médicos
            </div>
            <div>
              <label htmlFor="censo-f-emerg-name" className="mb-1 block text-xs text-on-surface/90">Contacto emergencia</label>
              <input
                id="censo-f-emerg-name"
                type="text"
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fEmergName}
                onChange={(e) => setFEmergName(e.target.value)}
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="censo-f-emerg-phone" className="mb-1 block text-xs text-on-surface/90">Teléfono emergencia</label>
              <input
                id="censo-f-emerg-phone"
                type="text"
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fEmergPhone}
                onChange={(e) => setFEmergPhone(e.target.value)}
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="censo-f-allergies" className="mb-1 block text-xs text-on-surface/90">
                Alergias o indicaciones médicas (cifrado AES-256-GCM)
              </label>
              <input
                id="censo-f-allergies"
                type="text"
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fAllergies}
                onChange={(e) => setFAllergies(e.target.value)}
                placeholder="Dejar vacío si no se desea sobrescribir sin revelar"
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white placeholder:text-tertiary/75 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Tutor principal */}
          <div className="grid grid-cols-1 gap-3 rounded-none border border-white/10 bg-surface-container p-3.5 sm:grid-cols-2">
            <div className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-tertiary">
              Tutor / Representante legal
            </div>
            <div>
              <label htmlFor="censo-f-guardian-name" className="mb-1 block text-xs text-on-surface/90">Nombre completo tutor</label>
              <input
                id="censo-f-guardian-name"
                type="text"
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fGuardianName}
                onChange={(e) => setFGuardianName(e.target.value)}
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="censo-f-guardian-rel" className="mb-1 block text-xs text-on-surface/90">Parentesco</label>
              <select
                id="censo-f-guardian-rel"
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fGuardianRel}
                onChange={(e) =>
                  setFGuardianRel(
                    e.target.value as 'PADRE' | 'MADRE' | 'TUTOR_LEGAL'
                  )
                }
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                <option value="MADRE">Madre</option>
                <option value="PADRE">Padre</option>
                <option value="TUTOR_LEGAL">Tutor legal</option>
              </select>
            </div>
            <div>
              <label htmlFor="censo-f-guardian-email" className="mb-1 block text-xs text-on-surface/90">Email tutor</label>
              <input
                id="censo-f-guardian-email"
                type="email"
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fGuardianEmail}
                onChange={(e) => setFGuardianEmail(e.target.value)}
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="censo-f-guardian-phone" className="mb-1 block text-xs text-on-surface/90">Teléfono tutor</label>
              <input
                id="censo-f-guardian-phone"
                type="text"
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fGuardianPhone}
                onChange={(e) => setFGuardianPhone(e.target.value)}
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white disabled:opacity-60"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="censo-f-guardian-dni" className="mb-1 block text-xs text-on-surface/90">DNI / NIE tutor</label>
              <input
                id="censo-f-guardian-dni"
                type="text"
                disabled={Boolean(editingAthlete && !editingAthlete.canEditRow)}
                value={fGuardianDni}
                onChange={(e) => setFGuardianDni(e.target.value)}
                placeholder="Dejar vacío para mantener existente"
                className="w-full rounded-none border border-white/10 bg-surface-container-lowest px-3 py-2 text-sm text-white placeholder:text-tertiary/75 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="rounded-none border border-white/15 px-4 py-2 text-sm font-semibold text-on-surface/90 hover:bg-white/10"
            >
              Cerrar
            </button>
            {(!editingAthlete || editingAthlete.canEditRow) && permissions.canEdit && (
              <button
                type="submit"
                disabled={savingAthlete}
                className="inline-flex items-center gap-2 rounded-none bg-primary-container px-5 py-2 active:translate-x-[1px] active:translate-y-[1px] text-sm font-bold text-white transition hover:bg-cta-hover disabled:opacity-50"
              >
                {savingAthlete && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingAthlete ? 'Guardar cambios' : 'Crear deportista'}
              </button>
            )}
          </div>
        </form>
      </IntranetModal>

      {/* MODAL CONFIRMAR BAJA DEPORTISTA (ESTILO BRUTALISTA WEB) */}
      <IntranetModal
        isOpen={Boolean(deactivateModalAth)}
        onClose={() => {
          if (!deactivatingBusy) {
            setDeactivateModalAth(null);
            setDeactivateReason('');
          }
        }}
        title={
          deactivateModalAth
            ? `Confirmar Baja · ${deactivateModalAth.fullName}`
            : 'Confirmar Baja'
        }
        subtitle="El historial deportivo, pagos y autorizaciones registradas se conservarán conforme a la normativa."
        size="md"
        accent="rose"
      >
        {deactivateModalAth && (
          <form onSubmit={handleConfirmDeactivate} className="space-y-4">
            <p className="text-xs leading-relaxed text-on-surface/90">
              ¿Confirmas dar de baja a <strong className="text-white">{deactivateModalAth.fullName}</strong> en la plantilla actual? Podrás volver a activarlo en cualquier momento editando su ficha si regresa al club.
            </p>
            <div>
              <label
                htmlFor="censo-deact-reason"
                className="mb-1 block text-xs font-semibold text-on-surface/90"
              >
                Motivo de la baja (opcional)
              </label>
              <input
                id="censo-deact-reason"
                type="text"
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="Ej. Baja voluntaria, cambio de domicilio, lesión de larga duración..."
                className="w-full rounded-none border border-white/15 bg-surface-container-lowest px-3 py-2 text-xs text-white placeholder:text-tertiary/75"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                disabled={deactivatingBusy}
                onClick={() => {
                  setDeactivateModalAth(null);
                  setDeactivateReason('');
                }}
                className="rounded-none border border-white/15 bg-surface-container-high px-4 py-2 text-xs font-semibold text-on-surface disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={deactivatingBusy}
                className="inline-flex items-center gap-2 rounded-none bg-rose-600 hover:bg-rose-500 active:translate-x-[1px] active:translate-y-[1px] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {deactivatingBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar Baja
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* MODAL COMPROBADOR NO DESTRUCTIVO CON ACTAS FEDERATIVAS FAVB */}
      <IntranetModal
        isOpen={favbModalOpen}
        onClose={() => setFavbModalOpen(false)}
        title="Comprobación con Actas Federativas (FAVB)"
        subtitle="Auditoría en modo seguro: mantiene intacto el censo del club sin crear ni eliminar deportistas automáticamente."
        size="xl"
        accent="amber"
      >
        {favbLoading && !favbReport ? (
          <div className="py-12 text-center text-sm text-tertiary">
            <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-amber-400" />
            Comparando fichas del club contra las actas federativas...
          </div>
        ) : favbReport ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-none border border-amber-500/35 bg-amber-950/25 px-3.5 py-2.5 text-xs text-amber-200">
              <span>
                Modo lectura: <strong>{favbReport.favbPlayersCount}</strong> deportistas en actas FAVB frente a{' '}
                <strong>{favbReport.clubAthletesCount}</strong> activos en el censo del club.
              </span>
              <button
                type="button"
                disabled={favbLoading}
                onClick={handleCheckFavbDiscrepancies}
                className="inline-flex items-center gap-1 rounded-none border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-100 hover:bg-amber-500/25"
              >
                {favbLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Volver a comprobar
              </button>
            </div>

            {/* 1. Discrepancias en fichas existentes */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                1. Discrepancias de equipo o dorsal en fichas existentes ({favbReport.discrepancies.length})
              </h3>
              {favbReport.discrepancies.length === 0 ? (
                <p className="rounded-none border border-white/10 bg-surface-container-lowest p-3 text-xs text-emerald-300">
                  Sin discrepancias de equipo o dorsal entre tu censo y las actas FAVB.
                </p>
              ) : (
                <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                  {favbReport.discrepancies.map((item) => (
                    <div
                      key={item.athleteId}
                      className="flex flex-col gap-2 rounded-none border border-white/10 bg-surface-container-lowest p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-white">
                          {item.clubFullName}{' '}
                          <span className="font-normal text-tertiary">({item.clubStatus})</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px]">
                          {item.missingTeamNames.length > 0 && (
                            <span className="border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-amber-200">
                              Falta equipo FAVB: {item.missingTeamNames.join(', ')}
                            </span>
                          )}
                          {item.dorsalDiff && (
                            <span className="border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-sky-200">
                              Dorsal club: {item.dorsalDiff.clubDorsal ?? '—'} → FAVB: #{item.dorsalDiff.favbDorsal}
                            </span>
                          )}
                          {item.nameDiff && (
                            <span className="border border-white/15 bg-white/5 px-2 py-0.5 text-on-surface/90">
                              Grafía en acta FAVB: {item.nameDiff.favbName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        {(item.missingTeamIds.length > 0 || item.dorsalDiff) && permissions.canEdit && (
                          <button
                            type="button"
                            disabled={favbBusyId === item.athleteId}
                            onClick={() => handleResolveFavbDiscrepancy(item)}
                            className="inline-flex items-center gap-1 rounded-none bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                          >
                            {favbBusyId === item.athleteId && <Loader2 className="h-3 w-3 animate-spin" />}
                            Subsanar equipo/dorsal
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Jugadores presentes en actas FAVB que aún no figuran en el censo */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                2. Deportistas en actas FAVB sin ficha en el censo web ({favbReport.missingInClub.length})
              </h3>
              {favbReport.missingInClub.length === 0 ? (
                <p className="rounded-none border border-white/10 bg-surface-container-lowest p-3 text-xs text-emerald-300">
                  Todos los deportistas presentes en las actas FAVB ya existen en el censo.
                </p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {favbReport.missingInClub.map((m) => (
                    <div
                      key={`${m.favbId}-${m.teamId}`}
                      className="flex flex-col gap-2 rounded-none border border-rose-500/30 bg-rose-950/15 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="text-xs">
                        <div className="font-bold text-white">{m.fullName}</div>
                        <div className="text-[11px] text-tertiary">
                          Acta FAVB: {m.teamName}
                          {m.dorsal ? ` · Dorsal #${m.dorsal}` : ''}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        {m.registrationUrl && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(`favb-missing-${m.favbId}`, m.registrationUrl!)}
                            className="inline-flex items-center gap-1 rounded-none border border-white/15 bg-surface-container px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-white/10"
                          >
                            {copiedKey === `favb-missing-${m.favbId}` ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            Copiar enlace inscripción
                          </button>
                        )}
                        {permissions.canEdit && (
                          <button
                            type="button"
                            onClick={() => openNewAthleteFromFavb(m)}
                            className="inline-flex items-center gap-1 rounded-none bg-primary-container hover:bg-cta-hover px-2.5 py-1.5 text-[11px] font-bold text-white"
                          >
                            <UserPlus className="h-3 w-3" />
                            Alta manual
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. En censo web aún sin acta FAVB */}
            <details className="rounded-none border border-white/10 bg-surface-container-lowest p-3">
              <summary className="cursor-pointer text-xs font-semibold text-on-surface/90">
                3. En censo del club sin actas FAVB asociadas aún ({favbReport.onlyInClub.length})
              </summary>
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[11px] text-tertiary">
                {favbReport.onlyInClub.length === 0 ? (
                  <p>Todos los deportistas del censo cuentan con acta federativa.</p>
                ) : (
                  favbReport.onlyInClub.map((o) => (
                    <div key={o.athleteId} className="flex justify-between gap-2 border-b border-white/5 py-1">
                      <span className="text-white">{o.fullName}</span>
                      <span>{o.teamNames.join(', ') || 'Sin equipo'} · {o.status}</span>
                    </div>
                  ))
                )}
              </div>
            </details>
          </div>
        ) : null}
      </IntranetModal>
    </main>
  );
}

export default function ClubCensoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      }
    >
      <ClubCensoPageContent />
    </Suspense>
  );
}
