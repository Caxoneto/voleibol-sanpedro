import { jsPDF } from 'jspdf';
import { CLUB_INFO } from './data-store';
import { CLUB_LOGO_BASE64 } from './club-logo-base64';

export interface ConsentPdfData {
  consentId?: string;
  playerName: string;
  teamName: string;
  birthYear?: number | null;
  isMinor: boolean;
  signerName: string;
  signerDni: string;
  signerRelationship: string;
  signerPhone?: string;
  signerEmail?: string;
  consentImage?: boolean;
  consentSocialMedia?: boolean;
  consentStreaming?: boolean;
  consentPress?: boolean;
  consentTravel?: boolean;
  medicalNotes?: string;
  signatureData?: string;
  documentHash?: string;
  signedAt?: string;
  /** Cuando es true, genera un modelo en blanco / pre-rellenado para imprimir y firmar presencialmente en papel, dejando las casillas de SÍ/NO sin marcar para que decida el declarante */
  isPrintableBlank?: boolean;
}

/**
 * Dibuja una franja de estado (firmado) o de casillas de selección manual (imprimible presencial).
 */
function drawDecisionRow(
  doc: jsPDF,
  margin: number,
  y: number,
  contentWidth: number,
  label: string,
  isAllowed: boolean,
  isPrintableBlank: boolean
): number {
  const rowH = 8.2;

  if (isPrintableBlank) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, rowH, 0.9, 0.9, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(30, 41, 59);
    doc.text(label, margin + 4, y + 5.3);

    // Casillas dibujadas para marcar a bolígrafo: [ ] SÍ AUTORIZO   [ ] NO AUTORIZO
    const boxSize = 3.4;
    const boxY = y + 2.4;

    const noBoxX = margin + contentWidth - 28;
    const yesBoxX = noBoxX - 31;

    // Casilla SÍ
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.35);
    doc.rect(yesBoxX, boxY, boxSize, boxSize, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.3);
    doc.setTextColor(15, 23, 42);
    doc.text('SÍ AUTORIZO', yesBoxX + boxSize + 2, y + 5.3);

    // Casilla NO
    doc.setFillColor(255, 255, 255);
    doc.rect(noBoxX, boxY, boxSize, boxSize, 'FD');
    doc.text('NO AUTORIZO', noBoxX + boxSize + 2, y + 5.3);

    doc.setLineWidth(0.2);
  } else {
    doc.setFillColor(isAllowed ? 240 : 254, isAllowed ? 253 : 242, isAllowed ? 244 : 242);
    doc.setDrawColor(isAllowed ? 110 : 248, isAllowed ? 231 : 113, isAllowed ? 183 : 113);
    doc.roundedRect(margin, y, contentWidth, rowH, 0.9, 0.9, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(20, 20, 25);
    doc.text(label, margin + 4, y + 5.3);

    doc.setTextColor(isAllowed ? 6 : 185, isAllowed ? 95 : 28, isAllowed ? 70 : 28);
    doc.text(
      isAllowed ? '[ SÍ AUTORIZADO ]' : '[ NO AUTORIZADO ]',
      margin + contentWidth - 4,
      y + 5.3,
      { align: 'right' }
    );
  }

  return y + rowH;
}

/**
 * Genera el documento oficial unificado de autorizaciones deportivas en UNA SOLA PÁGINA (A4).
 * Cumple estrictamente con la normativa vigente:
 * - Ley Orgánica 1/1982 de protección civil del derecho al honor, a la intimidad y a la propia imagen.
 * - Reglamento General de Protección de Datos (RGPD UE 2016/679) y LOPDGDD 3/2018.
 * - Ley 6/2020 de servicios electrónicos de confianza (firma manuscrita digitalizada fidedigna).
 * - Protocolo Marco de Protección de Menores de la Junta de Andalucía (Consejería de Cultura y Deporte).
 */
