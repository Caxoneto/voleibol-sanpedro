'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Copy,
  Search,
  Filter,
  LogOut,
  Camera,
  Tv,
  Newspaper,
  Check,
  RefreshCw,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Link as LinkIcon,
  Share2,
  Send,
  Bus,
  HeartPulse,
  ExternalLink,
  X,
  Save,
  FileText,
  CheckSquare,
  Square,
  Users,
  Layers,
  SendHorizontal,
  ClipboardCheck,
  FileDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { CLUB_INFO } from '@/lib/data-store';
import { generateConsentPdf } from '@/lib/pdf-consent';

interface BatchDirectConsentItem {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  birthYear: number | null;
  isMinor: boolean;
  isSigned: boolean;
  signerName: string;
  signerDni: string;
  signerRelationship: string;
  signerPhone: string;
  signerEmail: string;
  directToken: string;
  directUrl: string;
  whatsappText: string;
  whatsappUrl: string;
}

interface PlayerDashboardItem {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  birthYear: number | null;
  dniLast5: string | null;
  isMinor: boolean;
  isSigned: boolean;
  consentId?: string;
  signedAt?: string;
  signerName?: string;
  signerDni?: string;
  signerRelationship?: string;
  signerPhone?: string;
  signerEmail?: string;
  consentSocialMedia?: boolean;
  consentStreaming?: boolean;
  consentPress?: boolean;
  consentTravel?: boolean;
  medicalNotes?: string;
  documentHash?: string;
  signatureData?: string;
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
  };
  teams: TeamSummaryItem[];
  players: PlayerDashboardItem[];
}

