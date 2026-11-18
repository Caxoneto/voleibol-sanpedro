'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Lock,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Download,
  Copy,
  Search,
  Filter,
  LogOut,
  Camera,
  Check,
  RefreshCw,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Share2,
  Bus,
  ExternalLink,
  X,
  CheckSquare,
  Square,
  Layers,
  ClipboardCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  Radio,
  Upload,
  Users,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { CLUB_INFO } from '@/lib/club-info';
import { formatMadridDateString } from '@/lib/date-utils';
import { escapeCsvCell, isStrictEmail, isValidSpanishDniOrNie } from '@/lib/validators';
import { useStreaming } from '@/lib/use-streaming';
import StreamingModal from '@/components/StreamingModal';

type SignatureMethodType = 'DIGITAL_WEB' | 'OTP_EMAIL' | 'PRESENCIAL';

interface BatchDirectConsentItem {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  birthYear: number | null;
  isMinor: boolean;
  isSigned: boolean;
  isShredded?: boolean;
  signerName: string;
  signerDni: string;
  signerRelationship: string;
  signerPhone: string;
  signerEmail: string;
  directToken: string;
  directUrl: string;
}

interface PlayerDashboardItem {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  birthYear: number | null;
  birthDateVerified?: boolean;
  dniLast5: string | null;
  hasCensusEmail?: boolean;
  maskedContactEmail?: string;
  isMinor: boolean;
  isMinor14To17?: boolean;
  isSigned: boolean;
  isShredded?: boolean;
  consentId?: string;
  signedAt?: string;
  signerName?: string;
  signerDni?: string;
  signerRelationship?: string;
  maskedSignerPhone?: string;
  maskedSignerEmail?: string;
  minorSignerName?: string;
  consentSocialMedia?: boolean;
  consentStreaming?: boolean;
  consentPress?: boolean;
  consentTravel?: boolean;
  signatureMethod?: SignatureMethodType;
  documentHash?: string;
  hashVersion?: 'v1' | 'v2' | 'v3';
  signedIsMinor?: boolean;
  signedIsMinor14To17?: boolean;
  integrityVerified?: boolean;
  isDemo?: boolean;
}

interface AdminConsentDetailData {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  birthYear: number | null;
  birthDate?: string | null;
  birthDateVerified: boolean;
  dniLast5: string | null;
  censusDni?: string;
  censusParentName?: string;
  censusParentDni?: string;
  censusParentRelationship?: string;
  censusPhone?: string;
  censusEmail?: string;
  isMinor: boolean;
  isMinor14To17: boolean;
  signedIsMinor?: boolean;
  signedIsMinor14To17?: boolean;
  isSigned: boolean;
  isShredded: boolean;
  consentId?: string;
  signedAt?: string;
  signerName?: string;
  signerDni?: string;
  signerRelationship?: string;
  signerPhone?: string;
  signerEmail?: string;
  minorSignerName?: string;
  minorSignerDni?: string;
  minorSignatureData?: string;
  consentSocialMedia?: boolean;
  consentStreaming?: boolean;
  consentPress?: boolean;
  consentTravel?: boolean;
  signatureMethod?: SignatureMethodType;
  signatureData?: string;
  documentHash?: string;
  integrityVerified?: boolean;
}

interface TeamSummaryItem {
  teamId: string;
  teamName: string;
  total: number;
  signed: number;
  pending: number;
  percent: number;
}

interface DashboardData {
  stats: {
    totalPlayers: number;
    totalSigned: number;
    totalPending: number;
    percentSigned: number;
    imageAllowed?: number;
    imageDenied?: number;
    travelAllowed?: number;
    socialAllowed: number;
    streamingAllowed: number;
    streamingDenied: number;
    pressAllowed: number;
    integrityAlerts?: number;
  };
  teams: TeamSummaryItem[];
  players: PlayerDashboardItem[];
}

interface ToastNotice {
  kind: 'success' | 'error' | 'info';
  message: string;
}

interface ConfirmDialogState {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
}

interface CensusDraftRow {
  playerId: string;
  playerName: string;
  teamName: string;
  isMinor?: boolean;
  dni: string;
  birthDate: string;
  contactEmail: string;
  contactPhone: string;
  parentName: string;
  parentDni: string;
  parentRelationship: string;
}

const EMAIL_BATCH_CHUNK_SIZE = 10;

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function useModalFocusTrap(
  isOpen: boolean,
  modalRef: React.RefObject<HTMLDivElement | null>,
  onClose: () => void
) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      const justOpened = !wasOpenRef.current;
      wasOpenRef.current = true;
      if (justOpened) {
        triggerRef.current = document.activeElement as HTMLElement | null;
        const modal = modalRef.current;
        if (modal && !modal.contains(document.activeElement)) {
          const focusable = modal.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          focusable[0]?.focus();
        }
      }
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCloseRef.current();
          return;
        }
        if (e.key === 'Tab' && modalRef.current) {
          const items = Array.from(
            modalRef.current.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          );
          if (items.length === 0) return;
          const first = items[0];
          const last = items[items.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first || !modalRef.current.contains(document.activeElement)) {
              e.preventDefault();
              last.focus();
            }
          } else if (document.activeElement === last || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [isOpen, modalRef]);
}