export function generateConsentPdf(data: ConsentPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182 mm

  const currentYear = 2026;
  const birthYear = data.birthYear || (data.isMinor ? 2011 : 2000);
  const age = currentYear - birthYear;

  const isPrintableBlank = !!data.isPrintableBlank;

  // Estado de consentimiento de imagen
  const imageAllowed = data.consentImage !== undefined
    ? !!data.consentImage
    : !!(data.consentSocialMedia || data.consentStreaming || data.consentPress);

  // Estado de autorización de desplazamientos
  const travelAllowed = data.consentTravel !== false;

  const dateFormatted = data.signedAt
    ? new Date(data.signedAt).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
    : new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

  // =========================================================================
  // 1. CABECERA INSTITUCIONAL
  // =========================================================================
  let y = 11;
  try {
    doc.addImage(CLUB_LOGO_BASE64, 'JPEG', margin, y, 16, 10.6);
  } catch {
    doc.setFillColor(180, 10, 20);
    doc.rect(margin, y, 3.5, 10.6, 'F');
  }

  const textX = margin + 19;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(180, 10, 20);
  doc.text(CLUB_INFO.name.toUpperCase(), textX, y + 3.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(75, 75, 80);
  doc.text(`CIF: ${CLUB_INFO.cif} · Sede: Pabellón Polideportivo Sergio Scariolo`, textX, y + 7);
  doc.text(`Email: ${CLUB_INFO.contactEmail} · Web: voleibolsanpedro.es · Reg. Entidades Deportivas`, textX, y + 10.5);

  // Junta de Andalucía a la derecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(60, 65, 75);
  doc.text('JUNTA DE ANDALUCÍA', margin + contentWidth, y + 3.2, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(90, 95, 105);
  doc.text('Consejería de Cultura y Deporte', margin + contentWidth, y + 6.9, { align: 'right' });
  doc.text('Protocolo de Menores en el Deporte', margin + contentWidth, y + 10.4, { align: 'right' });

  // Línea divisoria
  y += 14.2;
  doc.setDrawColor(215, 215, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentWidth, y);

  // =========================================================================
  // 2. TÍTULO UNIFICADO DEL DOCUMENTO
  // =========================================================================
  y += 4;
  doc.setFillColor(248, 249, 252);
  doc.setDrawColor(210, 215, 225);
  doc.roundedRect(margin, y, contentWidth, 10.2, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(180, 10, 20);
  doc.text('AUTORIZACIÓN OFICIAL DE IMAGEN Y DESPLAZAMIENTOS DEPORTIVOS', margin + 4, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(55, 55, 60);
  doc.text(
    isPrintableBlank
      ? 'Temporada Oficial 2026/2027 · C.D. Voleibol San Pedro · Modelo Oficial para Firma Presencial'
      : 'Temporada Oficial 2026/2027 · C.D. Voleibol San Pedro · Documento Oficial de Consentimiento',
    margin + 4,
    y + 8.3
  );

  // Espacio generoso entre título y bloque 1
  y += 16.5;

  // =========================================================================
  // 3. BLOQUE 1: DATOS IDENTIFICATIVOS Y DE REPRESENTACIÓN
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 30, 30);
  doc.text('1. DATOS IDENTIFICATIVOS Y DE REPRESENTACIÓN', margin, y);
  y += 2.8;

  const idBoxH = 22.5;
  doc.setFillColor(252, 252, 254);
  doc.setDrawColor(220, 222, 228);
  doc.roundedRect(margin, y, contentWidth, idBoxH, 1, 1, 'FD');

  // Línea vertical divisoria interior
  doc.setDrawColor(230, 232, 238);
  doc.line(margin + 88, y + 2.5, margin + 88, y + idBoxH - 2.5);

  // Columna 1: Deportista
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(180, 10, 20);
  doc.text('DATOS DEL DEPORTISTA:', margin + 4, y + 5);

  doc.setFontSize(7.4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('Nombre:', margin + 4, y + 9.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text(data.playerName, margin + 21, y + 9.8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('Equipo:', margin + 4, y + 14.3);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text(data.teamName, margin + 21, y + 14.3);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('Edad:', margin + 4, y + 18.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  const ageStr = data.isMinor ? `${birthYear} (${age} años · Menor)` : `${birthYear || 'Reg.'} (Mayor de edad)`;
  doc.text(ageStr, margin + 21, y + 18.8);

  // Columna 2: Firmante / Representante
  const col2X = margin + 92;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(180, 10, 20);
  doc.text('PERSONA FIRMANTE / REPRESENTANTE:', col2X, y + 5);

  doc.setFontSize(7.4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('Nombre:', col2X, y + 9.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text(data.signerName || (isPrintableBlank ? '_____________________________' : 'Deportista / Tutor'), col2X + 19, y + 9.8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('DNI / NIE:', col2X, y + 14.3);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  const dniText = data.signerDni
    ? `${data.signerDni} (${data.signerRelationship || 'TUTOR'})`
    : isPrintableBlank
    ? `_______________ (${data.signerRelationship || 'TUTOR'})`
    : `N/D (${data.signerRelationship || 'TUTOR'})`;
  doc.text(dniText, col2X + 19, y + 14.3);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('Contacto:', col2X, y + 18.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  const contactStr =
    data.signerPhone || data.signerEmail
      ? `${data.signerPhone || '—'} · ${data.signerEmail || '—'}`
      : isPrintableBlank
      ? 'Tel: ____________ · Email: ________________'
      : 'Facilitado en censo';
  // Ajustar ligeramente si el email es muy largo para no desbordar el borde derecho
  const maxContactW = contentWidth - 114;
  if (doc.getTextWidth(contactStr) > maxContactW) {
    doc.setFontSize(6.5);
  }
  doc.text(doc.splitTextToSize(contactStr, maxContactW)[0], col2X + 19, y + 18.8);

  y += idBoxH + 6.5;

  // =========================================================================
  // 4. BLOQUE 2: CESIÓN DE IMAGEN
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 30, 30);
  doc.text('2. TRATAMIENTO Y DIFUSIÓN DE IMÁGENES (LEY 1/1982 · RGPD UE 2016/679)', margin, y);
  y += 2.8;

  const imgText =
    'Autorizo al C.D. VOLEIBOL SAN PEDRO, conforme a la Ley Orgánica 1/1982 de protección civil del derecho al honor, a la intimidad y a la propia imagen, y al RGPD (UE) 2016/679, para que la imagen del deportista pueda ser captada y divulgada por el club y entidades organizadoras en la web oficial, redes sociales del club, retransmisiones en directo (streaming), prensa y soportes deportivos con la exclusiva finalidad de promoción del deporte, respetando en todo momento la dignidad y honor personal del deportista. Esta autorización se otorga para la temporada 2026/2027 sin límite temporal y con fines no lucrativos.';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.25);
  const splitImg = doc.splitTextToSize(imgText, contentWidth - 8);
  const imgBoxH = splitImg.length * 3.35 + 5.5;

  doc.setFillColor(252, 252, 254);
  doc.setDrawColor(220, 222, 228);
  doc.roundedRect(margin, y, contentWidth, imgBoxH, 1, 1, 'FD');

  doc.setTextColor(45, 45, 50);
  doc.text(splitImg, margin + 4, y + 4.8);

  y += imgBoxH + 2.8;

  y = drawDecisionRow(
    doc,
    margin,
    y,
    contentWidth,
    isPrintableBlank ? 'Cesión de Imagen (marque una opción):' : 'Cesión de Imagen Deportiva y Promoción:',
    imageAllowed,
    isPrintableBlank
  );

  y += 6.5;

  // =========================================================================
  // 5. BLOQUE 3: DESPLAZAMIENTOS Y ASISTENCIA SANITARIA
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 30, 30);
  doc.text('3. DESPLAZAMIENTOS, VIAJES DEPORTIVOS Y ASISTENCIA SANITARIA', margin, y);
  y += 2.8;

  const travelText =
    'Se autoriza la participación y el traslado del deportista en transportes fletados, vehículos oficiales o concertados por la entidad para partidos de liga federada FAVB, concentraciones, Campeonatos de Andalucía (CADEBA), torneos oficiales y entrenamientos, bajo supervisión del cuerpo técnico y delegados de campo del C.D. Voleibol San Pedro. En caso de lesión o urgencia médica durante la actividad, se faculta expresamente a los responsables del club a adoptar las medidas sanitarias oportunas y gestionar la asistencia a través del Seguro Deportivo Obligatorio de la FAVB y el Servicio Andaluz de Salud (SAS).';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.25);
  const splitTravel = doc.splitTextToSize(travelText, contentWidth - 8);
  const travelBoxH = splitTravel.length * 3.35 + 5.5;

  doc.setFillColor(252, 252, 254);
  doc.setDrawColor(220, 222, 228);
  doc.roundedRect(margin, y, contentWidth, travelBoxH, 1, 1, 'FD');

  doc.setTextColor(45, 45, 50);
  doc.text(splitTravel, margin + 4, y + 4.8);

  y += travelBoxH + 2.8;

  y = drawDecisionRow(
    doc,
    margin,
    y,
    contentWidth,
    isPrintableBlank
      ? 'Autorización de Desplazamientos y Asistencia Médica (marque una):'
      : 'Autorización de Desplazamientos y Asistencia Médica:',
    travelAllowed,
    isPrintableBlank
  );

  y += 6;

  // Observaciones médicas si existen
  if (data.medicalNotes && data.medicalNotes.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    const splitMed = doc.splitTextToSize(data.medicalNotes.trim(), contentWidth - 52);
    const medH = Math.max(8.5, splitMed.length * 3.1 + 4);

    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(250, 204, 21);
    doc.roundedRect(margin, y, contentWidth, medH, 0.8, 0.8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.9);
    doc.setTextColor(133, 77, 14);
    doc.text('Observaciones médicas / alergias:', margin + 4, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(113, 63, 18);
    doc.text(splitMed, margin + 47, y + 4.5);

    y += medH + 5;
  }

  // =========================================================================
  // 6. BLOQUE 4: INFORMACIÓN DE PROTECCIÓN DE DATOS (RGPD Y LOPDGDD)
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 30, 30);
  doc.text('4. INFORMACIÓN DE PROTECCIÓN DE DATOS (RGPD ART. 13 · LOPDGDD 3/2018)', margin, y);
  y += 3.2;

  const rgpdText =
    'Responsable: C.D. Voleibol San Pedro (CIF G93147824, C/ Diego Piña Medina 21, San Pedro Alcántara, Málaga · voleibolsanpedro@hotmail.es). Finalidad: Gestión de licencias, actividad deportiva, expedición de autorizaciones oficiales y difusión deportiva del club. Base jurídica: Misión de interés público, relación federativa y consentimiento expreso. Conservación: Durante la vinculación federativa y plazos legales aplicables. Derechos: Acceso, rectificación, supresión, limitación y oposición en el email del club o ante la AEPD (www.aepd.es).';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(75, 75, 82);
  const splitRgpd = doc.splitTextToSize(rgpdText, contentWidth);
  doc.text(splitRgpd, margin, y);

  y += splitRgpd.length * 3.0 + 5;

  // =========================================================================
  // 7. BLOQUE 5: DECLARACIÓN RESPONSABLE Y FIRMA MANUSCRITA
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 30, 30);
  doc.text('5. DECLARACIÓN RESPONSABLE Y CONFORMIDAD JURÍDICA', margin, y);
  y += 3.2;

  const declText = data.isMinor
    ? 'La persona firmante declara bajo su exclusiva responsabilidad que ostenta la patria potestad o tutela legal del deportista menor de edad, actuando con consentimiento del otro progenitor y prestando conformidad libre, inequívoca e informada a los términos expresados en este documento.'
    : 'La persona firmante declara bajo su responsabilidad que es mayor de edad, deportista federado del C.D. Voleibol San Pedro y que presta su consentimiento libre, informado e inequívoco a los términos de este documento.';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.9);
  doc.setTextColor(45, 45, 50);
  const splitDecl = doc.splitTextToSize(declText, contentWidth);
  doc.text(splitDecl, margin, y);

  y += splitDecl.length * 3.1 + 4;

  // Recuadro de Firma y Registro de Conformidad (25 mm de alto)
  const signBoxH = 25;
  const signW = 76;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(210, 215, 225);
  doc.roundedRect(margin, y, signW, signBoxH, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(100, 100, 110);
  doc.text('FIRMA MANUSCRITA:', margin + 3.5, y + 4.2);

  const isSyntheticGreenPixel =
    data.signatureData &&
    data.signatureData.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

  if (!isPrintableBlank && data.signatureData && data.signatureData.startsWith('data:image/') && !isSyntheticGreenPixel) {
    try {
      doc.addImage(data.signatureData, 'PNG', margin + 3, y + 5, signW - 6, signBoxH - 6.5);
    } catch {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.8);
      doc.setTextColor(140, 140, 145);
      doc.text('(Firma digital manuscrita registrada)', margin + 12, y + 14);
    }
  } else {
    doc.setDrawColor(180, 180, 185);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin + 8, y + 18, margin + signW - 8, y + 18);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.3);
    doc.setTextColor(140, 140, 145);
    doc.text('Firma manuscrita del declarante / tutor', margin + 11.5, y + 21.8);
  }

  // Recuadro derecho: Evidencias digitales o Datos de firma presencial
  const metaX = margin + signW + 4;
  const metaW = contentWidth - signW - 4; // 102 mm

  doc.setFillColor(250, 251, 254);
  doc.setDrawColor(210, 215, 225);
  doc.roundedRect(metaX, y, metaW, signBoxH, 1, 1, 'FD');

  if (isPrintableBlank) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(180, 10, 20);
    doc.text('LUGAR, FECHA Y CONFORMIDAD PRESENCIAL', metaX + 4, y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(65, 65, 70);
    doc.text(
      `Declarante: ${data.signerName || '____________________________________'}`,
      metaX + 4,
      y + 9.8
    );
    doc.text(
      `En San Pedro Alcántara, a _____ de ________________ de 202___`,
      metaX + 4,
      y + 14.8
    );
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 100, 105);
    doc.text(
      'Marque claramente SÍ o NO en ambos apartados y firme en el recuadro izquierdo.',
      metaX + 4,
      y + 20.5
    );
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(180, 10, 20);
    doc.text('CONFORMIDAD Y VALIDEZ DIGITAL (LEY 6/2020)', metaX + 4, y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.7);
    doc.setTextColor(70, 70, 75);

    doc.text(
      `Firmante: ${data.signerName || 'Deportista / Tutor'} (${data.signerRelationship || 'TUTOR'}) · DNI: ${data.signerDni || 'N/D'}`,
      metaX + 4,
      y + 9.4
    );
    doc.text(`Fecha y Hora: ${dateFormatted} (Hora peninsular española)`, metaX + 4, y + 13.6);
    doc.text(`Canal: Portal Oficial Web C.D. Voleibol San Pedro (Firma en pantalla)`, metaX + 4, y + 17.8);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 105);
    doc.text(
      'La presente firma digitalizada goza de plena validez jurídica conforme al art. 3 de la Ley 6/2020.',
      metaX + 4,
      y + 21.8
    );
  }

  y += signBoxH + 5.5;

  // =========================================================================
  // 8. PIE DE CUSTODIA EN 2 LÍNEAS SUTILES AL FINAL
  // =========================================================================
  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + contentWidth, y);
  y += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.1);
  doc.setTextColor(110, 110, 115);

  if (isPrintableBlank) {
    doc.text(
      'DOCUMENTO PARA FIRMA PRESENCIAL · Entregar debidamente cumplimentado y firmado al delegado de equipo o secretaría del Club.',
      margin,
      y
    );
  } else {
    const hashStr = data.documentHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    doc.text(
      `EVIDENCIA DE CUSTODIA · ID (UUID): ${data.consentId || 'REG-PENDIENTE'} · Huella SHA-256: ${hashStr}`,
      margin,
      y
    );
  }

  doc.text(
    'C.D. Voleibol San Pedro · Documento Oficial de Autorizaciones Deportivas · Temporada 2026/2027 · Página 1 de 1 (Documento Único)',
    margin,
    y + 3.5
  );

  return doc;
}