export default function AdminConsentimientosPage() {
  // Estado de autenticación
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Formulario de login
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Datos del dashboard
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filtros, ordenación y búsqueda
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SIGNED' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: 'status' | 'image' | 'travel' | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  // Estados de acciones
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // Modal de Enlace Directo (Magic Link) y campos pre-rellenados
  const [directLinkPlayer, setDirectLinkPlayer] = useState<PlayerDashboardItem | null>(null);
  const [directLinkData, setDirectLinkData] = useState<{
    directUrl: string;
    directToken: string;
    whatsappText: string;
  } | null>(null);
  const [isLoadingDirectLink, setIsLoadingDirectLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Estados de los campos pre-rellenados
  const [prefillName, setPrefillName] = useState('');
  const [prefillDni, setPrefillDni] = useState('');
  const [prefillRelationship, setPrefillRelationship] = useState('MADRE');
  const [prefillPhone, setPrefillPhone] = useState('');
  const [prefillEmail, setPrefillEmail] = useState('');
  const [saveToCensus, setSaveToCensus] = useState(false);
  const [isUpdatingPrefill, setIsUpdatingPrefill] = useState(false);
  const [prefillNotice, setPrefillNotice] = useState<string | null>(null);

  // Abrir modal de enlace directo y generar token inicial con datos disponibles
  const handleOpenDirectLinkModal = async (player: PlayerDashboardItem) => {
    setDirectLinkPlayer(player);
    setDirectLinkData(null);
    setCopiedLink(false);
    setCopiedMsg(false);
    setPrefillNotice(null);
    setSaveToCensus(false);
    setIsLoadingDirectLink(true);

    try {
      const res = await fetch('/api/admin/direct-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.playerId }),
      });
      const json = await res.json();
      if (json.success) {
        setDirectLinkData({
          directUrl: json.directUrl,
          directToken: json.directToken,
          whatsappText: json.whatsappText,
        });

        // Cargar datos pre-rellenados obtenidos del censo o consentimiento previo
        const pre = json.prefilledData || {};
        setPrefillName(pre.signerName || (player.isMinor ? '' : player.playerName));
        setPrefillDni(pre.signerDni || '');
        setPrefillRelationship(pre.signerRelationship || (player.isMinor ? 'MADRE' : 'PROPIO_JUGADOR'));
        setPrefillPhone(pre.signerPhone || '');
        setPrefillEmail(pre.signerEmail || '');
      } else {
        alert(json.error || 'Error al generar enlace directo');
      }
    } catch {
      alert('Error de conexión al generar enlace directo');
    } finally {
      setIsLoadingDirectLink(false);
    }
  };

  // Actualizar el enlace directo y mensaje con datos modificados en el modal
  const handleUpdateDirectLink = async (persistToCensus: boolean = false) => {
    if (!directLinkPlayer) return;
    setIsUpdatingPrefill(true);
    setPrefillNotice(null);

    try {
      const res = await fetch('/api/admin/direct-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: directLinkPlayer.playerId,
          customPrefill: {
            signerName: prefillName.trim(),
            signerDni: prefillDni.trim().toUpperCase(),
            signerRelationship: prefillRelationship,
            signerPhone: prefillPhone.trim(),
            signerEmail: prefillEmail.trim(),
          },
          saveToCensus: persistToCensus,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setDirectLinkData({
          directUrl: json.directUrl,
          directToken: json.directToken,
          whatsappText: json.whatsappText,
        });
        if (persistToCensus) {
          setPrefillNotice('✓ Datos guardados en la ficha del censo del club y enlace actualizado.');
          loadDashboardData();
        } else {
          setPrefillNotice('✓ Enlace y WhatsApp actualizados con los nuevos datos.');
        }
        setTimeout(() => setPrefillNotice(null), 4000);
      } else {
        alert(json.error || 'Error al actualizar enlace');
      }
    } catch {
      alert('Error de conexión al actualizar enlace');
    } finally {
      setIsUpdatingPrefill(false);
    }
  };

  // Descargar Modelo Oficial en PDF con los datos pre-rellenados (Borrador en blanco para firma presencial)
  const handleDownloadDraftPdf = () => {
    if (!directLinkPlayer) return;

    const doc = generateConsentPdf({
      playerName: directLinkPlayer.playerName,
      teamName: directLinkPlayer.teamName,
      birthYear: directLinkPlayer.birthYear,
      isMinor: directLinkPlayer.isMinor,
      signerName: prefillName.trim(),
      signerDni: prefillDni.trim().toUpperCase(),
      signerRelationship: prefillRelationship,
      signerPhone: prefillPhone.trim(),
      signerEmail: prefillEmail.trim(),
      medicalNotes: '',
      isPrintableBlank: true,
    });

    const safeName = directLinkPlayer.playerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    doc.save(`autorizacion_presencial_${safeName}.pdf`);
  };

  // Estados para selección múltiple y gestión por lotes
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchDirectConsentItem[]>([]);
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [copiedBatchId, setCopiedBatchId] = useState<string | null>(null);
  const [copiedAllBatch, setCopiedAllBatch] = useState(false);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);

  // Filtrar elementos dentro del modal de lote
  const filteredBatchItems = useMemo(() => {
    if (!batchSearchQuery.trim()) return batchItems;
    const q = batchSearchQuery.toLowerCase().trim();
    return batchItems.filter(
      (it) =>
        it.playerName.toLowerCase().includes(q) ||
        it.teamName.toLowerCase().includes(q) ||
        (it.signerName && it.signerName.toLowerCase().includes(q)) ||
        (it.signerPhone && it.signerPhone.includes(q))
    );
  }, [batchItems, batchSearchQuery]);

  // Seleccionar o deseleccionar un jugador individual
  const handleToggleSelectPlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  // Seleccionar o deseleccionar todos los jugadores de la vista filtrada actual
  const handleToggleSelectAll = () => {
    if (selectedPlayerIds.length === filteredPlayers.length && filteredPlayers.length > 0) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(filteredPlayers.map((p) => p.playerId));
    }
  };

  // Abrir modal de generación por lotes (para selección o para equipo filtrado)
  const handleOpenBatchModal = async (customIds?: string[]) => {
    const idsToFetch = customIds && customIds.length > 0
      ? customIds
      : selectedPlayerIds.length > 0
      ? selectedPlayerIds
      : filteredPlayers.map((p) => p.playerId);

    if (idsToFetch.length === 0) {
      alert('Por favor, selecciona al menos un deportista o filtra por un equipo.');
      return;
    }

    setShowBatchModal(true);
    setIsLoadingBatch(true);
    setBatchItems([]);
    setBatchSearchQuery('');
    setCopiedAllBatch(false);
    setBatchNotice(null);

    try {
      const res = await fetch('/api/admin/direct-link-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: idsToFetch }),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        setBatchItems(json.items);
      } else {
        alert(json.error || 'Error al generar los enlaces por lote.');
      }
    } catch {
      alert('Error de conexión al generar lote de enlaces directos.');
    } finally {
      setIsLoadingBatch(false);
    }
  };

  // Exportar el lote completo a archivo Excel / CSV
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
      'Mensaje WhatsApp',
    ];

    const rows = batchItems.map((item) => [
      `"${item.teamName}"`,
      `"${item.playerName}"`,
      item.isMinor ? 'Menor' : 'Mayor (+18)',
      item.isSigned ? 'FIRMADO' : 'PENDIENTE',
      `"${item.signerName || ''}"`,
      `"${item.signerDni || ''}"`,
      `"${item.signerRelationship || ''}"`,
      `"${item.signerPhone || ''}"`,
      `"${item.signerEmail || ''}"`,
      `"${item.directUrl}"`,
      `"${item.whatsappText.replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lote_enlaces_autorizaciones_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copiar todos los enlaces y mensajes del lote al portapapeles
  const handleCopyAllBatchMessages = () => {
    if (batchItems.length === 0) return;

    const text = batchItems
      .map(
        (it) =>
          `📌 *${it.playerName}* (${it.teamName}) - ${it.isSigned ? '🟢 FIRMADO' : '🔴 PENDIENTE'}\n` +
          `Destinatario: ${it.signerName || 'Familia'} (${it.signerRelationship})\n` +
          (it.signerPhone ? `Tel: ${it.signerPhone}\n` : '') +
          `Enlace directo: ${it.directUrl}\n`
      )
      .join('\n────────────────────────────\n\n');

    navigator.clipboard.writeText(text);
    setCopiedAllBatch(true);
    setTimeout(() => setCopiedAllBatch(false), 3000);
  };

  // Cargar datos
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/consent');
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setIsAuthenticated(true);
      } else {
        setLoadError(json.error || 'Error al cargar los datos.');
      }
    } catch {
      setLoadError('Error de conexión al cargar datos.');
    } finally {
      setIsLoading(false);
      setCheckingAuth(false);
    }
  }, []);

  // Verificar sesión al inicio
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Manejar Login
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

      const json = await res.json();
      if (res.ok && json.success) {
        setIsAuthenticated(true);
        loadDashboardData();
      } else {
        setLoginError(json.error || 'Usuario o contraseña incorrectos.');
      }
    } catch {
      setLoginError('Error de conexión.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Manejar Logout
  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setData(null);
  };

  const handleSort = (key: 'status' | 'image' | 'travel') => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: 'asc' };
    });
  };

  // Filtrado y ordenación de jugadores
  const filteredPlayers = useMemo(() => {
    if (!data) return [];
    const list = data.players.filter((p) => {
      // Filtro de equipo
      if (selectedTeamFilter !== 'ALL' && p.teamId !== selectedTeamFilter) {
        return false;
      }
      // Filtro de estado
      if (statusFilter === 'SIGNED' && !p.isSigned) return false;
      if (statusFilter === 'PENDING' && p.isSigned) return false;

      // Búsqueda por texto (nombre deportista, nombre firmante o DNI firmante)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = p.playerName.toLowerCase().includes(query);
        const matchSignerDni = p.signerDni && p.signerDni.toLowerCase().includes(query);
        const matchSignerName = p.signerName && p.signerName.toLowerCase().includes(query);
        if (!matchName && !matchSignerDni && !matchSignerName) {
          return false;
        }
      }

      return true;
    });

    if (!sortConfig.key) return list;

    const getSortRank = (p: PlayerDashboardItem): number => {
      if (sortConfig.key === 'status') {
        return p.isSigned ? 1 : 0; // asc: Pendientes (0) primero, Completados (1) después
      }
      if (sortConfig.key === 'image') {
        if (!p.isSigned) return 0; // Sin firmar
        const allowed = !!(p.consentSocialMedia || p.consentStreaming || p.consentPress);
        return allowed ? 2 : 1; // asc: Pendiente (0) -> No (1) -> Sí (2)
      }
      if (sortConfig.key === 'travel') {
        if (!p.isSigned) return 0;
        const allowed = p.consentTravel !== false;
        return allowed ? 2 : 1;
      }
      return 0;
    };

    return [...list].sort((a, b) => {
      const rankA = getSortRank(a);
      const rankB = getSortRank(b);
      if (rankA !== rankB) {
        return sortConfig.direction === 'asc' ? rankA - rankB : rankB - rankA;
      }
      return a.playerName.localeCompare(b.playerName, 'es');
    });
  }, [data, selectedTeamFilter, statusFilter, searchQuery, sortConfig]);

  // Copiar recordatorio de WhatsApp
  const handleCopyWhatsAppReminder = () => {
    if (!data) return;

    const team = data.teams.find((t) => t.teamId === selectedTeamFilter);
    const teamName = team ? team.teamName : 'del club';
    const pendingPlayers = data.players.filter(
      (p) => (selectedTeamFilter === 'ALL' || p.teamId === selectedTeamFilter) && !p.isSigned
    );

    const pendingNames = pendingPlayers.slice(0, 8).map((p) => p.playerName).join(', ');
    const moreCount = pendingPlayers.length > 8 ? ` y ${pendingPlayers.length - 8} más` : '';

    const link = `https://voleibolsanpedro.es/autorizaciones${
      selectedTeamFilter !== 'ALL' ? `?equipo=${selectedTeamFilter}` : ''
    }`;

    const message = `🏐 *C.D. Voleibol San Pedro - Autorizaciones de Imagen*\n\nHola familias de *${teamName}*:\n\nPara cumplir con la normativa oficial de protección de datos (RGPD) en partidos, retransmisiones y fotos de equipo, os recordamos que aún nos faltan las firmas de:\n👉 *${pendingNames}${moreCount}*.\n\nPodéis completarlo en menos de 45 segundos desde el móvil con el dedo en pantalla aquí:\n🔗 ${link}\n\n¡Muchas gracias por vuestra colaboración! 💪🔴⚫`;

    navigator.clipboard.writeText(message);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  // Revocar autorización
  const handleRevoke = async (player: PlayerDashboardItem) => {
    if (!confirm(`¿Estás seguro de que deseas revocar la autorización de ${player.playerName}? El jugador volverá a figurar como PENDIENTE.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/consent', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.playerId }),
      });
      const json = await res.json();
      if (json.success) {
        loadDashboardData();
      } else {
        alert(json.error || 'Error al revocar');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  // Descargar PDF oficial de un jugador (Modelos Junta de Andalucía Anexo 05 y 06)
  const handleDownloadPdf = (player: PlayerDashboardItem) => {
    if (!player.isSigned) return;

    const doc = generateConsentPdf({
      consentId: player.consentId,
      playerName: player.playerName,
      teamName: player.teamName,
      birthYear: player.birthYear,
      isMinor: player.isMinor,
      signerName: player.signerName || '',
      signerDni: player.signerDni || '',
      signerRelationship: player.signerRelationship || '',
      signerPhone: player.signerPhone,
      signerEmail: player.signerEmail,
      consentSocialMedia: !!player.consentSocialMedia,
      consentStreaming: !!player.consentStreaming,
      consentPress: !!player.consentPress,
      consentTravel: player.consentTravel !== false,
      medicalNotes: player.medicalNotes,
      signatureData: player.signatureData,
      documentHash: player.documentHash,
      signedAt: player.signedAt,
    });

    const safeName = player.playerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    doc.save(`autorizaciones_junta_andalucia_${safeName}.pdf`);
  };

  // Exportar listado CSV
  const handleExportCsv = () => {
    if (!data) return;

    const headers = [
      'Equipo',
      'Deportista',
      'Año Nacimiento',
      'Condición',
      'Ficha DNI (últimos 4+letra)',
      'Estado Firma',
      'Fecha Firma',
      'Nombre Firmante',
      'DNI Firmante',
      'Parentesco',
      'Teléfono',
      'Email',
      'Cesión Imagen',
      'Desplazamientos',
      'Hash SHA256',
    ];

    const rows = filteredPlayers.map((p) => [
      `"${p.teamName}"`,
      `"${p.playerName}"`,
      p.birthYear || '',
      p.isMinor ? 'Menor' : 'Mayor',
      p.dniLast5 || '',
      p.isSigned ? 'FIRMADO' : 'PENDIENTE',
      p.signedAt ? `"${new Date(p.signedAt).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}"` : '',
      `"${p.signerName || ''}"`,
      `"${p.signerDni || ''}"`,
      `"${p.signerRelationship || ''}"`,
      `"${p.signerPhone || ''}"`,
      `"${p.signerEmail || ''}"`,
      p.isSigned ? (p.consentSocialMedia || p.consentStreaming || p.consentPress ? 'SI' : 'NO') : '',
      p.isSigned ? (p.consentTravel !== false ? 'SI' : 'NO') : '',
      `"${p.documentHash || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `censo_autorizaciones_cdv_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Pantalla de carga inicial
  if (checkingAuth) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center text-white">
        <div className="flex items-center gap-3 text-sm text-tertiary">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span>Verificando acceso a directiva...</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PANTALLA DE LOGIN PRIVADO (Si no está autenticado)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-container-lowest border border-white/10 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary/20 border border-primary/40 text-primary rounded-xl flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white uppercase tracking-wider">
              Acceso a Gestión Interna
            </h1>
            <p className="text-xs text-tertiary">
              Panel reservado para directiva y responsables del {CLUB_INFO.name}.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                Usuario
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
                placeholder="admin"
                className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg flex items-center gap-2 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-primary/20 cursor-pointer"
            >
              {isLoggingIn ? <span>Accediendo...</span> : <span>Iniciar Sesión</span>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DASHBOARD PRINCIPAL DE DIRECTIVA
  // =========================================================================
  return (
    <div className="w-full min-h-screen bg-background text-on-surface py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Barra Superior */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display-xl text-white uppercase tracking-tight">
            Control de Autorizaciones
          </h1>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap sm:flex-nowrap">
          <button
            onClick={() => loadDashboardData()}
            disabled={isLoading}
            className="p-2.5 bg-surface-container-high hover:bg-surface-container-highest border border-white/10 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => handleOpenBatchModal()}
            className="inline-flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-primary/30 transition-colors shadow-lg shadow-primary/20 cursor-pointer"
            title="Generar enlaces directos por lote para varios deportistas o equipo completo"
          >
            <Layers className="w-4 h-4" />
            <span>Generar Lote {selectedPlayerIds.length > 0 ? `(${selectedPlayerIds.length})` : ''}</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-emerald-500/30 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-200 text-xs font-bold uppercase tracking-wider rounded-lg border border-red-500/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
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
                <div className="bg-primary h-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-emerald-500/30 rounded-xl p-5 space-y-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block flex items-center justify-between">
                <span>Firmadas Oficiales</span>
                <span className="text-emerald-400 font-bold">{data.stats.percentSigned}%</span>
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display-xl text-emerald-400">{data.stats.totalSigned}</span>
                <span className="text-xs text-emerald-300/70">completadas</span>
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
                <span className="text-xs text-amber-300/70">familias por firmar</span>
              </div>
              <div className="w-full bg-amber-950 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full"
                  style={{ width: `${100 - data.stats.percentSigned}%` }}
                />
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
              <span className="text-[10px] text-tertiary block pt-1">
                Protocolo Marco de Menores (Junta de Andalucía).
              </span>
            </div>
          </div>
        )}

        {/* Semáforo por Equipos */}
        {data && (
          <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Progreso por Equipos (Haz clic en un equipo para filtrar)</span>
              </h2>
              {selectedTeamFilter !== 'ALL' && (
                <button
                  onClick={() => setSelectedTeamFilter('ALL')}
                  className="text-xs text-primary hover:underline font-semibold"
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
                    onClick={() => setSelectedTeamFilter(isSelected ? 'ALL' : t.teamId)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-primary/20 border-primary shadow-lg shadow-primary/10'
                        : isComplete
                        ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60'
                        : 'bg-surface-container-low border-white/10 hover:border-white/20'
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
                        className={`h-full ${isComplete ? 'bg-emerald-500' : 'bg-primary'}`}
                        style={{ width: `${t.percent}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Barra de Filtros y Recordatorio WhatsApp */}
        <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-tertiary absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por deportista, firmante o DNI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-low border border-white/15 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-primary placeholder-white/30"
              />
            </div>

            {/* Filtro de Estado */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-tertiary" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'SIGNED' | 'PENDING')}
                className="bg-surface-container-low border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="PENDING">🔴 Solo Pendientes</option>
                <option value="SIGNED">🟢 Solo Completados</option>
              </select>
            </div>

            {/* Botón WhatsApp */}
            <button
              onClick={handleCopyWhatsAppReminder}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
            >
              {copiedWhatsApp ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Mensaje Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Recordatorio WhatsApp</span>
                </>
              )}
            </button>
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
                onClick={() => setSelectedTeamFilter('ALL')}
                className="text-primary hover:underline font-semibold"
              >
                Limpiar filtro de equipo
              </button>
            </div>
          )}
        </div>

        {/* Barra Contextual de Acciones por Lote */}
        {selectedPlayerIds.length > 0 ? (
          <div className="bg-primary/15 border border-primary/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-primary/10">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <span>{selectedPlayerIds.length} deportistas seleccionados para acción múltiple</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenBatchModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Generar Enlaces ({selectedPlayerIds.length})</span>
              </button>
              <button
                onClick={() => setSelectedPlayerIds([])}
                className="px-3 py-2 bg-surface-container-high hover:bg-surface-container-highest text-white/80 hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Deseleccionar todos
              </button>
            </div>
          </div>
        ) : selectedTeamFilter !== 'ALL' ? (
          <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-tertiary">
              ¿Quieres generar o consultar los enlaces de todo el equipo{' '}
              <strong className="text-white">
                {data?.teams.find((t) => t.teamId === selectedTeamFilter)?.teamName}
              </strong>{' '}
              ({filteredPlayers.length} deportistas)?
            </div>
            <button
              onClick={() => handleOpenBatchModal(filteredPlayers.map((p) => p.playerId))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary text-primary hover:text-white border border-primary/30 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Generar Lote del Equipo Completo</span>
            </button>
          </div>
        ) : null}

        {/* Tabla de Jugadores */}
        <div className="bg-surface-container-lowest border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low border-b border-white/10 text-[11px] font-bold text-white uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="p-1 hover:text-primary transition-colors cursor-pointer"
                      title={
                        selectedPlayerIds.length === filteredPlayers.length && filteredPlayers.length > 0
                          ? 'Deseleccionar todos'
                          : 'Seleccionar todos'
                      }
                    >
                      {selectedPlayerIds.length === filteredPlayers.length && filteredPlayers.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-tertiary" />
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
                      title="Ordenar por Estado"
                    >
                      <span>Estado</span>
                      {sortConfig.key === 'status' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-tertiary/70" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Firmante / DNI</th>
                  <th className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleSort('image')}
                      className="inline-flex items-center justify-center gap-1.5 hover:text-primary transition-colors cursor-pointer uppercase"
                      title="Ordenar por Cesión de Imagen"
                    >
                      <span>Cesión Imagen</span>
                      {sortConfig.key === 'image' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-tertiary/70" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleSort('travel')}
                      className="inline-flex items-center justify-center gap-1.5 hover:text-primary transition-colors cursor-pointer uppercase"
                      title="Ordenar por Desplazamientos"
                    >
                      <span>Desplazamientos</span>
                      {sortConfig.key === 'travel' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-tertiary/70" />
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
                    <td colSpan={9} className="py-12 text-center text-sm text-tertiary">
                      No se han encontrado deportistas con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((p) => {
                    const isRowSelected = selectedPlayerIds.includes(p.playerId);
                    return (
                    <tr
                      key={p.playerId}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isRowSelected ? 'bg-primary/[0.08]' : ''
                      }`}
                    >
                      {/* Checkbox selector */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectPlayer(p.playerId)}
                          className="p-1 cursor-pointer transition-colors"
                          title={isRowSelected ? 'Deseleccionar' : 'Seleccionar'}
                        >
                          {isRowSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-white/30 hover:text-white" />
                          )}
                        </button>
                      </td>

                      {/* Deportista */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{p.playerName}</div>
                        <div className="text-[11px] text-tertiary">
                          Nac: {p.birthYear || 'N/D'} · {p.isMinor ? 'Menor' : 'Mayor (+18)'}
                        </div>
                      </td>

                      {/* Equipo */}
                      <td className="py-3.5 px-3 font-semibold text-white/90">
                        {p.teamName}
                      </td>

                      {/* Estado (únicamente Completado o Pendiente) */}
                      <td className="py-3.5 px-3">
                        {p.isSigned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Completado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-950/70 border border-red-500/40 text-red-300 whitespace-nowrap">
                            <Clock className="w-3 h-3 text-red-400" />
                            <span>Pendiente</span>
                          </span>
                        )}
                      </td>

                      {/* Firmante / DNI (siempre en dos líneas sin partir DNI) */}
                      <td className="py-3.5 px-3">
                        {p.isSigned ? (
                          <div className="min-w-[175px]">
                            <span className="font-semibold text-white block whitespace-nowrap">{p.signerName}</span>
                            <span className="text-[11px] text-tertiary block whitespace-nowrap">
                              {p.signerRelationship} · DNI: {p.signerDni}
                            </span>
                          </div>
                        ) : (
                          <span className="text-tertiary italic">-</span>
                        )}
                      </td>

                      {/* Cesión Integral de Imágenes */}
                      <td className="py-3.5 px-3 text-center">
                        {p.isSigned ? (
                          p.consentSocialMedia || p.consentStreaming || p.consentPress ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs" title="Autorizado para Cesión de Imagen">
                              <Camera className="w-3.5 h-3.5" />
                              <span>SÍ</span>
                            </span>
                          ) : (
                            <span className="text-red-400 font-bold bg-red-950/60 px-1.5 py-0.5 rounded text-[10px]" title="DENEGADA CESIÓN DE IMAGEN">
                              ✕ NO
                            </span>
                          )
                        ) : (
                          <span className="text-tertiary">-</span>
                        )}
                      </td>

                      {/* Desplazamientos y Asistencia Médica */}
                      <td className="py-3.5 px-3 text-center">
                        {p.isSigned ? (
                          p.consentTravel !== false ? (
                            <span className="inline-flex items-center gap-1 text-blue-400 font-bold text-xs" title="Autorizado para Desplazamientos y Viajes">
                              <Bus className="w-3.5 h-3.5" />
                              <span>SÍ</span>
                            </span>
                          ) : (
                            <span className="text-red-400 font-bold text-[10px] bg-red-950/60 px-1.5 py-0.5 rounded" title="NO AUTORIZADO PARA VIAJES">
                              ✕ NO
                            </span>
                          )
                        ) : (
                          <span className="text-tertiary">-</span>
                        )}
                      </td>

                      {/* Fecha de Firma */}
                      <td className="py-3.5 px-3 text-[11px] text-tertiary">
                        {p.signedAt ? (
                          new Date(p.signedAt).toLocaleDateString('es-ES', {
                            timeZone: 'Europe/Madrid',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        ) : (
                          <span>-</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón de Enlace Directo / WhatsApp (siempre accesible) */}
                          <button
                            onClick={() => handleOpenDirectLinkModal(p)}
                            className="p-1.5 bg-primary/20 hover:bg-primary text-primary hover:text-white border border-primary/30 rounded transition-colors cursor-pointer"
                            title="Generar Enlace Directo sin DNI / Enviar por WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {p.isSigned && (
                            <>
                              <button
                                onClick={() => handleDownloadPdf(p)}
                                className="p-1.5 bg-surface-container-high hover:bg-surface-container-highest text-white rounded transition-colors cursor-pointer"
                                title="Descargar Resguardo PDF Oficial (Junta de Andalucía)"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRevoke(p)}
                                className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded transition-colors cursor-pointer"
                                title="Revocar / Eliminar autorización"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
      {/* MODAL DE ENLACE DIRECTO (MAGIC LINK) Y DATOS PRE-RELLENADOS               */}
      {/* ========================================================================= */}
      {directLinkPlayer && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            {/* Cabecera */}
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold uppercase rounded">
                  ACCESO DIRECTO
                </span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Enlace y Documento Oficial Pre-rellenado
                </h3>
              </div>
              <button
                onClick={() => {
                  setDirectLinkPlayer(null);
                  setDirectLinkData(null);
                }}
                className="text-tertiary hover:text-white p-1 cursor-pointer transition-colors"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Datos del deportista */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-surface-container-low rounded-xl border border-white/5">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{directLinkPlayer.playerName}</span>
                  <span className="px-1.5 py-0.5 bg-white/10 text-white/90 text-[10px] font-semibold rounded">
                    {directLinkPlayer.teamName}
                  </span>
                </div>
                <div className="text-xs text-tertiary">
                  Nacimiento: {directLinkPlayer.birthYear || 'N/D'} · {directLinkPlayer.isMinor ? 'Menor de edad (Firma tutor legal)' : 'Mayor de edad (+18)'}
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
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary" />
                <p>Cargando datos del deportista y generando enlace seguro con firma criptográfica HMAC...</p>
              </div>
            ) : directLinkData ? (
              <div className="space-y-5">
                {/* Explicación y aviso */}
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs text-emerald-200 leading-relaxed">
                  Al abrir este enlace, el firmante accede directamente al formulario oficial con los datos del deportista pre-verificados por el Club y <strong>los campos ya completados para ahorrarle tener que escribirlos</strong>. Solo debe revisarlos y firmar en pantalla.
                </div>

                {/* Formulario de Campos Pre-rellenados Editables */}
                <div className="space-y-3 p-4 bg-surface-container-low/60 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Edit2 className="w-3.5 h-3.5 text-primary" />
                      <span>Datos del Firmante para Pre-rellenar</span>
                    </span>
                    <span className="text-[11px] text-tertiary">
                      {directLinkPlayer.isMinor ? 'Padre / Madre / Tutor' : 'Deportista (+18)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Nombre y Apellidos */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1">
                        Nombre y Apellidos del Firmante
                      </label>
                      <input
                        type="text"
                        value={prefillName}
                        onChange={(e) => setPrefillName(e.target.value)}
                        placeholder="Nombre completo"
                        className="w-full bg-surface-container-high border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary"
                      />
                    </div>

                    {/* DNI / NIE */}
                    <div>
                      <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1">
                        DNI / NIE Firmante
                      </label>
                      <input
                        type="text"
                        value={prefillDni}
                        onChange={(e) => setPrefillDni(e.target.value.toUpperCase())}
                        placeholder="12345678A"
                        className="w-full bg-surface-container-high border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-primary"
                      />
                    </div>

                    {/* Parentesco */}
                    <div>
                      <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1">
                        Parentesco / Condición
                      </label>
                      <select
                        value={prefillRelationship}
                        onChange={(e) => setPrefillRelationship(e.target.value)}
                        className="w-full bg-surface-container-high border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
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

                    {/* Teléfono */}
                    <div>
                      <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1">
                        Teléfono Móvil
                      </label>
                      <input
                        type="tel"
                        value={prefillPhone}
                        onChange={(e) => setPrefillPhone(e.target.value)}
                        placeholder="600 000 000"
                        className="w-full bg-surface-container-high border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={prefillEmail}
                        onChange={(e) => setPrefillEmail(e.target.value)}
                        placeholder="contacto@ejemplo.com"
                        className="w-full bg-surface-container-high border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Acciones de prefill */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                      <input
                        type="checkbox"
                        checked={saveToCensus}
                        onChange={(e) => setSaveToCensus(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-surface-container-high text-primary focus:ring-primary"
                      />
                      <span>Guardar permanentemente en la ficha del censo del club</span>
                    </label>

                    <button
                      type="button"
                      disabled={isUpdatingPrefill}
                      onClick={() => handleUpdateDirectLink(saveToCensus)}
                      className="px-3.5 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isUpdatingPrefill ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Actualizando...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Actualizar Enlace y WhatsApp</span>
                        </>
                      )}
                    </button>
                  </div>

                  {prefillNotice && (
                    <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-xs text-emerald-200">
                      {prefillNotice}
                    </div>
                  )}
                </div>

                {/* Enlace Directo Generado */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-white/80 uppercase tracking-wider">
                      Enlace Directo Generado
                    </label>
                    <span className="text-[11px] text-tertiary">Válido 30 días</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={directLinkData.directUrl}
                      className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white/90 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(directLinkData.directUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2500);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                        copiedLink
                          ? 'bg-emerald-600 text-white'
                          : 'bg-surface-container-high hover:bg-surface-container-highest text-white'
                      }`}
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                    </button>
                    <a
                      href={directLinkData.directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-surface-container-high hover:bg-surface-container-highest text-white rounded-lg transition-colors shrink-0 cursor-pointer"
                      title="Abrir y probar enlace en nueva pestaña"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Compartir por WhatsApp */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <label className="block text-xs font-bold text-white/80 uppercase tracking-wider">
                    Compartir por WhatsApp con la Familia
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(directLinkData.whatsappText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 px-4 bg-[#25D366] hover:bg-[#20ba59] text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors inline-flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Enviar por WhatsApp</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(directLinkData.whatsappText);
                        setCopiedMsg(true);
                        setTimeout(() => setCopiedMsg(false), 2500);
                      }}
                      className="py-2.5 px-3 bg-surface-container-high hover:bg-surface-container-highest text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      {copiedMsg ? 'Mensaje Copiado' : 'Copiar Mensaje'}
                    </button>
                  </div>
                </div>

                {/* Descargar Documento Oficial PDF Pre-rellenado (Junta de Andalucía) */}
                <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-tertiary">
                    ¿Necesitas el documento impreso para firma presencial en papel?
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadDraftPdf}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-surface-container-high hover:bg-surface-container-highest text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer border border-white/10"
                  >
                    <Download className="w-4 h-4 text-primary" />
                    <span>Descargar PDF Pre-rellenado</span>
                  </button>
                </div>
              </div>
            ) : null}

            <div className="pt-3 border-t border-white/10 text-right">
              <button
                type="button"
                onClick={() => {
                  setDirectLinkPlayer(null);
                  setDirectLinkData(null);
                }}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-white/80 text-xs font-bold uppercase rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL DE GENERACIÓN MÚLTIPLE DE ENLACES DIRECTOS (POR LOTE O EQUIPO)      */}
      {/* ========================================================================= */}
      {showBatchModal && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest border border-white/10 rounded-2xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl my-6 max-h-[92vh] flex flex-col">
            {/* Cabecera */}
            <div className="flex justify-between items-center border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold uppercase rounded">
                  LOTE DE ENLACES
                </span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Generación Múltiple de Enlaces Directos Oficiales
                </h3>
                {batchItems.length > 0 && (
                  <span className="px-2 py-0.5 bg-white/10 text-white/90 text-xs font-semibold rounded-full">
                    {batchItems.length} deportistas
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setShowBatchModal(false);
                  setBatchItems([]);
                  setBatchSearchQuery('');
                }}
                className="text-tertiary hover:text-white p-1 cursor-pointer transition-colors"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingBatch ? (
              <div className="py-16 text-center text-xs text-tertiary space-y-3 shrink-0">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                <p className="text-sm text-white font-semibold">Generando enlaces directos con tokens criptográficos HMAC...</p>
                <p className="text-xs text-tertiary">Recuperando datos del censo y estado de firmas de cada deportista seleccionado.</p>
              </div>
            ) : batchItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-tertiary">
                No se obtuvieron deportistas para generar enlaces.
              </div>
            ) : (
              <>
                {/* Barra de utilidades del lote */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface-container-low rounded-xl border border-white/5 shrink-0">
                  {/* Buscador interno */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-tertiary absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por jugador, equipo, tutor o teléfono en este lote..."
                      value={batchSearchQuery}
                      onChange={(e) => setBatchSearchQuery(e.target.value)}
                      className="w-full bg-surface-container-high border border-white/15 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyAllBatchMessages}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-container-highest text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-white/10 transition-colors cursor-pointer"
                      title="Copiar lista resumida con enlaces directos para enviar por canales privados"
                    >
                      {copiedAllBatch ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>¡Copiados!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Todos</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleExportBatchCsv}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700/90 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-emerald-500/30 transition-colors cursor-pointer shadow-md"
                      title="Descargar hoja Excel/CSV con los datos, teléfonos y enlaces directos"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Descargar Excel / CSV</span>
                    </button>
                  </div>
                </div>

                {/* Lista scrolleable de tarjetas individuales */}
                <div className="overflow-y-auto space-y-2.5 pr-1 flex-1 min-h-[300px]">
                  {filteredBatchItems.map((item) => (
                    <div
                      key={item.playerId}
                      className="p-3.5 bg-surface-container-low/70 border border-white/10 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-white/20 transition-colors"
                    >
                      {/* Info del deportista */}
                      <div className="space-y-1 min-w-[220px]">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{item.playerName}</span>
                          <span className="px-1.5 py-0.5 bg-white/10 text-white/80 text-[10px] font-semibold rounded">
                            {item.teamName}
                          </span>
                        </div>
                        <div className="text-xs text-tertiary flex items-center gap-2">
                          <span>{item.isMinor ? 'Menor' : 'Mayor (+18)'}</span>
                          <span>•</span>
                          {item.isSigned ? (
                            <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Firmado
                            </span>
                          ) : (
                            <span className="text-amber-400 font-semibold inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Pendiente
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-white/70">
                          {item.signerName ? (
                            <span>
                              {item.signerName} ({item.signerRelationship})
                              {item.signerPhone ? ` · Tel: ${item.signerPhone}` : ''}
                            </span>
                          ) : (
                            <span className="text-white/40 italic">Sin datos de contacto en censo</span>
                          )}
                        </div>
                      </div>

                      {/* Enlace y acciones */}
                      <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={item.directUrl}
                          className="flex-1 bg-surface-container-high border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-white/80 select-all"
                        />

                        <div className="flex items-center gap-1.5 shrink-0 justify-end">
                          {/* Copiar enlace individual */}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(item.directUrl);
                              setCopiedBatchId(item.playerId);
                              setTimeout(() => setCopiedBatchId(null), 2000);
                            }}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                              copiedBatchId === item.playerId
                                ? 'bg-emerald-600 text-white'
                                : 'bg-surface-container-high hover:bg-surface-container-highest text-white/90'
                            }`}
                            title="Copiar enlace directo"
                          >
                            {copiedBatchId === item.playerId ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">
                              {copiedBatchId === item.playerId ? 'Copiado' : 'Copiar'}
                            </span>
                          </button>

                          {/* Enviar WhatsApp individual */}
                          <a
                            href={item.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-black text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer shadow-sm"
                            title="Abrir WhatsApp para enviar a la familia"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>

                          {/* Abrir en pestaña nueva */}
                          <a
                            href={item.directUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-surface-container-high hover:bg-surface-container-highest text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Abrir y probar formulario oficial"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pie del modal */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
              <span className="text-xs text-tertiary">
                Los enlaces son válidos durante 30 días con firma criptográfica HMAC sin requerir DNI.
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowBatchModal(false);
                  setBatchItems([]);
                  setBatchSearchQuery('');
                }}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-white/80 text-xs font-bold uppercase rounded-lg cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