export default function AdminConsentimientosPage() {
  const { status: streamingStatus, updateLocalStatus } = useStreaming();
  const [showStreamingModal, setShowStreamingModal] = useState(false);

  // Autenticación
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Toast global accesible y modal de confirmación
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);

  const showToast = useCallback((kind: ToastNotice['kind'], message: string) => {
    setToast({ kind, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Filtros y ordenación
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SIGNED' | 'PENDING' | 'SHREDDED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: 'status' | 'image' | 'travel' | 'method' | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  // Descarga bajo demanda
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // Modal ficha / enlace directo
  const [directLinkPlayer, setDirectLinkPlayer] = useState<PlayerDashboardItem | null>(null);
  const [directLinkData, setDirectLinkData] = useState<{ directUrl: string; directToken: string } | null>(null);
  const [isLoadingDirectLink, setIsLoadingDirectLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [prefillName, setPrefillName] = useState('');
  const [prefillDni, setPrefillDni] = useState('');
  const [prefillRelationship, setPrefillRelationship] = useState('MADRE');
  const [prefillPhone, setPrefillPhone] = useState('');
  const [prefillEmail, setPrefillEmail] = useState('');
  const [isUpdatingPrefill, setIsUpdatingPrefill] = useState(false);
  const [isSendingInviteEmail, setIsSendingInviteEmail] = useState(false);
  const [prefillNotice, setPrefillNotice] = useState<ToastNotice | null>(null);

  // 2 decisiones oficiales para registro presencial (Anexo 05 Imágenes y Anexo 06 Desplazamientos, sin preselección)
  const [inPersonImage, setInPersonImage] = useState<boolean | null>(null);
  const [inPersonTravel, setInPersonTravel] = useState<boolean | null>(null);
  const [isRegisteringInPerson, setIsRegisteringInPerson] = useState(false);

  const lastSavedPrefillSignatureRef = useRef<string>('');
  const activeDirectPlayerIdRef = useRef<string | null>(null);
  const autoSaveAbortRef = useRef<AbortController | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushPendingDirectSaveRef = useRef<(silent?: boolean) => Promise<string | null>>(async () => null);
  const isClosingDirectRef = useRef<boolean>(false);

  // Selección múltiple (depurada automáticamente ante cambios de filtro)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // Modal de Lote + Envío paginado en bloques de 10
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchDirectConsentItem[]>([]);
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [copiedAllBatch, setCopiedAllBatch] = useState(false);
  const [copiedBatchId, setCopiedBatchId] = useState<string | null>(null);
  const [isSendingMassEmails, setIsSendingMassEmails] = useState(false);
  const [sendingBatchEmailId, setSendingBatchEmailId] = useState<string | null>(null);
  const [sentBatchEmailIds, setSentBatchEmailIds] = useState<string[]>([]);
  const [massEmailProgress, setMassEmailProgress] = useState<{
    currentChunk: number;
    totalChunks: number;
  } | null>(null);
  const [massEmailSummary, setMassEmailSummary] = useState<{
    sent: number;
    skippedNoEmail: number;
    failed: number;
    skippedNames: string[];
    failedItems: Array<{ playerId: string; playerName: string; error: string }>;
  } | null>(null);

  // Modal Censo Masivo (POST /api/admin/census)
  const [showCensusModal, setShowCensusModal] = useState(false);
  const [censusMode, setCensusMode] = useState<'CSV' | 'TABLE'>('CSV');
  const [censusCsvText, setCensusCsvText] = useState('');
  const [censusTableTeamId, setCensusTableTeamId] = useState<string>('');
  const [censusDraftRows, setCensusDraftRows] = useState<CensusDraftRow[]>([]);
  const [isSavingCensus, setIsSavingCensus] = useState(false);
  const [censusResult, setCensusResult] = useState<{
    success: boolean;
    updatedCount: number;
    skippedCount: number;
    errors: string[];
  } | null>(null);

  const directModalRef = useRef<HTMLDivElement | null>(null);
  const batchModalRef = useRef<HTMLDivElement | null>(null);
  const censusModalRef = useRef<HTMLDivElement | null>(null);
  const confirmModalRef = useRef<HTMLDivElement | null>(null);

  // Cargar dashboard
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/consent');
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json.data) {
        setData(json.data);
        setIsAuthenticated(true);
      } else {
        setLoadError(json?.error || 'Error al cargar los datos.');
      }
    } catch {
      setLoadError('Error de conexión al cargar datos.');
    } finally {
      setIsLoading(false);
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Filtrado y ordenación
  const filteredPlayers = useMemo(() => {
    if (!data) return [];
    const list = data.players.filter((p) => {
      if (selectedTeamFilter !== 'ALL' && p.teamId !== selectedTeamFilter) return false;
      if (statusFilter === 'SIGNED' && !p.isSigned) return false;
      if (statusFilter === 'PENDING' && (p.isSigned || p.isShredded)) return false;
      if (statusFilter === 'SHREDDED' && !p.isShredded) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.playerName.toLowerCase().includes(q);
        const matchDni = p.signerDni?.toLowerCase().includes(q);
        const matchDniLast5 = p.dniLast5?.toLowerCase().includes(q);
        const matchSigner = p.signerName?.toLowerCase().includes(q);
        if (!matchName && !matchDni && !matchDniLast5 && !matchSigner) return false;
      }
      return true;
    });

    if (!sortConfig.key) return list;

    const getSortRank = (p: PlayerDashboardItem): number => {
      if (sortConfig.key === 'status') return p.isShredded ? 2 : p.isSigned ? 1 : 0;
      if (sortConfig.key === 'image') {
        if (!p.isSigned) return 0;
        const allowed = Boolean(p.consentSocialMedia || p.consentStreaming || p.consentPress);
        return allowed ? 2 : 1;
      }
      if (sortConfig.key === 'travel') {
        if (!p.isSigned) return 0;
        return p.consentTravel === true ? 2 : 1;
      }
      if (sortConfig.key === 'method') {
        if (!p.isSigned) return 0;
        if (p.signatureMethod === 'PRESENCIAL') return 1;
        if (p.signatureMethod === 'DIGITAL_WEB') return 2;
        if (p.signatureMethod === 'OTP_EMAIL') return 3;
        return 2;
      }
      return 0;
    };

    return [...list].sort((a, b) => {
      const rankA = getSortRank(a);
      const rankB = getSortRank(b);
      if (rankA !== rankB) return sortConfig.direction === 'asc' ? rankA - rankB : rankB - rankA;
      return a.playerName.localeCompare(b.playerName, 'es');
    });
  }, [data, selectedTeamFilter, statusFilter, searchQuery, sortConfig]);

  // SEGURIDAD LOTE: Depurar selectedPlayerIds al cambiar filtros o lista visible para evitar envíos a jugadores ocultos
  useEffect(() => {
    const visibleSet = new Set(filteredPlayers.map((p) => p.playerId));
    setSelectedPlayerIds((prev) => {
      const next = prev.filter((id) => visibleSet.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [filteredPlayers]);

  const closeDirectModal = useCallback(async () => {
    if (isClosingDirectRef.current) return;
    isClosingDirectRef.current = true;
    try {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      if (directLinkPlayer && activeDirectPlayerIdRef.current === directLinkPlayer.playerId) {
        const dniTrim = prefillDni.trim().toUpperCase();
        const emailTrim = prefillEmail.trim().toLowerCase();
        const hasDniError = Boolean(dniTrim && !isValidSpanishDniOrNie(dniTrim));
        const hasEmailError = Boolean(emailTrim && !isStrictEmail(emailTrim));
        if (!hasDniError && !hasEmailError) {
          await flushPendingDirectSaveRef.current(true).catch(() => null);
        } else {
          // Guardado parcial no destructivo: persiste campos válidos (ej. correo o teléfono) ignorando el campo inválido
          const validPartialPrefill: Record<string, string> = {
            signerName: directLinkPlayer.isMinor ? prefillName.trim() : directLinkPlayer.playerName,
            signerRelationship: directLinkPlayer.isMinor ? prefillRelationship : 'PROPIO_JUGADOR',
            signerPhone: prefillPhone.trim(),
            ...(!hasDniError && dniTrim ? { signerDni: dniTrim } : {}),
            ...(!hasEmailError ? { signerEmail: emailTrim } : {}),
          };
          await fetch('/api/admin/direct-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: directLinkPlayer.playerId,
              customPrefill: validPartialPrefill,
            }),
          }).catch(() => null);
        }
      }
      activeDirectPlayerIdRef.current = null;
      autoSaveAbortRef.current?.abort();
      setDirectLinkPlayer(null);
      setDirectLinkData(null);
      setPrefillNotice(null);
      loadDashboardData();
    } finally {
      isClosingDirectRef.current = false;
    }
  }, [directLinkPlayer, prefillDni, prefillEmail, loadDashboardData]);

  const closeBatchModal = useCallback(() => {
    setShowBatchModal(false);
    setBatchItems([]);
    setBatchSearchQuery('');
  }, []);

  const closeCensusModal = useCallback(() => {
    setShowCensusModal(false);
    setCensusResult(null);
  }, []);

  const closeConfirmDialog = useCallback(() => {
    if (!isConfirmingAction) setConfirmDialog(null);
  }, [isConfirmingAction]);

  useModalFocusTrap(Boolean(directLinkPlayer), directModalRef, closeDirectModal);
  useModalFocusTrap(showBatchModal, batchModalRef, closeBatchModal);
  useModalFocusTrap(showCensusModal, censusModalRef, closeCensusModal);
  useModalFocusTrap(Boolean(confirmDialog), confirmModalRef, closeConfirmDialog);

  // Abrir modal de ficha + enlace directo cargando detalle bajo demanda
  const handleOpenDirectLinkModal = async (player: PlayerDashboardItem) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    isClosingDirectRef.current = false;
    autoSaveAbortRef.current?.abort();
    activeDirectPlayerIdRef.current = player.playerId;
    setDirectLinkPlayer(player);
    setDirectLinkData(null);
    setCopiedLink(false);
    setPrefillNotice(null);
    setInPersonImage(null);
    setInPersonTravel(null);
    setIsLoadingDirectLink(true);

    try {
      const res = await fetch('/api/admin/direct-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.playerId }),
      });
      const json = await res.json().catch(() => null);
      if (activeDirectPlayerIdRef.current !== player.playerId) return;

      if (res.ok && json?.success) {
        setDirectLinkData({
          directUrl: json.directUrl,
          directToken: json.directToken,
        });
        const pre = json.prefilledData || {};
        const initName = player.isMinor ? pre.signerName || '' : player.playerName;
        const initDni = pre.signerDni || '';
        const initRel = player.isMinor ? pre.signerRelationship || 'MADRE' : 'PROPIO_JUGADOR';
        const initPhone = pre.signerPhone || '';
        const initEmail = pre.signerEmail || '';

        setPrefillName(initName);
        setPrefillDni(initDni);
        setPrefillRelationship(initRel);
        setPrefillPhone(initPhone);
        setPrefillEmail(initEmail);

        lastSavedPrefillSignatureRef.current = JSON.stringify({
          playerId: player.playerId,
          signerName: initName.trim(),
          signerDni: initDni.trim().toUpperCase(),
          signerRelationship: initRel,
          signerPhone: initPhone.trim(),
          signerEmail: initEmail.trim().toLowerCase(),
        });
      } else {
        showToast('error', json?.error || 'Error al generar el enlace directo.');
      }
    } catch {
      showToast('error', 'Error de conexión al generar el enlace directo.');
    } finally {
      if (activeDirectPlayerIdRef.current === player.playerId) {
        setIsLoadingDirectLink(false);
      }
    }
  };

  // Guardar prefill en censo con protección AbortController contra race condition (450ms)
  const handleUpdateDirectLink = useCallback(
    async (silent: boolean = false): Promise<{ ok: boolean; directUrl?: string }> => {
      if (!directLinkPlayer) return { ok: false };
      const targetPlayerId = directLinkPlayer.playerId;

      const dniTrim = prefillDni.trim().toUpperCase();
      if (dniTrim && !isValidSpanishDniOrNie(dniTrim)) {
        setPrefillNotice({ kind: 'error', message: 'El DNI/NIE del firmante no es válido.' });
        return { ok: false };
      }

      const emailTrim = prefillEmail.trim().toLowerCase();
      if (emailTrim && !isStrictEmail(emailTrim)) {
        setPrefillNotice({ kind: 'error', message: 'El formato del correo electrónico no es válido.' });
        return { ok: false };
      }

      autoSaveAbortRef.current?.abort();
      const controller = new AbortController();
      autoSaveAbortRef.current = controller;

      setIsUpdatingPrefill(true);
      setPrefillNotice(null);

      const effectiveName = directLinkPlayer.isMinor ? prefillName.trim() : directLinkPlayer.playerName;
      const effectiveRel = directLinkPlayer.isMinor ? prefillRelationship : 'PROPIO_JUGADOR';
      const payloadPrefill = {
        signerName: effectiveName,
        ...(dniTrim ? { signerDni: dniTrim } : {}),
        signerRelationship: effectiveRel,
        signerPhone: prefillPhone.trim(),
        signerEmail: emailTrim,
      };

      try {
        const res = await fetch('/api/admin/direct-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            playerId: targetPlayerId,
            customPrefill: payloadPrefill,
          }),
        });
        const json = await res.json().catch(() => null);
        if (controller.signal.aborted || activeDirectPlayerIdRef.current !== targetPlayerId) {
          return { ok: false };
        }

        if (res.ok && json?.success) {
          lastSavedPrefillSignatureRef.current = JSON.stringify({
            playerId: targetPlayerId,
            signerName: effectiveName,
            signerDni: dniTrim,
            signerRelationship: effectiveRel,
            signerPhone: prefillPhone.trim(),
            signerEmail: emailTrim,
          });
          setDirectLinkData({
            directUrl: json.directUrl,
            directToken: json.directToken,
          });
          if (!silent) {
            setPrefillNotice({
              kind: 'success',
              message: 'Datos guardados en el censo y enlace directo actualizado.',
            });
          }
          return { ok: true, directUrl: json.directUrl };
        }
        setPrefillNotice({ kind: 'error', message: json?.error || 'Error al guardar ficha.' });
        return { ok: false };
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return { ok: false };
        if (activeDirectPlayerIdRef.current === targetPlayerId) {
          setPrefillNotice({ kind: 'error', message: 'Error de conexión al guardar la ficha.' });
        }
        return { ok: false };
      } finally {
        if (!controller.signal.aborted && activeDirectPlayerIdRef.current === targetPlayerId) {
          setIsUpdatingPrefill(false);
        }
      }
    },
    [directLinkPlayer, prefillName, prefillDni, prefillRelationship, prefillPhone, prefillEmail]
  );

  const isDirectPrefillDirty = useCallback((): boolean => {
    if (!directLinkPlayer || !directLinkData) return false;
    const currentSig = JSON.stringify({
      playerId: directLinkPlayer.playerId,
      signerName: (directLinkPlayer.isMinor ? prefillName : directLinkPlayer.playerName).trim(),
      signerDni: prefillDni.trim().toUpperCase(),
      signerRelationship: directLinkPlayer.isMinor ? prefillRelationship : 'PROPIO_JUGADOR',
      signerPhone: prefillPhone.trim(),
      signerEmail: prefillEmail.trim().toLowerCase(),
    });
    return currentSig !== lastSavedPrefillSignatureRef.current;
  }, [directLinkPlayer, directLinkData, prefillName, prefillDni, prefillRelationship, prefillPhone, prefillEmail]);

  // Flush sincronizado para Copy / Abrir / Cerrar si hay cambios pendientes válidos
  const flushPendingDirectSave = useCallback(
    async (silent: boolean = false): Promise<string | null> => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      if (!directLinkPlayer || !directLinkData) return directLinkData?.directUrl || null;
      if (!isDirectPrefillDirty()) {
        return directLinkData.directUrl;
      }
      const res = await handleUpdateDirectLink(silent);
      return res.ok ? res.directUrl || directLinkData.directUrl : null;
    },
    [directLinkPlayer, directLinkData, isDirectPrefillDirty, handleUpdateDirectLink]
  );

  useEffect(() => {
    flushPendingDirectSaveRef.current = flushPendingDirectSave;
  }, [flushPendingDirectSave]);

  // Auto-save 450ms con cleanup estricto de timer y AbortController
  useEffect(() => {
    if (!directLinkPlayer || isLoadingDirectLink || !directLinkData) return;

    const currentSig = JSON.stringify({
      playerId: directLinkPlayer.playerId,
      signerName: (directLinkPlayer.isMinor ? prefillName : directLinkPlayer.playerName).trim(),
      signerDni: prefillDni.trim().toUpperCase(),
      signerRelationship: directLinkPlayer.isMinor ? prefillRelationship : 'PROPIO_JUGADOR',
      signerPhone: prefillPhone.trim(),
      signerEmail: prefillEmail.trim().toLowerCase(),
    });
    if (currentSig === lastSavedPrefillSignatureRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      handleUpdateDirectLink(true);
    }, 450);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      autoSaveAbortRef.current?.abort();
    };
  }, [
    directLinkPlayer,
    directLinkData,
    isLoadingDirectLink,
    prefillName,
    prefillDni,
    prefillRelationship,
    prefillPhone,
    prefillEmail,
    handleUpdateDirectLink,
  ]);

  // Enviar email individual desde el modal de ficha
  const handleSendDirectLinkEmail = async () => {
    if (!directLinkPlayer) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    autoSaveAbortRef.current?.abort();

    const dniClean = prefillDni.trim().toUpperCase();
    if (dniClean && !isValidSpanishDniOrNie(dniClean)) {
      setPrefillNotice({ kind: 'error', message: 'El DNI/NIE del firmante no es válido.' });
      return;
    }

    const emailClean = prefillEmail.trim().toLowerCase();
    if (!emailClean || !isStrictEmail(emailClean)) {
      setPrefillNotice({ kind: 'error', message: 'Introduce un correo electrónico válido para enviar la solicitud.' });
      return;
    }

    setIsSendingInviteEmail(true);
    setPrefillNotice(null);

    const payloadPrefill = {
      signerName: directLinkPlayer.isMinor ? prefillName.trim() : directLinkPlayer.playerName,
      ...(dniClean ? { signerDni: dniClean } : {}),
      signerRelationship: directLinkPlayer.isMinor ? prefillRelationship : 'PROPIO_JUGADOR',
      signerPhone: prefillPhone.trim(),
      signerEmail: emailClean,
    };

    try {
      const res = await fetch('/api/admin/direct-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: directLinkPlayer.playerId,
          customPrefill: payloadPrefill,
          sendEmail: true,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json.emailSent) {
        lastSavedPrefillSignatureRef.current = JSON.stringify({
          playerId: directLinkPlayer.playerId,
          ...payloadPrefill,
        });
        setDirectLinkData({
          directUrl: json.directUrl,
          directToken: json.directToken,
        });
        setPrefillNotice({
          kind: 'success',
          message: `Solicitud e instrucciones enviadas a ${emailClean} desde ${CLUB_INFO.contactEmail}.`,
        });
      } else {
        setPrefillNotice({ kind: 'error', message: json?.error || 'No se pudo enviar el correo electrónico.' });
      }
    } catch {
      setPrefillNotice({ kind: 'error', message: 'Error de conexión al enviar correo.' });
    } finally {
      setIsSendingInviteEmail(false);
    }
  };

  // Descargar PDF presencial en blanco con carga dinámica
  const handleDownloadDraftPdf = async () => {
    if (!directLinkPlayer) return;
    const { generateConsentPdf } = await import('@/lib/pdf-consent');
    const doc = generateConsentPdf({
      playerName: directLinkPlayer.playerName,
      teamName: directLinkPlayer.teamName,
      birthYear: directLinkPlayer.birthYear,
      isMinor: directLinkPlayer.isMinor,
      isMinor14To17: directLinkPlayer.isMinor14To17,
      signerName: prefillName.trim(),
      signerDni: prefillDni.trim().toUpperCase(),
      signerRelationship: prefillRelationship,
      signerPhone: prefillPhone.trim(),
      signerEmail: prefillEmail.trim(),
      signatureMethod: 'PRESENCIAL',
      isPrintableBlank: true,
    });
    const safeName = directLinkPlayer.playerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    doc.save(`autorizacion_presencial_${safeName}.pdf`);
  };

  // Registrar firma presencial con 4 permisos granulares
  const handleRegisterInPerson = async () => {
    if (!directLinkPlayer) return;
    const cleanName = prefillName.trim();
    const cleanDni = prefillDni.trim().toUpperCase();
    const cleanEmail = prefillEmail.trim().toLowerCase();

    if (cleanName.length < 2) {
      setPrefillNotice({ kind: 'error', message: 'Indica el nombre completo del firmante antes de registrar.' });
      return;
    }
    if (!isValidSpanishDniOrNie(cleanDni)) {
      setPrefillNotice({ kind: 'error', message: 'Introduce un DNI/NIE o pasaporte válido del firmante.' });
      return;
    }
    if (cleanEmail && !isStrictEmail(cleanEmail)) {
      setPrefillNotice({ kind: 'error', message: 'El formato del correo electrónico no es válido.' });
      return;
    }

    if (inPersonImage === null || inPersonTravel === null) {
      setPrefillNotice({
        kind: 'error',
        message:
          'Debes marcar de forma expresa Autoriza o No autoriza tanto en Imágenes como en Desplazamientos.',
      });
      return;
    }

    setIsRegisteringInPerson(true);
    setPrefillNotice(null);
    try {
      const res = await fetch('/api/admin/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'in_person',
          playerId: directLinkPlayer.playerId,
          signerName: cleanName,
          signerDni: cleanDni,
          signerRelationship: prefillRelationship,
          signerPhone: prefillPhone.trim(),
          signerEmail: cleanEmail,
          consentImage: inPersonImage,
          consentSocialMedia: inPersonImage,
          consentStreaming: inPersonImage,
          consentPress: inPersonImage,
          consentTravel: inPersonTravel,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setDirectLinkPlayer((prev) =>
          prev
            ? {
                ...prev,
                isSigned: true,
                signatureMethod: 'PRESENCIAL',
                signerName: cleanName,
                consentSocialMedia: inPersonImage,
                consentStreaming: inPersonImage,
                consentPress: inPersonImage,
                consentTravel: inPersonTravel,
              }
            : prev
        );
        setPrefillNotice({
          kind: 'success',
          message: 'Firma presencial registrada en custodia oficial (Método: PRESENCIAL).',
        });
        loadDashboardData();
      } else {
        setPrefillNotice({ kind: 'error', message: json?.error || 'Error al registrar firma presencial.' });
      }
    } catch {
      setPrefillNotice({ kind: 'error', message: 'Error de conexión al registrar firma presencial.' });
    } finally {
      setIsRegisteringInPerson(false);
    }
  };

  // Descargar PDF oficial bajo demanda (GET /api/admin/consent?playerId=...)
  const handleDownloadPdf = async (player: PlayerDashboardItem) => {
    if (!player.isSigned || player.isShredded) return;
    setDownloadingPdfId(player.playerId);
    try {
      const res = await fetch(`/api/admin/consent?playerId=${encodeURIComponent(player.playerId)}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json.detail) {
        showToast('error', json?.error || 'No se pudo recuperar el detalle completo del consentimiento.');
        return;
      }

      const detail = json.detail as AdminConsentDetailData;
      const { generateConsentPdf } = await import('@/lib/pdf-consent');
      const doc = generateConsentPdf({
        consentId: detail.consentId,
        playerName: detail.playerName,
        teamName: detail.teamName,
        birthYear: detail.birthYear,
        birthDate: detail.birthDate,
        isMinor: detail.signedIsMinor ?? detail.isMinor,
        isMinor14To17: detail.signedIsMinor14To17 ?? false,
        signerName: detail.signerName || '',
        signerDni: detail.signerDni || '',
        signerRelationship: detail.signerRelationship || '',
        signerPhone: detail.signerPhone,
        signerEmail: detail.signerEmail,
        minorSignerName: detail.minorSignerName,
        minorSignerDni: detail.minorSignerDni,
        minorSignatureData: detail.minorSignatureData,
        consentSocialMedia: detail.consentSocialMedia === true,
        consentStreaming: detail.consentStreaming === true,
        consentPress: detail.consentPress === true,
        consentTravel: detail.consentTravel === true,
        signatureData: detail.signatureData,
        signatureMethod: detail.signatureMethod,
        documentHash: detail.documentHash,
        signedAt: detail.signedAt,
      });
      const safeName = detail.playerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      doc.save(`autorizaciones_junta_andalucia_${safeName}.pdf`);
      showToast('success', `Resguardo PDF generado para ${detail.playerName}.`);
    } catch {
      showToast('error', 'Error de conexión al descargar el resguardo PDF.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Revocar autorización vía diálogo modal accesible
  const requestRevoke = (player: PlayerDashboardItem) => {
    setConfirmDialog({
      title: 'Revocar Autorización (Art. 7.3 RGPD)',
      description: `¿Deseas revocar la autorización vigente de ${player.playerName}? Se registrará el evento de revocación en auditoría y la ficha volverá a figurar como PENDIENTE.`,
      confirmLabel: 'Sí, revocar autorización',
      danger: false,
      onConfirm: async () => {
        const res = await fetch('/api/admin/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'revoke', playerId: player.playerId }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          showToast('error', json?.error || 'Error al revocar la autorización.');
          return;
        }
        showToast('success', `Autorización de ${player.playerName} revocada correctamente.`);
        loadDashboardData();
      },
    });
  };

  // Supresión RGPD Art. 17 (Crypto-Shredding) vía diálogo modal accesible
  const requestShred = (player: PlayerDashboardItem) => {
    setConfirmDialog({
      title: 'Supresión RGPD Art. 17 (Crypto-Shredding)',
      description: `ATENCIÓN: Esta acción destruirá irreversiblemente la clave criptográfica de ${player.playerName}, anonimizará el consentimiento y dejará la ficha marcada como "Suprimido Art. 17". Esta operación no se puede deshacer.`,
      confirmLabel: 'Confirmar supresión irreversible',
      danger: true,
      onConfirm: async () => {
        const res = await fetch('/api/admin/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'shred',
            playerId: player.playerId,
            confirmShred: true,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          showToast('error', json?.error || 'Error al ejecutar la supresión RGPD.');
          return;
        }
        showToast('success', `Supresión criptográfica completada para ${player.playerName} (Art. 17 RGPD).`);
        loadDashboardData();
      },
    });
  };

  // Envío masivo por correo PAGINADO en bloques de 10 destinatarios por petición
  const handleSendMassEmails = async (
    targetPlayerIds?: string[],
    skipLargeBatchConfirm: boolean = false
  ) => {
    const rawIds = targetPlayerIds && targetPlayerIds.length > 0 ? targetPlayerIds : selectedPlayerIds;
    const eligibleSet = new Set(
      (data?.players || [])
        .filter((p) => !p.isSigned && !p.isShredded)
        .map((p) => p.playerId)
    );
    const ids = Array.from(new Set(rawIds)).filter((id) =>
      data?.players ? eligibleSet.has(id) : true
    );
    if (ids.length === 0) {
      showToast(
        'info',
        'No hay deportistas pendientes seleccionables para enviar (los firmados o suprimidos se omiten).'
      );
      return;
    }

    if (!skipLargeBatchConfirm && ids.length > 200) {
      setConfirmDialog({
        title: `Lote extenso (${ids.length} destinatarios)`,
        description:
          `Vas a enviar ${ids.length} invitaciones por correo en bloques de 10. Ten en cuenta los límites diarios de envío SMTP de Zoho Mail para evitar bloqueos temporales. ¿Deseas continuar con el envío?`,
        confirmLabel: 'Sí, iniciar envío',
        danger: false,
        onConfirm: async () => {
          void handleSendMassEmails(ids, true);
        },
      });
      return;
    }

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += EMAIL_BATCH_CHUNK_SIZE) {
      chunks.push(ids.slice(i, i + EMAIL_BATCH_CHUNK_SIZE));
    }

    setIsSendingMassEmails(true);
    setMassEmailProgress({ currentChunk: 0, totalChunks: chunks.length });
    setMassEmailSummary(null);

    let totalSent = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const allSentIds: string[] = [];
    const allSkippedNames: string[] = [];
    const allFailedItems: Array<{ playerId: string; playerName: string; error: string }> = [];
    const updatedBatchMap = new Map<string, BatchDirectConsentItem>();

    try {
      for (let idx = 0; idx < chunks.length; idx++) {
        setMassEmailProgress({ currentChunk: idx + 1, totalChunks: chunks.length });
        const chunkIds = chunks[idx];

        const res = await fetch('/api/admin/direct-link-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerIds: chunkIds, sendEmails: true }),
        });
        const json = await res.json().catch(() => null);

        if (res.ok && json?.success && json.emailSummary) {
          const s = json.emailSummary;
          totalSent += s.sent || 0;
          totalSkipped += s.skippedNoEmail || 0;
          totalFailed += s.failed || 0;
          if (Array.isArray(s.sentPlayerIds)) allSentIds.push(...s.sentPlayerIds);
          if (Array.isArray(s.skippedPlayers)) {
            allSkippedNames.push(...s.skippedPlayers.map((p: { playerName: string }) => p.playerName));
          }
          if (Array.isArray(s.failedPlayers)) {
            allFailedItems.push(...s.failedPlayers);
          }
          if (Array.isArray(json.items)) {
            json.items.forEach((it: BatchDirectConsentItem) => updatedBatchMap.set(it.playerId, it));
          }
        } else {
          totalFailed += chunkIds.length;
          const errMsg = json?.error || 'Error enviando bloque de correos.';
          chunkIds.forEach((cid) => {
            const pObj = data?.players.find((pl) => pl.playerId === cid);
            allFailedItems.push({
              playerId: cid,
              playerName: pObj?.playerName || cid,
              error: errMsg,
            });
          });
        }
      }

      if (allSentIds.length > 0) {
        setSentBatchEmailIds((prev) => Array.from(new Set([...prev, ...allSentIds])));
      }
      if (updatedBatchMap.size > 0 && showBatchModal) {
        setBatchItems((prev) => prev.map((it) => updatedBatchMap.get(it.playerId) || it));
      }

      setMassEmailSummary({
        sent: totalSent,
        skippedNoEmail: totalSkipped,
        failed: totalFailed,
        skippedNames: allSkippedNames,
        failedItems: allFailedItems,
      });
      showToast(
        totalFailed > 0 ? 'info' : 'success',
        `Envío completado: ${totalSent} enviados, ${totalSkipped} sin correo, ${totalFailed} fallidos.`
      );
    } catch {
      showToast('error', 'Error de conexión durante el envío paginado por correo.');
    } finally {
      setIsSendingMassEmails(false);
      setMassEmailProgress(null);
    }
  };

  const handleSendBatchItemEmail = async (item: BatchDirectConsentItem) => {
    if (item.isSigned || item.isShredded) {
      showToast('info', `${item.playerName} ya no está pendiente de autorización.`);
      return;
    }
    if (!item.signerEmail || !isStrictEmail(item.signerEmail)) {
      showToast(
        'error',
        `${item.playerName} no tiene correo válido en el censo. Ábrelo primero para añadir su email.`
      );
      return;
    }
    setSendingBatchEmailId(item.playerId);
    try {
      const res = await fetch('/api/admin/direct-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: item.playerId, sendEmail: true }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json.emailSent) {
        setSentBatchEmailIds((prev) => Array.from(new Set([...prev, item.playerId])));
        showToast('success', `Invitación enviada a ${item.signerEmail}.`);
      } else {
        showToast('error', json?.error || 'No se pudo enviar el correo.');
      }
    } catch {
      showToast('error', 'Error de conexión al enviar correo.');
    } finally {
      setSendingBatchEmailId(null);
    }
  };

  const filteredBatchItems = useMemo(() => {
    if (!batchSearchQuery.trim()) return batchItems;
    const q = batchSearchQuery.toLowerCase().trim();
    return batchItems.filter(
      (it) =>
        it.playerName.toLowerCase().includes(q) ||
        it.teamName.toLowerCase().includes(q) ||
        it.signerName?.toLowerCase().includes(q) ||
        it.signerEmail?.toLowerCase().includes(q) ||
        it.signerPhone?.includes(q)
    );
  }, [batchItems, batchSearchQuery]);

  const handleToggleSelectPlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedPlayerIds.length === filteredPlayers.length && filteredPlayers.length > 0) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(filteredPlayers.map((p) => p.playerId));
    }
  };

  // Abrir modal de lote (generación enlaces <=200 por petición)
  const handleOpenBatchModal = async (customIds?: string[]) => {
    const idsToFetch =
      customIds && customIds.length > 0
        ? customIds
        : selectedPlayerIds.length > 0
          ? selectedPlayerIds
          : filteredPlayers.map((p) => p.playerId);

    if (idsToFetch.length === 0) {
      showToast('error', 'Selecciona al menos un deportista o filtra por un equipo.');
      return;
    }

    setShowBatchModal(true);
    setIsLoadingBatch(true);
    setBatchItems([]);
    setBatchSearchQuery('');
    setCopiedAllBatch(false);
    setSentBatchEmailIds([]);
    setMassEmailSummary(null);

    try {
      const res = await fetch('/api/admin/direct-link-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: idsToFetch.slice(0, 200) }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && Array.isArray(json.items)) {
        setBatchItems(json.items);
      } else {
        showToast('error', json?.error || 'Error al generar enlaces por lote.');
      }
    } catch {
      showToast('error', 'Error de conexión al generar lote de enlaces directos.');
    } finally {
      setIsLoadingBatch(false);
    }
  };

  // CSV seguro de lote con escapeCsvCell y fecha Europe/Madrid
  const handleExportBatchCsv = () => {
    if (batchItems.length === 0) return;

    const headers = [
      'Equipo',
      'Deportista',
      'Condición',
      'Estado Firma',
      'Firmante / Tutor',
      'DNI Firmante',
      'Parentesco',
      'Teléfono Móvil',
      'Correo Electrónico',
      'Enlace Directo Oficial',
    ].map(escapeCsvCell);

    const rows = batchItems.map((item) =>
      [
        item.teamName,
        item.playerName,
        item.isMinor ? 'Menor' : 'Mayor (+18)',
        item.isSigned ? 'FIRMADO' : 'PENDIENTE',
        item.signerName || '',
        item.signerDni || '',
        item.signerRelationship || '',
        item.signerPhone || '',
        item.signerEmail || '',
        item.directUrl,
      ].map(escapeCsvCell)
    );

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lote_enlaces_autorizaciones_${formatMadridDateString(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAllBatchMessages = async () => {
    if (batchItems.length === 0) return;
    const text = batchItems
      .map(
        (it) =>
          `${it.playerName} (${it.teamName}) - ${it.isSigned ? 'COMPLETADO' : 'PENDIENTE'}\n` +
          `Firmante: ${it.signerName || 'Familia'} (${it.signerRelationship})` +
          (it.signerEmail ? ` · Email: ${it.signerEmail}` : '') +
          `\nEnlace: ${it.directUrl}`
      )
      .join('\n\n');

    try {
      await navigator.clipboard?.writeText(text);
      setCopiedAllBatch(true);
      setTimeout(() => setCopiedAllBatch(false), 3000);
    } catch {
      showToast('error', 'No se pudo copiar al portapapeles.');
    }
  };

  // CSV seguro del censo completo con escapeCsvCell y fecha Europe/Madrid
  const handleExportCsv = () => {
    if (!data) return;

    const headers = [
      'Equipo',
      'Deportista',
      'Año Nacimiento',
      'Condición',
      'Ficha DNI (últimos 4+letra)',
      'Estado Firma',
      'Integridad',
      'Método Firma',
      'Fecha Firma',
      'Nombre Firmante',
      'DNI Firmante (máscara)',
      'Parentesco',
      'Imagen',
      'Desplazamientos',
      'Hash HMAC-SHA256',
    ].map(escapeCsvCell);

    const rows = filteredPlayers.map((p) => {
      const hasMixedImage =
        p.consentSocialMedia !== p.consentStreaming ||
        p.consentStreaming !== p.consentPress;
      const imageCsvValue = p.isSigned
        ? hasMixedImage
          ? `MIXTO (Web:${p.consentSocialMedia ? 'SI' : 'NO'} Stream:${p.consentStreaming ? 'SI' : 'NO'} Prensa:${p.consentPress ? 'SI' : 'NO'})`
          : p.consentSocialMedia === true
            ? 'SI'
            : 'NO'
        : '';

      return [
        p.teamName,
        p.playerName,
        p.birthYear || '',
        p.isMinor ? (p.isMinor14To17 ? 'Menor 14-17' : 'Menor <14') : 'Mayor (+18)',
        p.dniLast5 || '',
        p.isShredded ? 'SUPRIMIDO_ART17' : p.isSigned ? 'COMPLETADO' : 'PENDIENTE',
        p.isSigned ? (p.integrityVerified === false ? 'ALERTA_INTEGRIDAD' : 'VERIFICADO') : '',
        p.isSigned
          ? p.signatureMethod === 'OTP_EMAIL'
            ? 'DIGITAL + OTP'
            : p.signatureMethod === 'PRESENCIAL'
              ? 'PRESENCIAL'
              : 'DIGITAL WEB'
          : '',
        p.signedAt ? new Date(p.signedAt).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }) : '',
        p.signerName || '',
        p.signerDni || '',
        p.signerRelationship || '',
        imageCsvValue,
        p.isSigned ? (p.consentTravel === true ? 'SI' : 'NO') : '',
        p.documentHash || '',
      ].map(escapeCsvCell);
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `censo_autorizaciones_cdv_${formatMadridDateString(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // === CENSO MASIVO (/api/admin/census) ===
  const openCensusModal = () => {
    const defaultTeam =
      selectedTeamFilter !== 'ALL'
        ? selectedTeamFilter
        : data?.teams[0]?.teamId || '';
    setCensusTableTeamId(defaultTeam);
    setCensusResult(null);
    if (data && defaultTeam) {
      setCensusDraftRows(
        data.players
          .filter((p) => p.teamId === defaultTeam)
          .map((p) => ({
            playerId: p.playerId,
            playerName: p.playerName,
            teamName: p.teamName,
            isMinor: p.isMinor,
            dni: '',
            birthDate: '',
            contactEmail: '',
            contactPhone: '',
            parentName: '',
            parentDni: '',
            parentRelationship: '',
          }))
      );
    } else {
      setCensusDraftRows([]);
    }
    setShowCensusModal(true);
  };

  const handleCensusTeamSwitch = (teamId: string) => {
    setCensusTableTeamId(teamId);
    setCensusResult(null);
    if (!data) return;
    setCensusDraftRows(
      data.players
        .filter((p) => p.teamId === teamId)
        .map((p) => ({
          playerId: p.playerId,
          playerName: p.playerName,
          teamName: p.teamName,
          isMinor: p.isMinor,
          dni: '',
          birthDate: '',
          contactEmail: '',
          contactPhone: '',
          parentName: '',
          parentDni: '',
          parentRelationship: '',
        }))
    );
  };

  const handleDownloadCensusTemplateCsv = () => {
    if (!data) return;
    const headers = [
      'playerId',
      'Deportista',
      'Equipo',
      'dni',
      'birthDate',
      'contactEmail',
      'contactPhone',
      'parentName',
      'parentDni',
      'parentRelationship',
    ].map(escapeCsvCell);

    const list =
      selectedTeamFilter !== 'ALL'
        ? data.players.filter((p) => p.teamId === selectedTeamFilter)
        : data.players;

    const rows = list.map((p) =>
      [
        p.playerId,
        p.playerName,
        p.teamName,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ].map(escapeCsvCell)
    );

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plantilla_censo_cdv_${formatMadridDateString(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCensusCsvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setCensusCsvText(text);
      setCensusResult(null);
    } catch {
      showToast('error', 'No se pudo leer el archivo CSV seleccionado.');
    }
    e.target.value = '';
  };

  const handleSaveCensusBatch = async () => {
    setCensusResult(null);
    const itemsToSend: Array<{
      playerId: string;
      dni?: string;
      birthDate?: string;
      contactEmail?: string;
      contactPhone?: string;
      parentName?: string;
      parentDni?: string;
      parentRelationship?: string;
    }> = [];

    if (censusMode === 'TABLE') {
      for (const row of censusDraftRows) {
        const hasAny =
          row.dni.trim() ||
          row.birthDate.trim() ||
          row.contactEmail.trim() ||
          row.contactPhone.trim() ||
          row.parentName.trim() ||
          row.parentDni.trim() ||
          row.parentRelationship.trim();
        if (!hasAny) continue;

        if (row.dni.trim() && !isValidSpanishDniOrNie(row.dni.trim())) {
          showToast('error', `DNI/NIE de ${row.playerName} no válido: ${row.dni}`);
          return;
        }
        if (row.parentDni.trim() && !isValidSpanishDniOrNie(row.parentDni.trim())) {
          showToast('error', `DNI/NIE de tutor de ${row.playerName} no válido: ${row.parentDni}`);
          return;
        }
        if (row.contactEmail.trim() && !isStrictEmail(row.contactEmail.trim())) {
          showToast('error', `Correo de ${row.playerName} no válido: ${row.contactEmail}`);
          return;
        }

        itemsToSend.push({
          playerId: row.playerId,
          ...(row.dni.trim() ? { dni: row.dni.trim().toUpperCase() } : {}),
          ...(row.birthDate.trim() ? { birthDate: row.birthDate.trim() } : {}),
          ...(row.contactEmail.trim() ? { contactEmail: row.contactEmail.trim().toLowerCase() } : {}),
          ...(row.contactPhone.trim() ? { contactPhone: row.contactPhone.trim() } : {}),
          ...(row.parentName.trim() ? { parentName: row.parentName.trim() } : {}),
          ...(row.parentDni.trim() ? { parentDni: row.parentDni.trim().toUpperCase() } : {}),
          ...(row.parentRelationship ? { parentRelationship: row.parentRelationship } : {}),
        });
      }
    } else {
      const rawLines = censusCsvText
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (rawLines.length < 2) {
        showToast('error', 'Pega o carga un CSV con fila de cabecera y al menos un registro.');
        return;
      }

      const headerLine = rawLines[0];
      const delimiter = headerLine.includes(';') ? ';' : headerLine.includes('\t') ? '\t' : ',';
      const headers = parseDelimitedLine(headerLine, delimiter).map((h) =>
        h.toLowerCase().replace(/[^a-z0-9_]/g, '')
      );

      const idxPlayerId = headers.findIndex((h) => ['playerid', 'id'].includes(h));
      const idxDni = headers.findIndex((h) => ['dni', 'nie', 'documento'].includes(h));
      const idxBirth = headers.findIndex((h) => ['birthdate', 'fechanacimiento', 'nacimiento'].includes(h));
      const idxEmail = headers.findIndex((h) => ['contactemail', 'email', 'correo'].includes(h));
      const idxPhone = headers.findIndex((h) => ['contactphone', 'phone', 'telefono', 'movil'].includes(h));
      const idxParentName = headers.findIndex((h) => ['parentname', 'tutor', 'firmante'].includes(h));
      const idxParentDni = headers.findIndex((h) => ['parentdni', 'dnitutor'].includes(h));
      const idxParentRel = headers.findIndex((h) => ['parentrelationship', 'parentesco'].includes(h));

      if (idxPlayerId === -1) {
        showToast('error', 'El CSV debe incluir la columna "playerId". Descarga la plantilla para ver el formato exacto.');
        return;
      }

      for (let i = 1; i < rawLines.length; i++) {
        const cols = parseDelimitedLine(rawLines[i], delimiter);
        const pid = cols[idxPlayerId]?.trim() || '';
        if (!pid) continue;

        const dniVal = idxDni >= 0 ? cols[idxDni]?.trim().toUpperCase() || '' : '';
        const birthVal = idxBirth >= 0 ? cols[idxBirth]?.trim() || '' : '';
        const emailVal = idxEmail >= 0 ? cols[idxEmail]?.trim().toLowerCase() || '' : '';
        const phoneVal = idxPhone >= 0 ? cols[idxPhone]?.trim() || '' : '';
        const pNameVal = idxParentName >= 0 ? cols[idxParentName]?.trim() || '' : '';
        const pDniVal = idxParentDni >= 0 ? cols[idxParentDni]?.trim().toUpperCase() || '' : '';
        const pRelVal = idxParentRel >= 0 ? cols[idxParentRel]?.trim().toUpperCase() || '' : '';

        if (!dniVal && !birthVal && !emailVal && !phoneVal && !pNameVal && !pDniVal && !pRelVal) continue;

        itemsToSend.push({
          playerId: pid,
          ...(dniVal ? { dni: dniVal } : {}),
          ...(birthVal ? { birthDate: birthVal } : {}),
          ...(emailVal ? { contactEmail: emailVal } : {}),
          ...(phoneVal ? { contactPhone: phoneVal } : {}),
          ...(pNameVal ? { parentName: pNameVal } : {}),
          ...(pDniVal ? { parentDni: pDniVal } : {}),
          ...(pRelVal ? { parentRelationship: pRelVal } : {}),
        });
      }
    }

    if (itemsToSend.length === 0) {
      showToast('info', 'No hay filas con datos nuevos para guardar en el censo.');
      return;
    }

    setIsSavingCensus(true);
    let updatedTotal = 0;
    let skippedTotal = 0;
    const allErrors: string[] = [];

    try {
      for (let i = 0; i < itemsToSend.length; i += 200) {
        const chunk = itemsToSend.slice(i, i + 200);
        const res = await fetch('/api/admin/census', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: chunk }),
        });
        const json = await res.json().catch(() => null);
        if (json) {
          updatedTotal += json.updatedCount || 0;
          skippedTotal += json.skippedCount || 0;
          if (Array.isArray(json.errors)) allErrors.push(...json.errors);
          else if (!res.ok && json.error) allErrors.push(json.error);
        } else {
          allErrors.push('Error de respuesta del servidor al guardar el censo.');
        }
      }

      setCensusResult({
        success: updatedTotal > 0 && allErrors.length === 0,
        updatedCount: updatedTotal,
        skippedCount: skippedTotal,
        errors: allErrors,
      });
      if (updatedTotal > 0) {
        loadDashboardData();
      }
    } catch {
      showToast('error', 'Error de conexión al guardar la carga masiva del censo.');
    } finally {
      setIsSavingCensus(false);
    }
  };

  // Login / Logout
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameInput.trim(),
          password: passwordInput,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setUsernameInput('');
        setPasswordInput('');
        setIsAuthenticated(true);
        loadDashboardData();
      } else {
        setLoginError(json?.error || 'Usuario o contraseña incorrectos.');
      }
    } catch {
      setLoginError('Error de conexión.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setUsernameInput('');
    setPasswordInput('');
    setIsAuthenticated(false);
    setData(null);
  };

  const handleSort = (key: 'status' | 'image' | 'travel' | 'method') => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: 'asc' };
    });
  };

  if (checkingAuth) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center text-white">
        <div className="flex items-center gap-3 text-sm text-tertiary">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" aria-hidden="true" />
          <span>Verificando acceso a directiva...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-container-lowest border border-white/10 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary-container text-white rounded-xl flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold text-white uppercase tracking-wider">
              Acceso a Gestión Interna
            </h1>
            <p className="text-xs text-tertiary">
              Panel reservado para directiva y secretaría del {CLUB_INFO.name}.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-username" className="block text-xs font-bold text-white/85 uppercase tracking-wider mb-1.5">
                Usuario
              </label>
              <input
                id="admin-username"
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
                placeholder="admin"
                className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-bold text-white/85 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <input
                id="admin-password"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>

            {loginError && (
              <div role="alert" className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg flex items-center gap-2 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-primary-container hover:bg-cta-hover text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg cursor-pointer"
            >
              {isLoggingIn ? <span>Accediendo...</span> : <span>Iniciar Sesión</span>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pendingSelectedSet = new Set(
    (data?.players || []).filter((p) => !p.isSigned && !p.isShredded).map((p) => p.playerId)
  );
  const pendingSelectedIds = selectedPlayerIds.filter((id) => pendingSelectedSet.has(id));

  const batchItemsWithEmailCount = batchItems.filter(
    (it) => !it.isSigned && !it.isShredded && it.signerEmail && isStrictEmail(it.signerEmail)
  ).length;

  const massEmailSummaryBanner = massEmailSummary ? (
    <div role="status" className="p-3.5 rounded-xl border border-white/15 bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="space-y-1.5">
        <div className="font-bold text-white flex flex-wrap items-center gap-3">
          <span className="text-emerald-400">
            ✓ {massEmailSummary.sent} solicitud{massEmailSummary.sent === 1 ? '' : 'es'} enviada{massEmailSummary.sent === 1 ? '' : 's'}
          </span>
          {massEmailSummary.skippedNoEmail > 0 && (
            <span className="text-amber-300">
              • {massEmailSummary.skippedNoEmail} omitido{massEmailSummary.skippedNoEmail === 1 ? '' : 's'} (sin correo en censo)
            </span>
          )}
          {massEmailSummary.failed > 0 && (
            <span className="text-red-300">• {massEmailSummary.failed} con error</span>
          )}
        </div>
        {massEmailSummary.skippedNames.length > 0 && (
          <div className="text-[11px] text-amber-200/80">
            Sin email en censo: {massEmailSummary.skippedNames.join(', ')}
          </div>
        )}
        {massEmailSummary.failedItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-red-200">
            <span>
              Fallidos: {massEmailSummary.failedItems.map((f) => f.playerName).join(', ')}
            </span>
            <button
              type="button"
              disabled={isSendingMassEmails}
              onClick={() => handleSendMassEmails(massEmailSummary.failedItems.map((f) => f.playerId))}
              className="px-2 py-0.5 bg-red-800 hover:bg-red-700 text-white font-bold uppercase rounded cursor-pointer"
            >
              Reintentar fallidos
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setMassEmailSummary(null)}
        className="text-tertiary hover:text-white self-end sm:self-center p-1 cursor-pointer shrink-0"
        aria-label="Ocultar resumen de envío"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  ) : null;

  return (
    <div className="w-full min-h-screen bg-background text-on-surface py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Barra Superior */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display-xl text-white uppercase tracking-tight">
            Control de Autorizaciones y Secretaría
          </h1>
          <p className="text-xs text-tertiary mt-0.5">
            Custodia cifrada RGPD · Censo federativo · Emisión de enlaces y control de streaming
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch lg:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => loadDashboardData()}
            disabled={isLoading}
            className="p-2.5 bg-surface-container-high hover:bg-surface-container-highest border border-white/10 rounded-lg text-white/85 hover:text-white transition-colors cursor-pointer"
            aria-label="Refrescar datos del panel"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setShowStreamingModal(true)}
            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-colors cursor-pointer ${
              streamingStatus.active
                ? 'bg-emerald-700 hover:bg-emerald-600 border-emerald-400/50 text-white'
                : 'bg-surface-container-high hover:bg-surface-bright border-white/15 text-white'
            }`}
          >
            <Radio className="w-4 h-4" aria-hidden="true" />
            <span>{streamingStatus.active ? 'Streaming EN VIVO' : 'Gestionar Streaming'}</span>
          </button>
          <button
            type="button"
            onClick={openCensusModal}
            className="inline-flex items-center gap-2 px-3 py-2 bg-surface-container-high hover:bg-surface-bright text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-white/15 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4 text-primary" aria-hidden="true" />
            <span>Censo Masivo</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenBatchModal()}
            className="inline-flex items-center gap-2 px-3 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-lg cursor-pointer"
          >
            <Layers className="w-4 h-4" aria-hidden="true" />
            <span>Generar Lote {selectedPlayerIds.length > 0 ? `(${selectedPlayerIds.length})` : ''}</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-emerald-500/30 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-950/60 hover:bg-red-900 text-red-100 text-xs font-bold uppercase tracking-wider rounded-lg border border-red-500/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Notificación accesible aria-live */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
              toast.kind === 'error'
                ? 'bg-red-950/70 border-red-500/50 text-red-100'
                : toast.kind === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-100'
                  : 'bg-surface-container-low border-white/20 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.kind === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 hover:text-white/80 cursor-pointer"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {loadError && (
          <div role="alert" className="p-4 bg-red-950/60 border border-red-500/40 rounded-xl flex items-center justify-between gap-3 text-xs text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
              <span>{loadError}</span>
            </div>
            <button
              type="button"
              onClick={loadDashboardData}
              className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white font-bold uppercase rounded cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Alerta visible si existen registros con integridad comprometida */}
        {data && (data.stats.integrityAlerts || 0) > 0 && (
          <div role="alert" className="p-4 bg-amber-950/60 border border-amber-500/50 rounded-xl flex items-center gap-3 text-xs text-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
            <span>
              <strong>Atención de Auditoría:</strong> Se han detectado <strong>{data.stats.integrityAlerts}</strong> autorización(es) con alerta de verificación criptográfica o descifrado. Revisa la columna de integridad.
            </span>
          </div>
        )}

        {/* Tarjetas KPI Globales */}
        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-5 space-y-2">
              <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">
                Total Licencias Club
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display-xl text-white">{data.stats.totalPlayers}</span>
                <span className="text-xs text-tertiary">deportistas</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary-container h-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-emerald-500/30 rounded-xl p-5 space-y-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                <span>Firmadas Activas</span>
                <span className="text-emerald-400 font-bold">{data.stats.percentSigned}%</span>
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display-xl text-emerald-400">{data.stats.totalSigned}</span>
                <span className="text-xs text-emerald-300/80">completadas</span>
              </div>
              <div className="w-full bg-emerald-950 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${data.stats.percentSigned}%` }} />
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-amber-500/30 rounded-xl p-5 space-y-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                Pendientes de Firma
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display-xl text-amber-400">{data.stats.totalPending}</span>
                <span className="text-xs text-amber-300/80">familias por firmar</span>
              </div>
              <div className="w-full bg-amber-950 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full" style={{ width: `${100 - data.stats.percentSigned}%` }} />
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-5 space-y-2">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                Cesión de Imagen
              </span>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-display-xl text-white">
                    {data.stats.imageAllowed !== undefined ? data.stats.imageAllowed : data.stats.streamingAllowed}
                  </span>
                  <span className="text-[11px] text-emerald-400 block font-semibold">✓ Autorizan</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-display-xl text-red-400">
                    {data.stats.imageDenied !== undefined ? data.stats.imageDenied : data.stats.streamingDenied}
                  </span>
                  <span className="text-[11px] text-red-400 block font-semibold">✕ Deniegan</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Semáforo por Equipos */}
        {data && (
          <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
                <span>Progreso por Equipos</span>
              </h2>
              {selectedTeamFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedTeamFilter('ALL')}
                  className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                >
                  Ver todos los equipos
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {data.teams.map((t) => {
                const isSelected = selectedTeamFilter === t.teamId;
                const isComplete = t.signed === t.total && t.total > 0;
                return (
                  <button
                    key={t.teamId}
                    type="button"
                    onClick={() => setSelectedTeamFilter(isSelected ? 'ALL' : t.teamId)}
                    aria-pressed={isSelected}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary-container/25 border-primary-container shadow-lg'
                        : isComplete
                          ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60'
                          : 'bg-surface-container-low border-white/10 hover:border-white/25'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-white block truncate mb-1" title={t.teamName}>
                      {t.teamName}
                    </span>
                    <div className="flex justify-between items-baseline text-xs mb-1.5">
                      <span className={isComplete ? 'text-emerald-400 font-bold' : 'text-white'}>
                        {t.signed}/{t.total}
                      </span>
                      <span className="text-[10px] text-tertiary">{t.percent}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${isComplete ? 'bg-emerald-500' : 'bg-primary-container'}`}
                        style={{ width: `${t.percent}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Barra de Filtros */}
        <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <label htmlFor="admin-search-input" className="sr-only">
                Buscar por deportista, firmante o DNI
              </label>
              <Search className="w-4 h-4 text-tertiary absolute left-3 top-3" aria-hidden="true" />
              <input
                id="admin-search-input"
                type="text"
                placeholder="Buscar por deportista, firmante o DNI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-low border border-white/15 rounded-lg pl-9 pr-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-primary placeholder-white/30"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-tertiary shrink-0" aria-hidden="true" />
              <label htmlFor="admin-status-filter" className="sr-only">
                Filtrar por estado de autorización
              </label>
              <select
                id="admin-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'SIGNED' | 'PENDING' | 'SHREDDED')}
                className="bg-surface-container-low border border-white/15 rounded-lg px-3 py-2 text-base sm:text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="PENDING">Solo Pendientes</option>
                <option value="SIGNED">Solo Completados</option>
                <option value="SHREDDED">Suprimidos (Art. 17)</option>
              </select>
            </div>
          </div>

          {selectedTeamFilter !== 'ALL' && (
            <div className="flex items-center justify-between text-xs text-tertiary pt-2 border-t border-white/5">
              <span>
                Filtrando por:{' '}
                <strong className="text-white">
                  {data?.teams.find((t) => t.teamId === selectedTeamFilter)?.teamName}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedTeamFilter('ALL')}
                className="text-primary hover:underline font-semibold cursor-pointer"
              >
                Limpiar filtro de equipo
              </button>
            </div>
          )}
        </div>

        {/* Barra Contextual de Acciones por Lote */}
        {selectedPlayerIds.length > 0 && (
          <div className="bg-primary-container/15 border border-primary-container/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container" aria-hidden="true" />
                <span>{selectedPlayerIds.length} deportistas visibles seleccionados</span>
              </div>
              {massEmailProgress && (
                <div className="text-[11px] text-emerald-300 font-mono">
                  Enviando bloque {massEmailProgress.currentChunk} de {massEmailProgress.totalChunks} (máx. {EMAIL_BATCH_CHUNK_SIZE} por bloque)...
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={isSendingMassEmails || pendingSelectedIds.length === 0}
                onClick={() => handleSendMassEmails(pendingSelectedIds)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-colors cursor-pointer"
              >
                {isSendingMassEmails ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Enviando Emails...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" aria-hidden="true" />
                    <span>Enviar Solicitud por Email ({pendingSelectedIds.length})</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleOpenBatchModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4" aria-hidden="true" />
                <span>Generar Enlaces ({selectedPlayerIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlayerIds([])}
                className="px-3 py-2 bg-surface-container-high hover:bg-surface-bright text-white/85 hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Deseleccionar todos
              </button>
            </div>
          </div>
        )}

        {!showBatchModal && massEmailSummaryBanner}

        {/* Tabla de Jugadores */}
        <div className="bg-surface-container-lowest border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low border-b border-white/10 text-[11px] font-bold text-white uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={
                        filteredPlayers.length > 0 &&
                        selectedPlayerIds.length === filteredPlayers.length
                      }
                      aria-label={
                        selectedPlayerIds.length === filteredPlayers.length && filteredPlayers.length > 0
                          ? 'Deseleccionar todos los visibles'
                          : 'Seleccionar todos los visibles'
                      }
                      onClick={handleToggleSelectAll}
                      className="min-w-[28px] min-h-[28px] inline-flex items-center justify-center rounded hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {selectedPlayerIds.length === filteredPlayers.length && filteredPlayers.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-primary" aria-hidden="true" />
                      ) : (
                        <Square className="w-4 h-4 text-tertiary" aria-hidden="true" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Deportista</th>
                  <th className="py-3 px-3">Equipo</th>
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort('status')}
                      className="inline-flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer uppercase"
                    >
                      <span>Estado / Integridad</span>
                      {sortConfig.key === 'status' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-tertiary/70" aria-hidden="true" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Firmante / DNI</th>
                  <th className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleSort('image')}
                      className="inline-flex items-center justify-center gap-1.5 hover:text-primary transition-colors cursor-pointer uppercase"
                    >
                      <span>Imagen</span>
                      {sortConfig.key === 'image' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-tertiary/70" aria-hidden="true" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleSort('travel')}
                      className="inline-flex items-center justify-center gap-1.5 hover:text-primary transition-colors cursor-pointer uppercase"
                    >
                      <span>Viajes</span>
                      {sortConfig.key === 'travel' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-tertiary/70" aria-hidden="true" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleSort('method')}
                      className="inline-flex items-center justify-center gap-1.5 hover:text-primary transition-colors cursor-pointer uppercase"
                    >
                      <span>Método</span>
                      {sortConfig.key === 'method' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-tertiary/70" aria-hidden="true" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Fecha Firma</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-on-surface">
                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-sm text-tertiary">
                      No se han encontrado deportistas con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((p) => {
                    const isRowSelected = selectedPlayerIds.includes(p.playerId);
                    const hasAnyImage = Boolean(
                      p.consentSocialMedia || p.consentStreaming || p.consentPress
                    );
                    return (
                      <tr
                        key={p.playerId}
                        className={`hover:bg-white/[0.02] transition-colors ${
                          isRowSelected ? 'bg-primary-container/[0.12]' : ''
                        }`}
                      >
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isRowSelected}
                            aria-label={`${isRowSelected ? 'Deseleccionar' : 'Seleccionar'} a ${p.playerName}`}
                            onClick={() => handleToggleSelectPlayer(p.playerId)}
                            className="min-w-[28px] min-h-[28px] inline-flex items-center justify-center rounded hover:bg-white/10 cursor-pointer transition-colors"
                          >
                            {isRowSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary" aria-hidden="true" />
                            ) : (
                              <Square className="w-4 h-4 text-white/40 hover:text-white" aria-hidden="true" />
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 font-bold text-white text-sm">
                            <span>{p.playerName}</span>
                            {p.isDemo && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 border border-amber-400/40 text-amber-200">
                                Test
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-tertiary">
                            Nac: {p.birthYear || 'N/D'} ·{' '}
                            {p.isMinor ? (p.isMinor14To17 ? 'Menor 14-17' : 'Menor') : 'Mayor (+18)'}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {p.dniLast5 && (
                              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-white/80">
                                DNI ····{p.dniLast5}
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                                p.hasCensusEmail
                                  ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                                  : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                              }`}
                            >
                              {p.hasCensusEmail ? 'Email ✓' : 'Sin Email'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-white/90">{p.teamName}</td>

                        <td className="py-3.5 px-3">
                          {p.isShredded ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-800 border border-white/25 text-white/90 whitespace-nowrap">
                              <ShieldOff className="w-3 h-3 text-amber-300" aria-hidden="true" />
                              <span>Suprimido Art. 17</span>
                            </span>
                          ) : p.isSigned ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                                <span>Completado</span>
                              </span>
                              {p.integrityVerified === false ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950/80 border border-amber-400/50 text-amber-200 whitespace-nowrap">
                                  <ShieldAlert className="w-3 h-3 text-amber-300" aria-hidden="true" />
                                  <span>Alerta Integridad</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300/90 font-semibold whitespace-nowrap">
                                  <ShieldCheck className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                                  <span>Verificado</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-950/70 border border-red-500/40 text-red-300 whitespace-nowrap">
                              <Clock className="w-3 h-3 text-red-400" aria-hidden="true" />
                              <span>Pendiente</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          {p.isSigned ? (
                            <div className="min-w-[165px]">
                              <span className="font-semibold text-white block whitespace-nowrap">
                                {p.signerName}
                              </span>
                              <span className="text-[11px] text-tertiary block whitespace-nowrap">
                                {p.signerRelationship} · {p.signerDni}
                              </span>
                            </div>
                          ) : (
                            <span className="text-tertiary italic">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {p.isSigned ? (
                            <div className="space-y-1">
                              {hasAnyImage ? (
                                p.consentSocialMedia === p.consentStreaming &&
                                p.consentStreaming === p.consentPress ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-300 font-bold text-xs">
                                    <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>SÍ</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-300 font-bold text-[11px]">
                                    <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>
                                      {[
                                        p.consentSocialMedia ? 'Web' : null,
                                        p.consentStreaming ? 'Stream' : null,
                                        p.consentPress ? 'Prensa' : null,
                                      ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                    </span>
                                  </span>
                                )
                              ) : (
                                <span className="text-red-300 font-bold bg-red-950/60 px-1.5 py-0.5 rounded text-[10px]">
                                  ✕ NO
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-tertiary">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {p.isSigned ? (
                            p.consentTravel === true ? (
                              <span className="inline-flex items-center gap-1 text-blue-300 font-bold text-xs">
                                <Bus className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>SÍ</span>
                              </span>
                            ) : (
                              <span className="text-red-300 font-bold text-[10px] bg-red-950/60 px-1.5 py-0.5 rounded">
                                ✕ NO
                              </span>
                            )
                          ) : (
                            <span className="text-tertiary">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {p.isSigned ? (
                            p.signatureMethod === 'OTP_EMAIL' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 whitespace-nowrap">
                                DIGITAL + OTP
                              </span>
                            ) : p.signatureMethod === 'PRESENCIAL' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-950/70 border border-amber-500/40 text-amber-200 whitespace-nowrap">
                                PRESENCIAL
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-950/70 border border-blue-500/40 text-blue-200 whitespace-nowrap">
                                DIGITAL WEB
                              </span>
                            )
                          ) : (
                            <span className="text-tertiary">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-[11px] text-tertiary">
                          {p.signedAt
                            ? new Date(p.signedAt).toLocaleDateString('es-ES', {
                                timeZone: 'Europe/Madrid',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDirectLinkModal(p)}
                              className="min-w-[28px] min-h-[28px] p-1.5 bg-primary-container/25 hover:bg-primary-container text-primary hover:text-white border border-primary-container/40 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
                              aria-label={`Gestionar ficha y enlace de ${p.playerName}`}
                              title="Gestionar ficha, enlace directo y enviar solicitud por email"
                            >
                              <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>

                            {p.isSigned && !p.isShredded && (
                              <>
                                <button
                                  type="button"
                                  disabled={downloadingPdfId === p.playerId}
                                  onClick={() => handleDownloadPdf(p)}
                                  className="min-w-[28px] min-h-[28px] p-1.5 bg-surface-container-high hover:bg-surface-bright text-white rounded transition-colors cursor-pointer inline-flex items-center justify-center disabled:opacity-50"
                                  aria-label={`Descargar PDF de ${p.playerName}`}
                                  title="Descargar Resguardo PDF Oficial"
                                >
                                  {downloadingPdfId === p.playerId ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => requestRevoke(p)}
                                  className="min-w-[28px] min-h-[28px] p-1.5 bg-amber-950/60 hover:bg-amber-800 text-amber-200 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
                                  aria-label={`Revocar autorización de ${p.playerName}`}
                                  title="Revocar autorización (Art. 7.3)"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => requestShred(p)}
                                  className="min-w-[28px] min-h-[28px] p-1.5 bg-red-950/60 hover:bg-red-800 text-red-200 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
                                  aria-label={`Suprimir clave RGPD de ${p.playerName}`}
                                  title="Supresión irreversible Art. 17 RGPD (Crypto-Shredding)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE FICHA, ENLACE DIRECTO Y REGISTRO PRESENCIAL GRANULAR             */}
      {/* ========================================================================= */}
      {directLinkPlayer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="direct-modal-title"
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            ref={directModalRef}
            className="bg-surface-container-lowest border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-8 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-primary-container text-white text-[10px] font-bold uppercase rounded">
                  GESTIÓN DE FIRMA
                </span>
                <h3 id="direct-modal-title" className="text-sm font-bold text-white uppercase tracking-wider">
                  Ficha de Contacto, Enlace Directo y Envío por Email
                </h3>
              </div>
              <button
                type="button"
                onClick={closeDirectModal}
                className="text-tertiary hover:text-white p-1.5 cursor-pointer"
                aria-label="Cerrar ventana de gestión de firma"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-surface-container-low rounded-xl border border-white/5">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>{directLinkPlayer.playerName}</span>
                  <span className="px-1.5 py-0.5 bg-white/10 text-white/90 text-[10px] font-semibold rounded">
                    {directLinkPlayer.teamName}
                  </span>
                </div>
                <div className="text-xs text-tertiary">
                  Nacimiento: {directLinkPlayer.birthYear || 'N/D'} ·{' '}
                  {directLinkPlayer.isMinor ? 'Menor de edad (Tutor legal)' : 'Mayor de edad (+18)'}
                </div>
              </div>
              {directLinkPlayer.dniLast5 && (
                <div className="text-xs text-tertiary">
                  DNI Censo: <span className="font-mono text-white font-bold">{directLinkPlayer.dniLast5}</span>
                </div>
              )}
            </div>

            {isLoadingDirectLink ? (
              <div className="py-8 text-center text-xs text-tertiary space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary" aria-hidden="true" />
                <p>Cargando datos del deportista...</p>
              </div>
            ) : directLinkData ? (
              <div className="space-y-4">
                <div className="space-y-3 p-4 bg-surface-container-low/60 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Edit2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                      <span>Datos del Firmante ({directLinkPlayer.isMinor ? 'Padre / Madre / Tutor' : 'Deportista'})</span>
                    </span>
                    <span className="text-[11px] text-tertiary flex items-center gap-1.5">
                      {isUpdatingPrefill ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-primary" aria-hidden="true" />
                          <span className="text-primary">Sincronizando...</span>
                        </>
                      ) : (
                        <span>Auto-guardado en censo activo</span>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label htmlFor="prefill-name" className="block text-[11px] font-bold text-white/80 uppercase tracking-wider mb-1">
                        Nombre y Apellidos del Firmante
                      </label>
                      <input
                        id="prefill-name"
                        type="text"
                        disabled={!directLinkPlayer.isMinor}
                        value={directLinkPlayer.isMinor ? prefillName : directLinkPlayer.playerName}
                        onChange={(e) => setPrefillName(e.target.value)}
                        placeholder="Nombre completo"
                        className="w-full bg-surface-container-high border border-white/15 rounded-lg px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label htmlFor="prefill-dni" className="block text-[11px] font-bold text-white/80 uppercase tracking-wider mb-1">
                        DNI / NIE Firmante
                      </label>
                      <input
                        id="prefill-dni"
                        type="text"
                        value={prefillDni}
                        onChange={(e) => setPrefillDni(e.target.value.toUpperCase())}
                        placeholder="00000001R"
                        className="w-full bg-surface-container-high border border-white/15 rounded-lg px-3 py-2 text-base sm:text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-primary"
                      />
                      {!prefillDni.trim() && directLinkPlayer.dniLast5 && (
                        <span className="text-[10px] text-tertiary mt-1 block">
                          Censo actual: ····{directLinkPlayer.dniLast5} (déjalo vacío para conservarlo o introduce uno completo para actualizar).
                        </span>
                      )}
                    </div>

                    <div>
                      <label htmlFor="prefill-rel" className="block text-[11px] font-bold text-white/80 uppercase tracking-wider mb-1">
                        Parentesco / Condición
                      </label>
                      <select
                        id="prefill-rel"
                        disabled={!directLinkPlayer.isMinor}
                        value={directLinkPlayer.isMinor ? prefillRelationship : 'PROPIO_JUGADOR'}
                        onChange={(e) => setPrefillRelationship(e.target.value)}
                        className="w-full bg-surface-container-high border border-white/15 rounded-lg px-3 py-2 text-base sm:text-xs text-white focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {directLinkPlayer.isMinor ? (
                          <>
                            <option value="MADRE">Madre</option>
                            <option value="PADRE">Padre</option>
                            <option value="TUTOR_LEGAL">Tutor / Tutora Legal</option>
                          </>
                        ) : (
                          <option value="PROPIO_JUGADOR">Propio Deportista (Mayor de edad)</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="prefill-phone" className="block text-[11px] font-bold text-white/80 uppercase tracking-wider mb-1">
                        Teléfono Móvil
                      </label>
                      <input
                        id="prefill-phone"
                        type="tel"
                        value={prefillPhone}
                        onChange={(e) => setPrefillPhone(e.target.value)}
                        placeholder="600 000 000"
                        className="w-full bg-surface-container-high border border-white/15 rounded-lg px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label htmlFor="prefill-email" className="block text-[11px] font-bold text-white/80 uppercase tracking-wider mb-1">
                        Correo Electrónico (Censo OTP)
                      </label>
                      <input
                        id="prefill-email"
                        type="email"
                        value={prefillEmail}
                        onChange={(e) => setPrefillEmail(e.target.value)}
                        placeholder="contacto@ejemplo.com"
                        className="w-full bg-surface-container-high border border-white/15 rounded-lg px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {prefillNotice && (
                    <div
                      role={prefillNotice.kind === 'error' ? 'alert' : 'status'}
                      className={`p-2.5 rounded-lg text-xs border ${
                        prefillNotice.kind === 'error'
                          ? 'bg-red-950/60 border-red-500/40 text-red-200'
                          : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      }`}
                    >
                      {prefillNotice.message}
                    </div>
                  )}
                </div>

                {/* Enlace directo + envío email */}
                <div className="space-y-3 p-4 bg-surface-container-low/60 rounded-xl border border-white/10">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="direct-url-readonly" className="block text-xs font-bold text-white/85 uppercase tracking-wider">
                        Enlace Directo Personalizado
                      </label>
                      <span className="text-[11px] text-tertiary">Válido 14 días</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="direct-url-readonly"
                        type="text"
                        readOnly
                        value={directLinkData.directUrl}
                        className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white/90 select-all"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const syncedUrl = (await flushPendingDirectSave(false)) || directLinkData.directUrl;
                          try {
                            await navigator.clipboard?.writeText(syncedUrl);
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 2500);
                          } catch {}
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                          copiedLink
                            ? 'bg-emerald-700 text-white'
                            : 'bg-surface-container-high hover:bg-surface-bright text-white'
                        }`}
                      >
                        {copiedLink ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                        <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                      </button>
                      <a
                        href={directLinkData.directUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={async (e) => {
                          if (!isDirectPrefillDirty()) return;
                          e.preventDefault();
                          const syncedUrl = await flushPendingDirectSave(false);
                          if (!syncedUrl) return;
                          const win = window.open(syncedUrl, '_blank', 'noopener,noreferrer');
                          if (!win) {
                            setPrefillNotice({
                              kind: 'info',
                              message: 'Cambios guardados y enlace actualizado. Pulsa de nuevo para abrirlo en pestaña nueva.',
                            });
                          }
                        }}
                        className="p-2 bg-surface-container-high hover:bg-surface-bright text-white rounded-lg transition-colors shrink-0"
                        aria-label="Abrir enlace directo en nueva pestaña"
                      >
                        <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      </a>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-tertiary">
                      Envía instrucciones y enlace desde <strong className="text-white">{CLUB_INFO.contactEmail}</strong>
                    </div>
                    <button
                      type="button"
                      disabled={isSendingInviteEmail || !prefillEmail.trim()}
                      onClick={handleSendDirectLinkEmail}
                      className="py-2.5 px-4 bg-primary-container hover:bg-cta-hover disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors inline-flex items-center justify-center gap-2 shadow-md cursor-pointer shrink-0"
                    >
                      {isSendingInviteEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          <span>Enviando Email...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" aria-hidden="true" />
                          <span>Enviar Solicitud por Email</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Impreso presencial y registro granular de hoja firmada en papel */}
                <div className="pt-2 border-t border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-tertiary">¿Firma presencial en papel?</span>
                    <button
                      type="button"
                      onClick={handleDownloadDraftPdf}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-surface-container-high hover:bg-surface-bright text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer border border-white/10"
                    >
                      <Download className="w-4 h-4 text-primary" aria-hidden="true" />
                      <span>Descargar PDF Presencial</span>
                    </button>
                  </div>

                  {directLinkPlayer.isShredded ? (
                    <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-200">
                      Ficha suprimida conforme al Art. 17 RGPD. No se permite registrar nuevas firmas presenciales.
                    </div>
                  ) : directLinkPlayer.isSigned ? (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200">
                      Esta ficha ya tiene una autorización activa registrada ({directLinkPlayer.signatureMethod === 'PRESENCIAL' ? 'Presencial' : 'Digital'}). Para sustituirla, revócala primero desde la tabla principal.
                    </div>
                  ) : (
                    <div className="p-3.5 bg-surface-container-low/60 border border-white/10 rounded-xl space-y-3">
                      <span className="text-xs font-bold text-white block">
                        Registrar hoja física firmada en mano:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 bg-black/25 rounded-lg border border-white/10 space-y-2">
                          <span className="font-semibold text-white/90 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                            <span>Imágenes</span>
                          </span>
                          <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Decisión presencial Imágenes">
                            <button
                              type="button"
                              role="radio"
                              aria-checked={inPersonImage === true}
                              onClick={() => setInPersonImage(true)}
                              className={`py-1.5 px-2 rounded border font-bold text-[11px] cursor-pointer transition-colors ${
                                inPersonImage === true
                                  ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200'
                                  : 'bg-surface-container-high border-white/10 text-tertiary hover:text-white'
                              }`}
                            >
                              Autoriza
                            </button>
                            <button
                              type="button"
                              role="radio"
                              aria-checked={inPersonImage === false}
                              onClick={() => setInPersonImage(false)}
                              className={`py-1.5 px-2 rounded border font-bold text-[11px] cursor-pointer transition-colors ${
                                inPersonImage === false
                                  ? 'bg-red-950/70 border-red-400 text-red-200'
                                  : 'bg-surface-container-high border-white/10 text-tertiary hover:text-white'
                              }`}
                            >
                              No autoriza
                            </button>
                          </div>
                        </div>
                        <div className="p-2.5 bg-black/25 rounded-lg border border-white/10 space-y-2">
                          <span className="font-semibold text-white/90 flex items-center gap-1.5">
                            <Bus className="w-3.5 h-3.5 text-blue-400 shrink-0" aria-hidden="true" />
                            <span>Desplazamientos</span>
                          </span>
                          <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Decisión presencial Desplazamientos">
                            <button
                              type="button"
                              role="radio"
                              aria-checked={inPersonTravel === true}
                              onClick={() => setInPersonTravel(true)}
                              className={`py-1.5 px-2 rounded border font-bold text-[11px] cursor-pointer transition-colors ${
                                inPersonTravel === true
                                  ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200'
                                  : 'bg-surface-container-high border-white/10 text-tertiary hover:text-white'
                              }`}
                            >
                              Autoriza
                            </button>
                            <button
                              type="button"
                              role="radio"
                              aria-checked={inPersonTravel === false}
                              onClick={() => setInPersonTravel(false)}
                              className={`py-1.5 px-2 rounded border font-bold text-[11px] cursor-pointer transition-colors ${
                                inPersonTravel === false
                                  ? 'bg-red-950/70 border-red-400 text-red-200'
                                  : 'bg-surface-container-high border-white/10 text-tertiary hover:text-white'
                              }`}
                            >
                              No autoriza
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={isRegisteringInPerson}
                          onClick={handleRegisterInPerson}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <ClipboardCheck className="w-4 h-4" aria-hidden="true" />
                          <span>{isRegisteringInPerson ? 'Registrando...' : 'Registrar Firma Presencial'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="pt-2 border-t border-white/10 text-right">
              <button
                type="button"
                onClick={closeDirectModal}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-bright text-white text-xs font-bold uppercase rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE LOTE Y ENVÍO PAGINADO DE EMAILS                                  */}
      {/* ========================================================================= */}
      {showBatchModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-modal-title"
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div
            ref={batchModalRef}
            className="bg-surface-container-lowest border border-white/10 rounded-2xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl my-6 max-h-[92vh] flex flex-col"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-primary-container text-white text-[10px] font-bold uppercase rounded">
                  LOTE DE ENLACES
                </span>
                <h3 id="batch-modal-title" className="text-sm font-bold text-white uppercase tracking-wider">
                  Enlaces Directos y Envío Paginado por Email
                </h3>
                {batchItems.length > 0 && (
                  <span className="px-2 py-0.5 bg-white/10 text-white/90 text-xs font-semibold rounded-full">
                    {batchItems.length} deportistas
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={closeBatchModal}
                className="text-tertiary hover:text-white p-1.5 cursor-pointer"
                aria-label="Cerrar modal de lote"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {isLoadingBatch ? (
              <div className="py-16 text-center text-xs text-tertiary space-y-3 shrink-0">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" aria-hidden="true" />
                <p className="text-sm text-white font-semibold">Generando enlaces directos...</p>
              </div>
            ) : batchItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-tertiary">
                No se obtuvieron deportistas para generar enlaces.
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface-container-low rounded-xl border border-white/5 shrink-0">
                  <div className="relative flex-1">
                    <label htmlFor="batch-search-input" className="sr-only">
                      Filtrar enlaces del lote
                    </label>
                    <Search className="w-4 h-4 text-tertiary absolute left-3 top-2.5" aria-hidden="true" />
                    <input
                      id="batch-search-input"
                      type="text"
                      placeholder="Buscar por deportista, equipo, firmante o email..."
                      value={batchSearchQuery}
                      onChange={(e) => setBatchSearchQuery(e.target.value)}
                      className="w-full bg-surface-container-high border border-white/15 rounded-lg pl-9 pr-3 py-1.5 text-base sm:text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      disabled={isSendingMassEmails || batchItemsWithEmailCount === 0}
                      onClick={() =>
                        handleSendMassEmails(
                          batchItems.filter((it) => !it.isSigned && !it.isShredded).map((it) => it.playerId)
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-cta-hover disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-md"
                    >
                      {isSendingMassEmails ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          <span>
                            {massEmailProgress
                              ? `Bloque ${massEmailProgress.currentChunk}/${massEmailProgress.totalChunks}`
                              : 'Enviando...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" aria-hidden="true" />
                          <span>Enviar Email a Todos ({batchItemsWithEmailCount})</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyAllBatchMessages}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-white/10 transition-colors cursor-pointer"
                    >
                      {copiedAllBatch ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                          <span>¡Copiados!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" aria-hidden="true" />
                          <span>Copiar Todos</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleExportBatchCsv}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-emerald-500/30 transition-colors cursor-pointer shadow-md"
                    >
                      <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
                      <span>Descargar CSV</span>
                    </button>
                  </div>
                </div>

                {massEmailProgress && (
                  <div className="shrink-0 space-y-1">
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{
                          width: `${Math.round(
                            (massEmailProgress.currentChunk / Math.max(1, massEmailProgress.totalChunks)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {massEmailSummaryBanner && <div className="shrink-0">{massEmailSummaryBanner}</div>}

                <div className="overflow-y-auto space-y-2.5 pr-1 flex-1 min-h-[280px]">
                  {filteredBatchItems.map((item) => {
                    const isEmailSent = sentBatchEmailIds.includes(item.playerId);
                    const isSendingThis = sendingBatchEmailId === item.playerId;
                    return (
                      <div
                        key={item.playerId}
                        className="p-3.5 bg-surface-container-low/70 border border-white/10 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-[220px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{item.playerName}</span>
                            <span className="px-1.5 py-0.5 bg-white/10 text-white/85 text-[10px] font-semibold rounded">
                              {item.teamName}
                            </span>
                          </div>
                          <div className="text-xs text-tertiary flex items-center gap-2">
                            <span>{item.isMinor ? 'Menor' : 'Mayor (+18)'}</span>
                            <span>•</span>
                            <span
                              className={
                                item.isShredded
                                  ? 'text-red-400 font-semibold'
                                  : item.isSigned
                                    ? 'text-emerald-400 font-semibold'
                                    : 'text-amber-400 font-semibold'
                              }
                            >
                              {item.isShredded ? 'Suprimido Art. 17' : item.isSigned ? 'Completado' : 'Pendiente'}
                            </span>
                          </div>
                          <div className="text-[11px] text-white/75">
                            {item.signerName || item.signerEmail ? (
                              <span>
                                {item.signerName || 'Sin nombre'} ({item.signerRelationship})
                                {item.signerEmail ? ` · ${item.signerEmail}` : ''}
                              </span>
                            ) : (
                              <span className="text-white/40 italic">Sin datos de contacto en censo</span>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            aria-label={`Enlace directo para ${item.playerName}`}
                            value={item.directUrl}
                            className="flex-1 bg-surface-container-high border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-white/85 select-all"
                          />
                          <div className="flex items-center gap-1.5 shrink-0 justify-end">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard?.writeText(item.directUrl);
                                  setCopiedBatchId(item.playerId);
                                  setTimeout(() => setCopiedBatchId(null), 2000);
                                } catch {}
                              }}
                              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                                copiedBatchId === item.playerId
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-surface-container-high hover:bg-surface-bright text-white/90'
                              }`}
                            >
                              {copiedBatchId === item.playerId ? (
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                              )}
                              <span className="hidden sm:inline">
                                {copiedBatchId === item.playerId ? 'Copiado' : 'Copiar'}
                              </span>
                            </button>

                            <button
                              type="button"
                              disabled={isSendingThis || !item.signerEmail || item.isSigned || item.isShredded}
                              onClick={() => handleSendBatchItemEmail(item)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
                                isEmailSent
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-primary-container hover:bg-cta-hover text-white'
                              }`}
                            >
                              {isSendingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                              ) : isEmailSent ? (
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              ) : (
                                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                              )}
                              <span>{isEmailSent ? 'Enviado' : 'Email'}</span>
                            </button>

                            <a
                              href={item.directUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-surface-container-high hover:bg-surface-bright text-white/85 hover:text-white rounded-lg transition-colors"
                              aria-label={`Abrir enlace directo de ${item.playerName}`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="pt-3 border-t border-white/10 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={closeBatchModal}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-bright text-white text-xs font-bold uppercase rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CENSO MASIVO (/api/admin/census)                                    */}
      {/* ========================================================================= */}
      {showCensusModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="census-modal-title"
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div
            ref={censusModalRef}
            className="bg-surface-container-lowest border border-white/15 rounded-2xl max-w-5xl w-full p-5 sm:p-6 space-y-4 shadow-2xl my-6 max-h-[92vh] flex flex-col"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-primary-container text-white text-[10px] font-bold uppercase rounded">
                  CARGA MASIVA CENSO
                </span>
                <h3 id="census-modal-title" className="text-sm font-bold text-white uppercase tracking-wider">
                  Actualización Masiva de DNI, Fecha Nacimiento, Email y Tutores
                </h3>
              </div>
              <button
                type="button"
                onClick={closeCensusModal}
                className="text-tertiary hover:text-white p-1.5 cursor-pointer"
                aria-label="Cerrar modal de censo masivo"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCensusMode('CSV')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold uppercase cursor-pointer ${
                    censusMode === 'CSV'
                      ? 'bg-primary-container text-white'
                      : 'bg-surface-container-high text-tertiary hover:text-white'
                  }`}
                >
                  Importar CSV / Excel
                </button>
                <button
                  type="button"
                  onClick={() => setCensusMode('TABLE')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold uppercase cursor-pointer ${
                    censusMode === 'TABLE'
                      ? 'bg-primary-container text-white'
                      : 'bg-surface-container-high text-tertiary hover:text-white'
                  }`}
                >
                  Edición Rápida por Equipo
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownloadCensusTemplateCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright text-white text-xs font-bold uppercase rounded-lg border border-white/15 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Descargar Plantilla CSV</span>
              </button>
            </div>

            {censusMode === 'CSV' ? (
              <div className="space-y-3 flex-1 overflow-y-auto">
                <div className="p-3 bg-surface-container-low border border-white/10 rounded-lg text-xs text-tertiary space-y-1.5">
                  <p>
                    Columnas admitidas: <code className="text-white">playerId;dni;birthDate;contactEmail;contactPhone;parentName;parentDni;parentRelationship</code>.
                  </p>
                  <p>
                    Formato de fecha: <strong className="text-white">DD/MM/AAAA</strong> (o YYYY-MM-DD). Deja vacías las celdas que no quieras modificar.
                  </p>
                  <label htmlFor="census-file-input" className="inline-flex items-center gap-2 px-3 py-2 mt-1 bg-surface-container-high hover:bg-surface-bright text-white font-bold uppercase text-[11px] rounded cursor-pointer border border-white/15">
                    <Upload className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    <span>Seleccionar archivo .CSV</span>
                    <input
                      id="census-file-input"
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCensusCsvFileUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div>
                  <label htmlFor="census-csv-textarea" className="block text-xs font-bold text-white/85 uppercase mb-1.5">
                    Contenido CSV (delimitado por punto y coma, coma o tabulador)
                  </label>
                  <textarea
                    id="census-csv-textarea"
                    rows={9}
                    value={censusCsvText}
                    onChange={(e) => setCensusCsvText(e.target.value)}
                    placeholder={'playerId;dni;birthDate;contactEmail;contactPhone;parentName;parentDni;parentRelationship\np-sf-1;00000001R;15/04/2003;deportista@ejemplo.es;600111222;;;PROPIO_JUGADOR'}
                    className="w-full bg-surface-container-low border border-white/15 rounded-lg p-3 text-base sm:text-xs font-mono text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto">
                <div className="flex items-center gap-3">
                  <label htmlFor="census-team-select" className="text-xs font-bold text-white uppercase shrink-0">
                    Equipo:
                  </label>
                  <select
                    id="census-team-select"
                    value={censusTableTeamId}
                    onChange={(e) => handleCensusTeamSwitch(e.target.value)}
                    className="bg-surface-container-low border border-white/15 rounded-lg px-3 py-2 text-base sm:text-xs text-white focus:outline-none focus:border-primary"
                  >
                    {data?.teams.map((t) => (
                      <option key={t.teamId} value={t.teamId}>
                        {t.teamName} ({t.total})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="overflow-x-auto border border-white/10 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container-low text-[10px] uppercase text-white/90 border-b border-white/10">
                      <tr>
                        <th className="p-2.5">Deportista</th>
                        <th className="p-2.5">DNI/NIE</th>
                        <th className="p-2.5">F. Nac (DD/MM/AAAA)</th>
                        <th className="p-2.5">Email Censo</th>
                        <th className="p-2.5">Teléfono</th>
                        <th className="p-2.5">Tutor (si menor)</th>
                        <th className="p-2.5">DNI Tutor (si menor)</th>
                        <th className="p-2.5">Parentesco</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {censusDraftRows.map((row, idx) => {
                        const existingPlayer = data?.players.find((pl) => pl.playerId === row.playerId);
                        return (
                        <tr key={row.playerId}>
                          <td className="p-2 font-semibold text-white whitespace-nowrap">
                            <div>{row.playerName}</div>
                            {existingPlayer && (
                              <div className="flex items-center gap-1 mt-0.5 text-[9px] font-normal">
                                <span className={existingPlayer.dniLast5 ? 'text-emerald-300' : 'text-amber-300'}>
                                  {existingPlayer.dniLast5 ? `DNI ····${existingPlayer.dniLast5}` : 'Sin DNI'}
                                </span>
                                <span className="text-tertiary">·</span>
                                <span className={existingPlayer.hasCensusEmail ? 'text-emerald-300' : 'text-amber-300'}>
                                  {existingPlayer.hasCensusEmail ? 'Email ✓' : 'Sin Email'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              aria-label={`DNI de ${row.playerName}`}
                              placeholder="00000001R"
                              value={row.dni}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setCensusDraftRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, dni: val } : r))
                                );
                              }}
                              className="w-28 bg-surface-container-high border border-white/15 rounded px-2 py-1 text-xs font-mono text-white"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              aria-label={`Fecha de nacimiento de ${row.playerName}`}
                              placeholder="DD/MM/AAAA"
                              value={row.birthDate}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCensusDraftRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, birthDate: val } : r))
                                );
                              }}
                              className="w-28 bg-surface-container-high border border-white/15 rounded px-2 py-1 text-xs text-white"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="email"
                              aria-label={`Email de ${row.playerName}`}
                              placeholder="familia@email.es"
                              value={row.contactEmail}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCensusDraftRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, contactEmail: val } : r))
                                );
                              }}
                              className="w-44 bg-surface-container-high border border-white/15 rounded px-2 py-1 text-xs text-white"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="tel"
                              aria-label={`Teléfono de ${row.playerName}`}
                              placeholder="600000000"
                              value={row.contactPhone}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCensusDraftRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, contactPhone: val } : r))
                                );
                              }}
                              className="w-28 bg-surface-container-high border border-white/15 rounded px-2 py-1 text-xs text-white"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              disabled={row.isMinor === false}
                              aria-label={`Nombre tutor de ${row.playerName}`}
                              placeholder={row.isMinor === false ? 'No aplica (+18)' : 'Nombre tutor'}
                              value={row.parentName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCensusDraftRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, parentName: val } : r))
                                );
                              }}
                              className="w-40 bg-surface-container-high border border-white/15 rounded px-2 py-1 text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              disabled={row.isMinor === false}
                              aria-label={`DNI tutor de ${row.playerName}`}
                              placeholder={row.isMinor === false ? 'No aplica' : '00000001R'}
                              value={row.parentDni}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setCensusDraftRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, parentDni: val } : r))
                                );
                              }}
                              className="w-28 bg-surface-container-high border border-white/15 rounded px-2 py-1 text-xs font-mono text-white disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              aria-label={`Parentesco de ${row.playerName}`}
                              value={row.parentRelationship}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCensusDraftRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, parentRelationship: val } : r))
                                );
                              }}
                              className="w-36 bg-surface-container-high border border-white/15 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="">Sin cambio</option>
                              {row.isMinor !== false ? (
                                <>
                                  <option value="MADRE">Madre</option>
                                  <option value="PADRE">Padre</option>
                                  <option value="TUTOR_LEGAL">Tutor Legal</option>
                                </>
                              ) : (
                                <option value="PROPIO_JUGADOR">Propio (+18)</option>
                              )}
                            </select>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {censusResult && (
              <div
                role="status"
                className={`p-3 rounded-lg border text-xs space-y-1 shrink-0 ${
                  censusResult.errors.length > 0
                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-100'
                    : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-100'
                }`}
              >
                <p className="font-bold">
                  Actualizados: {censusResult.updatedCount} · Omitidos/Inválidos: {censusResult.skippedCount}
                </p>
                {censusResult.errors.length > 0 && (
                  <ul className="list-disc pl-4 text-[11px] text-red-200 max-h-24 overflow-y-auto">
                    {censusResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={closeCensusModal}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-bright text-white text-xs font-bold uppercase rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={isSavingCensus}
                onClick={handleSaveCensusBatch}
                className="inline-flex items-center gap-2 px-5 py-2 bg-primary-container hover:bg-cta-hover disabled:opacity-50 text-white text-xs font-bold uppercase rounded-lg cursor-pointer"
              >
                {isSavingCensus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Guardando en Neon...</span>
                  </>
                ) : (
                  <span>Guardar Lote en Censo</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIÁLOGO MODAL ACCESIBLE DE CONFIRMACIÓN (REVOCAR / SUPRIMIR ART. 17)     */}
      {/* ========================================================================= */}
      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            ref={confirmModalRef}
            className="bg-surface-container-lowest border border-white/20 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 id="confirm-dialog-title" className="text-base font-bold text-white uppercase tracking-wide">
                {confirmDialog.title}
              </h3>
              <button
                type="button"
                disabled={isConfirmingAction}
                onClick={closeConfirmDialog}
                className="text-tertiary hover:text-white p-1 cursor-pointer"
                aria-label="Cerrar confirmación"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <p className="text-xs text-tertiary leading-relaxed">{confirmDialog.description}</p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isConfirmingAction}
                onClick={closeConfirmDialog}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-bright text-white text-xs font-bold uppercase rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isConfirmingAction}
                onClick={async () => {
                  setIsConfirmingAction(true);
                  try {
                    await confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  } catch {
                    showToast('error', 'Error inesperado o de conexión al ejecutar la operación.');
                  } finally {
                    setIsConfirmingAction(false);
                  }
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 text-white text-xs font-bold uppercase rounded-lg cursor-pointer disabled:opacity-50 ${
                  confirmDialog.danger
                    ? 'bg-red-700 hover:bg-red-600'
                    : 'bg-primary-container hover:bg-cta-hover'
                }`}
              >
                {isConfirmingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                <span>{confirmDialog.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal oficial de gestión de Streaming Directo (retirado del Footer público) */}
      <StreamingModal
        isOpen={showStreamingModal}
        onClose={() => setShowStreamingModal(false)}
        isLive={streamingStatus.active}
        currentUrl={streamingStatus.url}
        matchId={streamingStatus.matchId}
        matchTitle={streamingStatus.matchTitle}
        onSuccess={updateLocalStatus}
      />
    </div>
  );
}
