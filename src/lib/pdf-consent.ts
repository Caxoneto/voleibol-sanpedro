import { jsPDF } from 'jspdf';
import { CLUB_INFO } from './club-info';
import { CLUB_LOGO_BASE64 } from './club-logo-base64';
import { computeAgeInMadrid, formatMadridTime, getCurrentMadridYear, parseBirthDateParts } from './date-utils';
import type { SignatureMethod } from './consent-store';

export interface ConsentPdfData {
  consentId?: string;
  playerName: string;
  teamName: string;
  birthYear?: number | null;
  birthDate?: string | null;
  isMinor: boolean;
  isMinor14To17?: boolean;
  signerName: string;
  signerDni: string;
  signerRelationship: string;
  signerPhone?: string;
  signerEmail?: string;
  minorSignerName?: string;
  minorSignerDni?: string;
  minorSignatureData?: string;
  consentImage?: boolean;
  consentSocialMedia?: boolean;
  consentStreaming?: boolean;
  consentPress?: boolean;
  consentTravel?: boolean;
  signatureMethod?: SignatureMethod;
  signatureData?: string;
  documentHash?: string;
  signedAt?: string;
  /** Cuando es true, emite modelo en blanco/pre-relleno para firma presencial en papel SIN sello ni hash HMAC. */
  isPrintableBlank?: boolean;
}

const SYNTHETIC_1X1_PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function drawDecisionRow(
  doc: jsPDF,
  margin: number,
  y: number,
  contentWidth: number,
  label: string,
  isAllowed: boolean,
  isPrintableBlank: boolean
): number {
  const rowH = 6.6;

  if (isPrintableBlank) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, rowH, 0.8, 0.8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.1);
    doc.setTextColor(30, 41, 59);
    const labelFit = doc.splitTextToSize(label, contentWidth - 68)[0] || label;
    doc.text(labelFit, margin + 3.5, y + 4.4);

    const boxSize = 3.1;
    const boxY = y + 1.75;
    const noBoxX = margin + contentWidth - 27;
    const yesBoxX = noBoxX - 30;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.35);
    doc.rect(yesBoxX, boxY, boxSize, boxSize, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text('SÍ AUTORIZO', yesBoxX + boxSize + 1.8, y + 4.4);

    doc.setFillColor(255, 255, 255);
    doc.rect(noBoxX, boxY, boxSize, boxSize, 'FD');
    doc.text('NO AUTORIZO', noBoxX + boxSize + 1.8, y + 4.4);

    doc.setLineWidth(0.2);
  } else {
    doc.setFillColor(isAllowed ? 240 : 254, isAllowed ? 253 : 242, isAllowed ? 244 : 242);
    doc.setDrawColor(isAllowed ? 110 : 248, isAllowed ? 231 : 113, isAllowed ? 183 : 113);
    doc.roundedRect(margin, y, contentWidth, rowH, 0.8, 0.8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.1);
    doc.setTextColor(20, 20, 25);
    const labelFit = doc.splitTextToSize(label, contentWidth - 40)[0] || label;
    doc.text(labelFit, margin + 3.5, y + 4.4);

    doc.setTextColor(isAllowed ? 6 : 185, isAllowed ? 95 : 28, isAllowed ? 70 : 28);
    doc.text(
      isAllowed ? '[ SÍ AUTORIZADO ]' : '[ NO AUTORIZADO ]',
      margin + contentWidth - 3.5,
      y + 4.4,
      { align: 'right' }
    );
  }

  return y + rowH;
}

function getSignatureImageFormat(dataUrl?: string): 'PNG' | 'JPEG' | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  if (dataUrl.includes(SYNTHETIC_1X1_PIXEL)) return null;
  if (dataUrl.startsWith('data:image/png;base64,')) return 'PNG';
  if (dataUrl.startsWith('data:image/jpeg;base64,')) return 'JPEG';
  return null;
}

function formatMadridDateTimeFull(isoInput?: string): string {
  const target = isoInput ? new Date(isoInput) : new Date();
  const safeDate = Number.isNaN(target.getTime()) ? new Date() : target;
  const datePart = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(safeDate);
  return `${datePart} ${formatMadridTime(safeDate)}`;
}

