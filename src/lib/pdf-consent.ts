import { jsPDF } from 'jspdf';
import { CLUB_INFO } from './data-store';

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
  consentSocialMedia: boolean;
  consentStreaming: boolean;
  consentPress: boolean;
  signatureData?: string;
  documentHash?: string;
  signedAt?: string;
}

export function generateConsentPdf(data: ConsentPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  // 1. Cabecera Institucional
  doc.setFillColor(180, 10, 20); // Rojo Club
  doc.rect(margin, y, 4, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(CLUB_INFO.name.toUpperCase(), margin + 8, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  doc.text(`CIF: ${CLUB_INFO.cif} | Domicilio: ${CLUB_INFO.officialAddress}`, margin + 8, y + 11);
  doc.text(`Email oficial: ${CLUB_INFO.contactEmail} | Web: voleibolsanpedro.es`, margin + 8, y + 15);

  y += 24;

  // Título del documento
  const allDenied = !data.consentSocialMedia && !data.consentStreaming && !data.consentPress;
  doc.setFillColor(allDenied ? 255 : 245, allDenied ? 240 : 245, allDenied ? 240 : 247);
  doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(180, 10, 20);
  doc.text(
    allDenied
      ? 'DECLARACIÓN OFICIAL DE DENEGACIÓN EXPRESA DE CESIÓN DE DERECHOS DE IMAGEN'
      : 'RESGUARDO OFICIAL DE CESIÓN DE DERECHOS DE IMAGEN Y DATOS DE MENORES',
    margin + 4,
    y + 7.5
  );

  y += 18;

  // 2. Bloque: Datos del Deportista
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text('1. DATOS OFICIALES DEL DEPORTISTA', margin, y);
  y += 4;

  doc.setDrawColor(220, 220, 225);
  doc.setFillColor(252, 252, 254);
  doc.roundedRect(margin, y, contentWidth, 22, 1, 1, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);

  doc.text('Nombre y Apellidos:', margin + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text(data.playerName, margin + 36, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Equipo / Categoría:', margin + 4, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text(data.teamName, margin + 36, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Año de Nacimiento:', margin + 4, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text(`${data.birthYear || 'Registrado'} (${data.isMinor ? 'Menor de edad' : 'Mayor de edad'})`, margin + 36, y + 18);

  y += 28;

  // 3. Bloque: Datos del Firmante / Tutor Legal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text(data.isMinor ? '2. DATOS DEL PADRE, MADRE O TUTOR/A LEGAL' : '2. DATOS DEL FIRMANTE (MAYOR DE EDAD)', margin, y);
  y += 4;

  doc.roundedRect(margin, y, contentWidth, 22, 1, 1, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);

  doc.text('Nombre y Apellidos:', margin + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text(data.signerName, margin + 36, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('DNI / NIE:', margin + 4, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text(data.signerDni, margin + 36, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Condición / Relación:', margin + 4, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text(data.signerRelationship, margin + 36, y + 18);

  if (data.signerPhone || data.signerEmail) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text('Contacto:', margin + 105, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 15, 15);
    doc.text(`${data.signerPhone || ''} ${data.signerEmail ? `(${data.signerEmail})` : ''}`, margin + 122, y + 12);
  }

  y += 28;

  // 4. Bloque: Autorizaciones Granulares Otorgadas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text('3. ALCANCE DE LAS AUTORIZACIONES PRESTADAS (RGPD ART. 7)', margin, y);
  y += 4;

  const rowHeight = 9;
  const tableY = y;

  // Fila 1: Redes Sociales
  doc.setFillColor(data.consentSocialMedia ? 240 : 255, data.consentSocialMedia ? 250 : 240, data.consentSocialMedia ? 240 : 240);
  doc.rect(margin, tableY, contentWidth, rowHeight, 'F');
  doc.setDrawColor(210, 210, 215);
  doc.rect(margin, tableY, contentWidth, rowHeight, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text('Páginas Web y Redes Sociales Oficiales del Club', margin + 4, tableY + 5.5);

  doc.setTextColor(data.consentSocialMedia ? 10 : 180, data.consentSocialMedia ? 130 : 20, data.consentSocialMedia ? 40 : 20);
  doc.text(data.consentSocialMedia ? '[ SÍ AUTORIZADO ]' : '[ NO AUTORIZADO ]', margin + contentWidth - 36, tableY + 5.5);

  // Fila 2: Streaming
  const r2Y = tableY + rowHeight;
  doc.setFillColor(data.consentStreaming ? 240 : 255, data.consentStreaming ? 250 : 240, data.consentStreaming ? 240 : 240);
  doc.rect(margin, r2Y, contentWidth, rowHeight, 'F');
  doc.rect(margin, r2Y, contentWidth, rowHeight, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('Retransmisión en Directo de Partidos Oficiales (Streaming / YouTube)', margin + 4, r2Y + 5.5);

  doc.setTextColor(data.consentStreaming ? 10 : 180, data.consentStreaming ? 130 : 20, data.consentStreaming ? 40 : 20);
  doc.text(data.consentStreaming ? '[ SÍ AUTORIZADO ]' : '[ NO AUTORIZADO ]', margin + contentWidth - 36, r2Y + 5.5);

  // Fila 3: Prensa
  const r3Y = r2Y + rowHeight;
  doc.setFillColor(data.consentPress ? 240 : 255, data.consentPress ? 250 : 240, data.consentPress ? 240 : 240);
  doc.rect(margin, r3Y, contentWidth, rowHeight, 'F');
  doc.rect(margin, r3Y, contentWidth, rowHeight, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('Difusión en Prensa y Medios de Comunicación Locales', margin + 4, r3Y + 5.5);

  doc.setTextColor(data.consentPress ? 10 : 180, data.consentPress ? 130 : 20, data.consentPress ? 40 : 20);
  doc.text(data.consentPress ? '[ SÍ AUTORIZADO ]' : '[ NO AUTORIZADO ]', margin + contentWidth - 36, r3Y + 5.5);

  y += rowHeight * 3 + 8;

  // 5. Cláusula Informativa y Declaración Responsable
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  const legalDisclaimer = 
    'Declaración responsable: La persona firmante declara bajo su responsabilidad que ostenta la patria potestad o tutela legal del deportista menor de edad y que cuenta con el conocimiento del otro progenitor. De conformidad con el RGPD (UE 2016/679) y la LOPDGDD 3/2018, los datos son tratados por C.D. Voleibol San Pedro para la promoción y seguimiento de la actividad deportiva del club. Podrá revocar este consentimiento o ejercer sus derechos de acceso, rectificación y supresión enviando un correo a voleibolsanpedro@hotmail.es.';
  
  const splitLegal = doc.splitTextToSize(legalDisclaimer, contentWidth);
  doc.text(splitLegal, margin, y);
  y += splitLegal.length * 3.5 + 4;

  // 6. Firma Digitalizada y Sello de Integridad
  doc.setDrawColor(200, 200, 205);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  doc.text('FIRMA DIGITALIZADA DEL TUTOR / JUGADOR:', margin, y);

  doc.text('DATOS DE REGISTRO Y CUSTODIA:', margin + 95, y);
  y += 3;

  // Recuadro de la firma
  doc.setDrawColor(210, 210, 215);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, 80, 32, 'FD');

  if (data.signatureData && data.signatureData.startsWith('data:image/')) {
    try {
      doc.addImage(data.signatureData, 'PNG', margin + 2, y + 2, 76, 28);
    } catch {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('(Firma digitalizada registrada)', margin + 15, y + 17);
    }
  }

  // Metadatos a la derecha
  const dateFormatted = data.signedAt
    ? new Date(data.signedAt).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
    : new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Fecha y hora: ${dateFormatted} (Hora de Madrid)`, margin + 95, y + 7);
  doc.text(`Código de Registro (UUID):`, margin + 95, y + 13);
  doc.setFont('helvetica', 'bold');
  doc.text(data.consentId || 'REGISTRADO-EN-BD', margin + 95, y + 17);

  if (data.documentHash) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Hash SHA-256 de Integridad:`, margin + 95, y + 23);
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.text(data.documentHash.substring(0, 32), margin + 95, y + 27);
    doc.text(data.documentHash.substring(32), margin + 95, y + 30);
  }

  return doc;
}