/**
 * Genera el documento oficial unificado de autorizaciones deportivas en UNA SOLA PÁGINA (A4):
 * - 2 decisiones binarias independientes sin preselección ni opt-out tácito: Anexo 05 (Imágenes) y Anexo 06 (Desplazamientos).
 * - Firma única del padre/madre/tutor legal para menores (<18), con asentimiento e información de oposición para 14-17 años (mantiene soporte de lectura histórica si existe trazo legado del menor).
 * - Calificación jurídica exacta como Firma Electrónica Simple (Reg. eIDAS 910/2014) en vía electrónica o Custodia Presencial en vía manuscrita.
 * - Modelo imprimible limpio sin huella ni sello criptográfico cuando `isPrintableBlank === true`.
 */
export function generateConsentPdf(data: ConsentPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 13;
  const contentWidth = pageWidth - margin * 2; // 184 mm

  const madridYear = getCurrentMadridYear();
  const ageEval = computeAgeInMadrid(data.birthDate, data.birthYear);
  const resolvedYear = data.birthYear ?? parseBirthDateParts(data.birthDate)?.year ?? null;
  const ageDisplay = ageEval.age ?? (resolvedYear ? madridYear - resolvedYear : null);

  const isPrintableBlank = Boolean(data.isPrintableBlank);
  const hasRealMinorSignature = Boolean(
    data.minorSignatureData && !data.minorSignatureData.includes(SYNTHETIC_1X1_PIXEL)
  );
  const isMinor14To17 = Boolean(
    data.isMinor14To17 ?? (data.isMinor && (ageEval.isMinor14To17 || hasRealMinorSignature))
  );

  // Evaluación estricta opt-in (nunca COALESCE(..., true) ni !== false)
  const socialAllowed = data.consentSocialMedia === true;
  const streamingAllowed = data.consentStreaming === true;
  const pressAllowed = data.consentPress === true;
  const imageAllowed =
    data.consentImage !== undefined
      ? data.consentImage === true
      : socialAllowed || streamingAllowed || pressAllowed;
  const hasMixedLegacyImage =
    !isPrintableBlank &&
    data.consentImage === undefined &&
    (socialAllowed !== streamingAllowed || streamingAllowed !== pressAllowed);
  const travelAllowed = data.consentTravel === true;

  const dateFormatted = formatMadridDateTimeFull(data.signedAt);

  const methodLabel =
    data.signatureMethod === 'OTP_EMAIL'
      ? 'Firma Electrónica Simple (OTP + Trazo + HMAC-SHA256 · Art. 3.10 y 25.1 eIDAS)'
      : data.signatureMethod === 'PRESENCIAL'
      ? 'Firma Manuscrita Presencial (Secretaría del Club)'
      : 'Portal Oficial Web (Firma Electrónica Simple · Reg. eIDAS 910/2014)';

  // =========================================================================
  // 1. CABECERA INSTITUCIONAL
  // =========================================================================
  let y = 10;
  try {
    doc.addImage(CLUB_LOGO_BASE64, 'JPEG', margin, y, 15, 10);
  } catch {
    doc.setFillColor(180, 10, 20);
    doc.rect(margin, y, 3.5, 10, 'F');
  }

  const textX = margin + 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(180, 10, 20);
  doc.text(CLUB_INFO.name.toUpperCase(), textX, y + 3.1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(75, 75, 80);
  doc.text(`CIF: ${CLUB_INFO.cif} · Sede: ${CLUB_INFO.venueName}`, textX, y + 6.6);
  doc.text(`Email: ${CLUB_INFO.contactEmail} · Web: voleibolsanpedro.es`, textX, y + 9.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(60, 65, 75);
  doc.text('JUNTA DE ANDALUCÍA', margin + contentWidth, y + 3.1, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.1);
  doc.setTextColor(90, 95, 105);
  doc.text('Consejería de Cultura y Deporte', margin + contentWidth, y + 6.5, { align: 'right' });
  doc.text('Protocolo Marco de Menores · Orden 18/11/2024', margin + contentWidth, y + 9.7, { align: 'right' });

  y += 12.8;
  doc.setDrawColor(215, 215, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentWidth, y);

  // =========================================================================
  // 2. TÍTULO UNIFICADO DEL DOCUMENTO
  // =========================================================================
  y += 3.2;
  doc.setFillColor(248, 249, 252);
  doc.setDrawColor(210, 215, 225);
  doc.roundedRect(margin, y, contentWidth, 9.4, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 10, 20);
  doc.text('AUTORIZACIÓN OFICIAL DE IMAGEN Y DESPLAZAMIENTOS DEPORTIVOS', margin + 3.5, y + 4.1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(55, 55, 60);
  doc.text(
    isPrintableBlank
      ? 'Temporada 2026/2027 · Modelo Oficial Imprimible para Firma Presencial en Papel (Sin Sello Digital)'
      : 'Temporada Oficial 2026/2027 · C.D. Voleibol San Pedro · Documento Oficial de Consentimiento',
    margin + 3.5,
    y + 7.7
  );

  y += 13.5;

  // =========================================================================
  // 3. BLOQUE 1: DATOS IDENTIFICATIVOS Y DE REPRESENTACIÓN
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 30, 30);
  doc.text('1. DATOS IDENTIFICATIVOS Y DE REPRESENTACIÓN', margin, y);
  y += 2.4;

  const idBoxH = 26.5;
  doc.setFillColor(252, 252, 254);
  doc.setDrawColor(220, 222, 228);
  doc.roundedRect(margin, y, contentWidth, idBoxH, 1, 1, 'FD');

  const dividerX = margin + 88;
  doc.setDrawColor(230, 232, 238);
  doc.line(dividerX, y + 2, dividerX, y + idBoxH - 2);

  // Columna 1: Deportista
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(180, 10, 20);
  doc.text('DATOS DEL/DE LA DEPORTISTA:', margin + 3.5, y + 4.5);

  const playerColW = 64;
  doc.setFontSize(6.7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('Nombre:', margin + 3.5, y + 8.6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  const playerLines = doc.splitTextToSize(data.playerName || '—', playerColW).slice(0, 2);
  doc.text(playerLines, margin + 20, y + 8.6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('Equipo:', margin + 3.5, y + 14.9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  const teamLines = doc.splitTextToSize(data.teamName || '—', playerColW).slice(0, 2);
  doc.text(teamLines, margin + 20, y + 14.9);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('Edad:', margin + 3.5, y + 21.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  const ageSuffix = ageDisplay !== null ? `${ageDisplay} años · ` : '';
  const ageStr =
    resolvedYear !== null
      ? data.isMinor
        ? isMinor14To17
          ? `${resolvedYear} (${ageSuffix}Menor 14-17)`
          : `${resolvedYear} (${ageSuffix}Menor <14)`
        : `${resolvedYear} (Mayor de edad)`
      : isPrintableBlank
        ? data.isMinor
          ? 'Año nac.: ______ · Menor de edad'
          : 'Año nac.: ______ · Mayor de edad'
        : data.isMinor
          ? isMinor14To17
            ? 'No consta · Menor 14-17'
            : 'No consta · Menor <14'
          : 'No consta · Mayor de edad';
  doc.text(doc.splitTextToSize(ageStr, playerColW).slice(0, 2), margin + 20, y + 21.2);

  // Columna 2: Representante / Firmante
  const col2X = dividerX + 3.5;
  const col2ValW = margin + contentWidth - (col2X + 18) - 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(180, 10, 20);
  doc.text('PERSONA FIRMANTE / TUTOR LEGAL:', col2X, y + 4.5);

  doc.setFontSize(6.7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('Nombre:', col2X, y + 8.6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  const signerNameDisplay = data.signerName || (isPrintableBlank ? '____________________________' : 'Deportista / Tutor');
  doc.text(doc.splitTextToSize(signerNameDisplay, col2ValW).slice(0, 2), col2X + 18, y + 8.6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('DNI / NIE:', col2X, y + 14.9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  const dniText = data.signerDni
    ? `${data.signerDni} (${data.signerRelationship || 'TUTOR'})`
    : isPrintableBlank
    ? `_______________ (${data.signerRelationship || 'TUTOR'})`
    : `N/D (${data.signerRelationship || 'TUTOR'})`;
  doc.text(doc.splitTextToSize(dniText, col2ValW).slice(0, 2), col2X + 18, y + 14.9);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('Contacto:', col2X, y + 21.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  const contactStr =
    data.signerPhone || data.signerEmail
      ? `${data.signerPhone || '—'} · ${data.signerEmail || '—'}`
      : isPrintableBlank
      ? 'Tel: ____________ · Email: ________________'
      : 'Registrado en censo';
  doc.setFontSize(6.1);
  doc.text(doc.splitTextToSize(contactStr, col2ValW).slice(0, 2), col2X + 18, y + 21.2);

  y += idBoxH + 3.8;

  // =========================================================================
  // 4. BLOQUE 2: TRATAMIENTO Y DIFUSIÓN DE IMÁGENES (ANEXO 05)
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 30, 30);
  doc.text('2. AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS E IMÁGENES DEPORTIVAS', margin, y);
  y += 2.3;

  const imgText =
    `Captación, tratamiento y difusión de fotografías o vídeos del/de la deportista en folletos, cartelería, memoria del ${CLUB_INFO.name}, web oficial, redes sociales institucionales, Apps deportivas, retransmisiones oficiales (vídeos/streaming), pósters, estadísticas y medios de comunicación (prensa escrita y audiovisual), tomados exclusivamente durante competiciones oficiales de ámbito autonómico y nacional, concentraciones, entrenamientos y eventos deportivos del Club para la promoción de su actividad deportiva sin ánimo de lucro, respetando su dignidad y honor personal (LO 1/1982, RGPD Art. 6.1.a, LOPDGDD Art. 7 y Orden 18/11/2024 Junta de Andalucía). Prohibido todo uso comercial o cesión a patrocinadores.`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.7);
  const splitImg = doc.splitTextToSize(imgText, contentWidth - 7);
  const imgBoxH = splitImg.length * 2.95 + 3.8;

  doc.setFillColor(252, 252, 254);
  doc.setDrawColor(220, 222, 228);
  doc.roundedRect(margin, y, contentWidth, imgBoxH, 0.9, 0.9, 'FD');
  doc.setTextColor(45, 45, 50);
  doc.text(splitImg, margin + 3.5, y + 3.8);

  y += imgBoxH + 2.2;

  if (hasMixedLegacyImage) {
    y = drawDecisionRow(
      doc,
      margin,
      y,
      contentWidth,
      '2.1 Web oficial y Redes Sociales institucionales del C.D. Voleibol San Pedro:',
      socialAllowed,
      isPrintableBlank
    );
    y += 1.5;
    y = drawDecisionRow(
      doc,
      margin,
      y,
      contentWidth,
      '2.2 Retransmisiones oficiales de partidos en directo o diferido (Streaming):',
      streamingAllowed,
      isPrintableBlank
    );
    y += 1.5;
    y = drawDecisionRow(
      doc,
      margin,
      y,
      contentWidth,
      '2.3 Prensa local, crónicas informativas y medios de comunicación deportivos:',
      pressAllowed,
      isPrintableBlank
    );
  } else {
    y = drawDecisionRow(
      doc,
      margin,
      y,
      contentWidth,
      '2.1 Tratamiento y difusión de imágenes deportivas para promoción del Club:',
      imageAllowed,
      isPrintableBlank
    );
  }

  y += 3.8;

  // =========================================================================
  // 5. BLOQUE 3: DESPLAZAMIENTOS Y VIAJES DEPORTIVOS OFICIALES (ANEXO 06)
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 30, 30);
  doc.text('3. AUTORIZACIÓN FAMILIAR PARA DESPLAZAMIENTOS Y VIAJES OFICIALES', margin, y);
  y += 2.3;

  const travelText =
    `Alcance normativo: Participación y traslado del/de la deportista en autobuses fletados o vehículos oficiales designados por el ${CLUB_INFO.name} para asistir a partidos FAVB/AFADE, concentraciones, Campeonatos de Andalucía (CADEBA) y torneos oficiales durante la temporada 2026/2027 bajo supervisión de entrenadores y delegados acreditados (Orden 18/11/2024 Junta de Andalucía, Ley 5/2016 del Deporte de Andalucía, Arts. 154-156 CC y R.D. 443/2001).`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.7);
  const splitTravel = doc.splitTextToSize(travelText, contentWidth - 7);
  const travelBoxH = splitTravel.length * 2.95 + 3.8;

  doc.setFillColor(252, 252, 254);
  doc.setDrawColor(220, 222, 228);
  doc.roundedRect(margin, y, contentWidth, travelBoxH, 0.9, 0.9, 'FD');
  doc.setTextColor(45, 45, 50);
  doc.text(splitTravel, margin + 3.5, y + 3.8);

  y += travelBoxH + 2.2;

  y = drawDecisionRow(
    doc,
    margin,
    y,
    contentWidth,
    '3.1 Desplazamientos y viajes deportivos oficiales con el Club:',
    travelAllowed,
    isPrintableBlank
  );

  y += 3.8;

  // =========================================================================
  // 6. BLOQUE 4: INFORMACIÓN BÁSICA DE PROTECCIÓN DE DATOS (RGPD ART. 13)
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(30, 30, 30);
  doc.text('4. INFORMACIÓN BÁSICA DE PROTECCIÓN DE DATOS (RGPD ART. 13 · LOPDGDD ART. 11)', margin, y);
  y += 2.8;

  const rgpdText =
    `Responsable: SAN PEDRO C.D VOLEIBOL (${CLUB_INFO.name}) · CIF: ${CLUB_INFO.cif} · ${CLUB_INFO.officialAddress} · ${CLUB_INFO.contactEmail}. Finalidades y Base Jurídica: Gestión federativa y administrativa (Art. 6.1.b y 6.1.c RGPD; Ley 5/2016; LOPIVI; Arts. 154-156 CC), y tanto la captación/difusión no lucrativa de imágenes deportivas como los desplazamientos oficiales basados únicamente en el consentimiento expreso y voluntario (Art. 6.1.a RGPD, Art. 7 LOPDGDD, LO 1/1982; denegarlas no impide la práctica deportiva, Art. 13.2.e RGPD). Destinatarios y Encargados: FAVB/RFEVB, Liga AFADE, aseguradora deportiva obligatoria y Patronato Municipal de Deportes de Marbella (prohibida la cesión comercial); Neon Frankfurt (UE), Zoho Mail (UE) y Netlify Inc. (EE. UU., DPF/SCC). Conservación: Vigencia deportiva y bloqueo legal durante 4-5 años tras la baja o mayoría de edad (Art. 9.5 LO 1/1982, Art. 1964 CC y Art. 32 LOPDGDD) con supresión o crypto-shredding posterior. Derechos y Revocación: Acceso, rectificación, supresión, limitación, portabilidad, oposición (incluida oposición personal del mayor de 14 años) y retirada sin efecto retroactivo en el portal OTP o vía ${CLUB_INFO.contactEmail}, y reclamación ante la AEPD (www.aepd.es).`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(65, 65, 72);
  const splitRgpd = doc.splitTextToSize(rgpdText, contentWidth);
  doc.text(splitRgpd, margin, y);

  y += splitRgpd.length * 2.75 + 3.2;

  // =========================================================================
  // 7. BLOQUE 5: DECLARACIÓN RESPONSABLE Y FIRMA
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(30, 30, 30);
  doc.text('5. DECLARACIÓN RESPONSABLE Y FIRMA', margin, y);
  y += 2.8;

  const declText = data.isMinor
    ? isMinor14To17
      ? 'La persona firmante declara bajo su exclusiva responsabilidad ostentar la patria potestad o tutela legal del/de la deportista de 14 a 17 años (Arts. 154-156 CC; Art. 7.1 LOPDGDD), actuando con conformidad del otro progenitor; decide sobre los desplazamientos oficiales y, habiendo informado al/a la deportista y contando con su conocimiento y asentimiento (Art. 3.1 LO 1/1982), presta el consentimiento de imagen conforme a la Orden 18/11/2024 de la Junta de Andalucía, constando el derecho personal del/de la menor >=14 años a oponerse o revocar su imagen en cualquier momento.'
      : 'La persona firmante declara bajo su exclusiva responsabilidad ostentar la patria potestad o tutela legal del/de la deportista menor de edad (Arts. 154-156 CC y Art. 7.2 LOPDGDD), actuando con conformidad del otro progenitor, y otorga consentimiento libre, informado, específico e inequívoco en materia de imagen y desplazamientos conforme a la Orden 18/11/2024 de la Junta de Andalucía.'
    : 'El/la deportista mayor de edad declara bajo su responsabilidad haber leído la información legal y presta su consentimiento libre, informado, específico e inequívoco en los apartados seleccionados.';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(45, 45, 50);
  const splitDecl = doc.splitTextToSize(declText, contentWidth);
  doc.text(splitDecl, margin, y);

  y += splitDecl.length * 2.85 + 2.5;

  const signBoxH = 31;
  const showDualSignature = Boolean(isMinor14To17 && hasRealMinorSignature);

  const renderSignatureBox = (
    x: number,
    w: number,
    title: string,
    imgData?: string,
    placeholderCaption?: string
  ) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(210, 215, 225);
    doc.roundedRect(x, y, w, signBoxH, 0.9, 0.9, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.1);
    doc.setTextColor(90, 95, 105);
    doc.text(doc.splitTextToSize(title, w - 5)[0] || title, x + 2.5, y + 3.9);

    const imgFmt = !isPrintableBlank ? getSignatureImageFormat(imgData) : null;
    if (imgFmt && imgData) {
      try {
        doc.addImage(imgData, imgFmt, x + 2.5, y + 4.8, w - 5, signBoxH - 6.8);
        return;
      } catch {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.2);
        doc.setTextColor(140, 140, 145);
        doc.text('(Trazo digital registrado)', x + 4, y + 15);
        return;
      }
    }

    if (!isPrintableBlank && data.signatureMethod === 'PRESENCIAL') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.4);
      doc.setTextColor(22, 101, 52);
      doc.text('ORIGINAL EN PAPEL', x + 4, y + 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.7);
      doc.setTextColor(100, 100, 105);
      doc.text('Custodia en Secretaría', x + 4, y + 17);
      return;
    }

    doc.setDrawColor(180, 180, 185);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(x + 4, y + 18.5, x + w - 4, y + 18.5);
    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.8);
    doc.setTextColor(135, 135, 145);
    doc.text(
      doc.splitTextToSize(placeholderCaption || 'Firma manuscrita', w - 6)[0] || 'Firma',
      x + 4,
      y + 22.5
    );
  };

  let metaX: number;
  let metaW: number;

  if (showDualSignature) {
    const sig1W = 45;
    const sig2W = 45;
    metaX = margin + sig1W + 3 + sig2W + 3;
    metaW = contentWidth - sig1W - sig2W - 6; // 88 mm

    renderSignatureBox(
      margin,
      sig1W,
      'FIRMA TUTOR / REPRESENTANTE:',
      data.signatureData,
      'Firma del padre/madre/tutor'
    );
    renderSignatureBox(
      margin + sig1W + 3,
      sig2W,
      'FIRMA DEPORTISTA (14-17 AÑOS):',
      data.minorSignatureData,
      'Firma del/de la menor >=14 años'
    );
  } else {
    const sigW = 74;
    metaX = margin + sigW + 4;
    metaW = contentWidth - sigW - 4; // 106 mm

    renderSignatureBox(
      margin,
      sigW,
      data.isMinor
        ? 'FIRMA DEL PADRE, MADRE O TUTOR/A LEGAL:'
        : 'FIRMA DEL/DE LA DEPORTISTA (+18):',
      data.signatureData,
      data.isMinor
        ? 'Firma del padre, madre o tutor/a legal'
        : 'Firma del/de la deportista (+18)'
    );
  }

  // Caja derecha de metadatos o conformidad presencial
  doc.setFillColor(250, 251, 254);
  doc.setDrawColor(210, 215, 225);
  doc.roundedRect(metaX, y, metaW, signBoxH, 0.9, 0.9, 'FD');

  const metaInnerW = metaW - 6;
  if (isPrintableBlank) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(180, 10, 20);
    doc.text('LUGAR, FECHA Y ENTREGA EN PAPEL', metaX + 3, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(65, 65, 70);
    const declLine = doc.splitTextToSize(
      `Declarante: ${data.signerName || '___________________________'}`,
      metaInnerW
    )[0];
    doc.text(declLine, metaX + 3, y + 9.4);
    doc.text('En San Pedro Alcántara, a ____ de ____________ de 202__', metaX + 3, y + 14.0);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.8);
    doc.setTextColor(100, 100, 105);
    const blankHint = doc.splitTextToSize(
      'Marque SÍ o NO en las 2 casillas (Imágenes y Desplazamientos) y firme en el recuadro. Modelo sin validez digital ni sello HMAC hasta su registro en secretaría.',
      metaInnerW
    );
    doc.text(blankHint, metaX + 3, y + 18.6);
  } else {
    const isPresencial = data.signatureMethod === 'PRESENCIAL';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(180, 10, 20);
    const metaTitle = isPresencial
      ? 'EVIDENCIAS DE FIRMA PRESENCIAL EN PAPEL'
      : 'EVIDENCIAS DE FIRMA ELECTRÓNICA SIMPLE (eIDAS)';
    doc.text(doc.splitTextToSize(metaTitle, metaInnerW)[0] || metaTitle, metaX + 3, y + 4.3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.1);
    doc.setTextColor(55, 55, 62);
    let metaY = y + 8.4;

    const signerLines = doc.splitTextToSize(
      `Firmante: ${data.signerName || 'Deportista/Tutor'} (${data.signerRelationship || 'TUTOR'}) · DNI: ${data.signerDni || 'N/D'}`,
      metaInnerW
    ).slice(0, 2);
    doc.text(signerLines, metaX + 3, metaY);
    metaY += signerLines.length * 3.1 + 0.5;

    const showMinorEvidenceLine = Boolean(showDualSignature && data.minorSignerName);
    if (showMinorEvidenceLine) {
      const minorLines = doc.splitTextToSize(
        `Menor (>=14): ${data.minorSignerName || data.playerName}${data.minorSignerDni ? ` · DNI: ${data.minorSignerDni}` : ' · Censo'}`,
        metaInnerW
      ).slice(0, 2);
      doc.text(minorLines, metaX + 3, metaY);
      metaY += minorLines.length * 3.1 + 0.4;
    }

    doc.text(`Fecha: ${dateFormatted} (Europe/Madrid)`, metaX + 3, metaY);
    metaY += 3.2;

    const methodLines = doc.splitTextToSize(`Método: ${methodLabel}`, metaInnerW).slice(0, 2);
    doc.text(methodLines, metaX + 3, metaY);
    metaY += methodLines.length * 3.1 + 0.4;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.3);
    doc.setTextColor(95, 95, 105);
    const secLine = doc.splitTextToSize(
      isPresencial
        ? 'Hoja física firmada a mano custodiada en Secretaría del Club e indexada con sello HMAC-SHA256.'
        : 'Firma Electrónica Simple (OTP al correo + trazo + HMAC-SHA256) conforme Art. 3.10 y 25.1 eIDAS.',
      metaInnerW
    );
    doc.text(secLine, metaX + 3, metaY);
  }

  y += signBoxH + 3.0;

  // =========================================================================
  // 8. PIE DE CUSTODIA (WRAPPED CON splitTextToSize)
  // =========================================================================
  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + contentWidth, y);
  y += 3.3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.9);
  doc.setTextColor(100, 100, 108);

  if (isPrintableBlank) {
    const blankLegend =
      'DOCUMENTO PARA FIRMA MANUSCRITA PRESENCIAL · Sin sello electrónico ni huella criptográfica hasta su entrega y validación en Secretaría del Club';
    const wrappedBlankLegend = doc.splitTextToSize(blankLegend, contentWidth);
    doc.text(wrappedBlankLegend, margin, y);
    y += wrappedBlankLegend.length * 2.9 + 0.6;
  } else {
    const hashStr = data.documentHash || 'PENDIENTE-VERIFICACION';
    const evidenceText = `EVIDENCIA DE CUSTODIA · ID (UUID): ${data.consentId || 'REG-PENDIENTE'} · Huella HMAC-SHA256: ${hashStr}`;
    const wrappedEvidence = doc.splitTextToSize(evidenceText, contentWidth);
    doc.text(wrappedEvidence, margin, y);
    y += wrappedEvidence.length * 2.9 + 0.6;
  }

  doc.text(
    `${CLUB_INFO.name} · Documento Oficial de Autorizaciones Deportivas · Temporada 2026/2027 · Página 1 de 1`,
    margin,
    y
  );

  return doc;
}
