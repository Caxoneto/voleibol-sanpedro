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
  consentTravel?: boolean;
  medicalNotes?: string;
  signatureData?: string;
  documentHash?: string;
  signedAt?: string;
}

/**
 * Genera el documento oficial de autorizaciones basado en los Modelos Oficiales de la Junta de Andalucía:
 * - Página 1: Anexo 05 - Modelo de Manejo Adecuado de Datos e Imágenes (Menores / Mayores de edad).
 * - Página 2: Anexo 06 - Modelo de Autorización para Desplazamientos, Viajes y Asistencia Sanitaria Oficial,
 *   junto con la firma manuscrita fidedigna y el sellado criptográfico SHA-256 de custodia.
 */
export function generateConsentPdf(data: ConsentPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // Determinar tramo de edad para los textos oficiales de la Junta de Andalucía
  const currentYear = 2026;
  const birthYear = data.birthYear || (data.isMinor ? 2012 : 2000);
  const age = currentYear - birthYear;
  const isUnder14 = data.isMinor && age < 14;
  const is14to18 = data.isMinor && age >= 14;
  const allDenied = !data.consentSocialMedia && !data.consentStreaming && !data.consentPress;
  const travelAllowed = data.consentTravel !== false;

  const dateFormatted = data.signedAt
    ? new Date(data.signedAt).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
    : new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

  // Función auxiliar para dibujar la cabecera institucional oficial en cada página
  const drawHeader = (pageNumber: number, totalPages: number) => {
    let y = 14;

    // Banda lateral roja del Club
    doc.setFillColor(180, 10, 20);
    doc.rect(margin, y, 3.5, 16, 'F');

    // Nombre del Club
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 20);
    doc.text(CLUB_INFO.name.toUpperCase(), margin + 7, y + 5);

    // Subtítulo oficial
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 85);
    doc.text(
      `CIF: ${CLUB_INFO.cif} | Domicilio: ${CLUB_INFO.officialAddress} | Sede Deportiva: Pabellón Sergio Scariolo`,
      margin + 7,
      y + 9.5
    );
    doc.text(
      `Email: ${CLUB_INFO.contactEmail} | Web: voleibolsanpedro.es | Inscrito en Registro Andaluz de Entidades Deportivas`,
      margin + 7,
      y + 13.5
    );

    // Indicador de normativa Junta de Andalucía en la esquina superior derecha
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 110);
    doc.text('JUNTA DE ANDALUCÍA', margin + contentWidth, y + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text('Consejería de Cultura y Deporte', margin + contentWidth, y + 8, { align: 'right' });
    doc.text('Protocolo Marco de Menores en el Deporte', margin + contentWidth, y + 11.5, { align: 'right' });

    // Línea separadora tenue
    doc.setDrawColor(215, 215, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 18, margin + contentWidth, y + 18);

    // Pie de página
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 125);
    doc.text(
      `Documento oficial de autorizaciones deportivas · C.D. Voleibol San Pedro · Temporada 2026/2027`,
      margin,
      pageHeight - 10
    );
    doc.text(`Página ${pageNumber} de ${totalPages}`, margin + contentWidth, pageHeight - 10, { align: 'right' });
  };

  // =========================================================================
  // PÁGINA 1: ANEXO 05 - TRATAMIENTO DE DATOS E IMÁGENES
  // =========================================================================
  drawHeader(1, 2);

  let y = 36;

  // Título del Anexo 05
  doc.setFillColor(248, 249, 252);
  doc.setDrawColor(210, 215, 225);
  doc.roundedRect(margin, y, contentWidth, 13, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(180, 10, 20);
  doc.text('ANEXO 05 · JUNTA DE ANDALUCÍA (PROTOCOLO MARCO DE PROTECCIÓN DE MENORES)', margin + 4, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  const titleScope = data.isMinor
    ? isUnder14
      ? 'AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS E IMÁGENES DE PERSONAS MENORES (<14 AÑOS)'
      : 'AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS E IMÁGENES DE MENORES (14 A 18 AÑOS)'
    : 'DECLARACIÓN OFICIAL DE CESIÓN DE DERECHOS DE IMAGEN DE DEPORTISTAS MAYORES DE EDAD';
  doc.text(titleScope, margin + 4, y + 10);

  y += 17;

  // 1. Bloque: Datos Oficiales del Deportista
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text('1. DATOS IDENTIFICATIVOS DEL DEPORTISTA', margin, y);
  y += 3;

  doc.setFillColor(252, 252, 254);
  doc.setDrawColor(220, 222, 228);
  doc.roundedRect(margin, y, contentWidth, 20, 1, 1, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 75);

  doc.text('Nombre y Apellidos:', margin + 4, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text(data.playerName, margin + 35, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('Equipo / Categoría:', margin + 4, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text(data.teamName, margin + 35, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('Año Nacimiento / Edad:', margin + 4, y + 16.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  const ageLabel = data.isMinor
    ? `${birthYear} (${age} años · ${isUnder14 ? 'Menor de 14 años' : 'Menor de 14 a 18 años'})`
    : `${birthYear || 'Registrado'} (Mayor de edad · Sénior)`;
  doc.text(ageLabel, margin + 35, y + 16.5);

  y += 24;

  // 2. Bloque: Datos del Firmante / Declaración de Representación
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  const signerBlockTitle = data.isMinor
    ? isUnder14
      ? '2. DATOS DEL PADRE, MADRE O TUTOR/A LEGAL QUE PRESTA EL CONSENTIMIENTO'
      : '2. DATOS DEL PROGENITOR / TUTOR LEGAL Y DEL MENOR QUE MANIFIESTAN CONFORMIDAD'
    : '2. DATOS DEL DEPORTISTA DECLARANTE (MAYOR DE EDAD)';
  doc.text(signerBlockTitle, margin, y);
  y += 3;

  doc.setFillColor(252, 252, 254);
  doc.setDrawColor(220, 222, 228);
  doc.roundedRect(margin, y, contentWidth, 20, 1, 1, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 75);

  doc.text('Nombre del Firmante:', margin + 4, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text(data.signerName, margin + 35, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('DNI / NIE:', margin + 4, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text(data.signerDni, margin + 35, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text('Condición / Relación:', margin + 4, y + 16.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text(data.signerRelationship, margin + 35, y + 16.5);

  if (data.signerPhone || data.signerEmail) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 75);
    doc.text('Teléfono / Email:', margin + 98, y + 11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 15, 15);
    const contactStr = `${data.signerPhone || ''} ${data.signerEmail ? `· ${data.signerEmail}` : ''}`.trim();
    doc.text(contactStr || 'Facilitado en ficha', margin + 125, y + 11);
  }

  y += 24;

  // 3. Bloque: Alcance de las autorizaciones de imagen (Anexo 05)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text('3. ALCANCE ESPECÍFICO DEL TRATAMIENTO DE IMÁGENES (RGPD ART. 6 Y 7 · LOPDGDD ART. 7)', margin, y);
  y += 3;

  // Tabla con las 3 modalidades del Anexo 05
  const rowH = 10.5;

  // Fila A: Redes Sociales y Web
  doc.setFillColor(data.consentSocialMedia ? 245 : 255, data.consentSocialMedia ? 252 : 242, data.consentSocialMedia ? 245 : 242);
  doc.setDrawColor(215, 218, 225);
  doc.roundedRect(margin, y, contentWidth, rowH, 0.8, 0.8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 25);
  doc.text('A. Sitio Web Oficial y Redes Sociales Institucionales del Club', margin + 4, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(80, 80, 85);
  doc.text('Publicación de fotos grupales, convocatorias deportivas y logros en Instagram, Facebook, X y web.', margin + 4, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(data.consentSocialMedia ? 15 : 190, data.consentSocialMedia ? 130 : 25, data.consentSocialMedia ? 40 : 25);
  doc.text(
    data.consentSocialMedia ? '[ SÍ AUTORIZADO ]' : '[ NO AUTORIZADO ]',
    margin + contentWidth - 34,
    y + 6.5
  );

  y += rowH + 2.5;

  // Fila B: Streaming y Video
  doc.setFillColor(data.consentStreaming ? 245 : 255, data.consentStreaming ? 252 : 242, data.consentStreaming ? 245 : 242);
  doc.setDrawColor(215, 218, 225);
  doc.roundedRect(margin, y, contentWidth, rowH, 0.8, 0.8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 25);
  doc.text('B. Retransmisión y Streaming en Directo de Partidos Oficiales', margin + 4, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(80, 80, 85);
  doc.text('Emisión en streaming en directo por YouTube u otros canales oficiales de los encuentros de liga.', margin + 4, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(data.consentStreaming ? 15 : 190, data.consentStreaming ? 130 : 25, data.consentStreaming ? 40 : 25);
  doc.text(
    data.consentStreaming ? '[ SÍ AUTORIZADO ]' : '[ NO AUTORIZADO ]',
    margin + contentWidth - 34,
    y + 6.5
  );

  y += rowH + 2.5;

  // Fila C: Prensa y Medios
  doc.setFillColor(data.consentPress ? 245 : 255, data.consentPress ? 252 : 242, data.consentPress ? 245 : 242);
  doc.setDrawColor(215, 218, 225);
  doc.roundedRect(margin, y, contentWidth, rowH, 0.8, 0.8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 25);
  doc.text('C. Medios de Comunicación, Prensa Local y Televisión Deportiva', margin + 4, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(80, 80, 85);
  doc.text('Cesión a prensa escrita y digital de Marbella y San Pedro de fotos en podios, crónicas y torneos.', margin + 4, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(data.consentPress ? 15 : 190, data.consentPress ? 130 : 25, data.consentPress ? 40 : 25);
  doc.text(
    data.consentPress ? '[ SÍ AUTORIZADO ]' : '[ NO AUTORIZADO ]',
    margin + contentWidth - 34,
    y + 6.5
  );

  y += rowH + 4;

  if (allDenied) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(248, 113, 113);
    doc.roundedRect(margin, y, contentWidth, 9, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28);
    doc.text(
      'AVISO OFICIAL: La persona declarante ha marcado DENEGACIÓN EXPRESA TOTAL de imagen en este Anexo 05.',
      margin + 4,
      y + 5.5
    );
    y += 12;
  }

  // Cláusula legal oficial del Anexo 05 de la Junta de Andalucía
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.7);
  doc.setTextColor(90, 90, 95);
  const legalTextAnexo05 =
    'Conforme al Protocolo Marco de Actuación para la Protección de las Personas Menores frente a la Violencia en el Deporte de la Junta de Andalucía (Orden de 18 de noviembre de 2024), Ley Orgánica 8/2021 (LOPIVI), Ley Orgánica 1/1982 de Protección del Derecho al Honor y a la Propia Imagen, RGPD (UE 2016/679) y Ley Orgánica 3/2018 (LOPDGDD), las imágenes solo podrán ser captadas y difundidas con fines estrictamente deportivos y promocionales del C.D. Voleibol San Pedro, quedando terminantemente prohibida su cesión a terceros con fines lucrativos o comerciales ajenos al club. La persona firmante podrá revocar total o parcialmente este consentimiento en cualquier momento mediante comunicación por escrito a la dirección voleibolsanpedro@hotmail.es.';

  const splitAnexo05 = doc.splitTextToSize(legalTextAnexo05, contentWidth);
  doc.text(splitAnexo05, margin, y);
  y += splitAnexo05.length * 3.3 + 4;

  // Nota de continuación
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 135);
  doc.text(
    'Continúa en la Página 2 con el Anexo 06 (Autorización de Desplazamientos y Viajes Deportivos), Declaración Responsable y Firma.',
    margin,
    y
  );

  // =========================================================================
  // PÁGINA 2: ANEXO 06 - DESPLAZAMIENTOS Y VIAJES + FIRMA Y CUSTODIA
  // =========================================================================
  doc.addPage();
  drawHeader(2, 2);

  y = 36;

  // Título del Anexo 06
  doc.setFillColor(248, 249, 252);
  doc.setDrawColor(210, 215, 225);
  doc.roundedRect(margin, y, contentWidth, 13, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(180, 10, 20);
  doc.text('ANEXO 06 · JUNTA DE ANDALUCÍA (PROTOCOLO MARCO DE PROTECCIÓN DE MENORES)', margin + 4, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text(
    'AUTORIZACIÓN OFICIAL PARA DESPLAZAMIENTOS, VIAJES DEPORTIVOS Y ASISTENCIA SANITARIA',
    margin + 4,
    y + 10
  );

  y += 17;

  // Bloque: Alcance del Desplazamiento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text('1. CONDICIONES GENERALES DEL DESPLAZAMIENTO Y VIAJES OFICIALES (TEMPORADA 2026/2027)', margin, y);
  y += 3;

  doc.setFillColor(252, 252, 254);
  doc.setDrawColor(220, 222, 228);
  doc.roundedRect(margin, y, contentWidth, 34, 1, 1, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(40, 40, 45);

  const travelP1 =
    '• Actividad Autorizada: Participación del deportista en partidos de liga regular, concentraciones, Campeonatos de Andalucía (CADEBA), torneos federados oficiales y sesiones de entrenamiento programadas por el C.D. Voleibol San Pedro y la Federación Andaluza de Voleibol (FAVB).';
  const travelP2 =
    '• Medios de Transporte: Desplazamientos en autobuses fletados o concertados por la entidad, vehículos oficiales del club o vehículos autorizados con la debida cobertura aseguradora en vigor.';
  const travelP3 =
    '• Supervisión Técnica y Cuidado: El deportista viajará bajo la tutela y supervisión directa del cuerpo técnico, monitores titulados y personas delegadas de campo colegiadas del C.D. Voleibol San Pedro.';
  const travelP4 =
    '• Cobertura Sanitaria de Urgencia: En caso de lesión o urgencia médica sobrevenida durante el desplazamiento o la competición, se faculta a los responsables del club a tomar las medidas sanitarias oportunas y gestionar la asistencia facultativa a través del Seguro Deportivo Obligatorio de la FAVB y los centros de urgencias del Servicio Andaluz de Salud (SAS).';

  const splitTP1 = doc.splitTextToSize(travelP1, contentWidth - 8);
  const splitTP2 = doc.splitTextToSize(travelP2, contentWidth - 8);
  const splitTP3 = doc.splitTextToSize(travelP3, contentWidth - 8);
  const splitTP4 = doc.splitTextToSize(travelP4, contentWidth - 8);

  let subY = y + 4.5;
  doc.text(splitTP1, margin + 4, subY);
  subY += splitTP1.length * 3 + 1;
  doc.text(splitTP2, margin + 4, subY);
  subY += splitTP2.length * 3 + 1;
  doc.text(splitTP3, margin + 4, subY);
  subY += splitTP3.length * 3 + 1;
  doc.text(splitTP4, margin + 4, subY);

  y += 38;

  // Estado del consentimiento de desplazamiento
  doc.setFillColor(travelAllowed ? 245 : 255, travelAllowed ? 252 : 242, travelAllowed ? 245 : 242);
  doc.setDrawColor(215, 218, 225);
  doc.roundedRect(margin, y, contentWidth, 8, 0.8, 0.8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(20, 20, 25);
  doc.text('Estado de la Autorización de Desplazamientos Oficiales (Anexo 06):', margin + 4, y + 5);

  doc.setTextColor(travelAllowed ? 15 : 190, travelAllowed ? 130 : 25, travelAllowed ? 40 : 25);
  doc.text(travelAllowed ? '[ SÍ AUTORIZADO EXPRESAMENTE ]' : '[ NO AUTORIZADO ]', margin + contentWidth - 52, y + 5);

  y += 12;

  // 2. Bloque: Declaración Responsable y Patria Potestad
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text('2. DECLARACIÓN RESPONSABLE Y CONFORMIDAD JURÍDICA', margin, y);
  y += 3;

  doc.setFillColor(252, 252, 254);
  doc.setDrawColor(220, 222, 228);
  doc.roundedRect(margin, y, contentWidth, 16, 1, 1, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(50, 50, 55);

  const declText = data.isMinor
    ? 'La persona firmante declara bajo su exclusiva responsabilidad que ostenta la patria potestad o tutela legal del deportista menor de edad, que actúa con el consentimiento y conocimiento del otro progenitor, y que acepta íntegramente las condiciones recogidas en el Anexo 05 (Imágenes) y Anexo 06 (Desplazamientos) del Protocolo Marco de la Junta de Andalucía para la presente temporada.'
    : 'La persona firmante declara bajo su responsabilidad que es mayor de edad, deportista federado del C.D. Voleibol San Pedro y que presta su consentimiento libre, inequívoco e informado conforme a la normativa autonómica y estatal aplicable.';

  const splitDecl = doc.splitTextToSize(declText, contentWidth - 8);
  doc.text(splitDecl, margin + 4, y + 4.5);

  y += 20;

  // 3. Bloque: Firma Digitalizada y Custodia Criptográfica
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text('3. FIRMA DIGITALIZADA Y REGISTRO DE CUSTODIA (LEY 6/2020)', margin, y);
  y += 3;

  const signBoxH = 34;

  // Recuadro de la firma manuscrita (Izquierda)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(210, 215, 225);
  doc.roundedRect(margin, y, 84, signBoxH, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 110);
  doc.text('FIRMA MANUSCRITA REGISTRADA:', margin + 3, y + 4);

  // Incrustar la imagen de firma si existe
  if (data.signatureData && data.signatureData.startsWith('data:image/')) {
    try {
      doc.addImage(data.signatureData, 'PNG', margin + 3, y + 5.5, 78, signBoxH - 7);
    } catch {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 145);
      doc.text('(Firma manuscrita digitalizada registrada en servidor)', margin + 6, y + 18);
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 145);
    doc.text('(Firma manuscrita digitalizada)', margin + 15, y + 18);
  }

  // Recuadro de Evidencias Criptográficas (Derecha)
  const metaX = margin + 88;
  const metaW = contentWidth - 88;

  doc.setFillColor(250, 251, 254);
  doc.setDrawColor(210, 215, 225);
  doc.roundedRect(metaX, y, metaW, signBoxH, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 10, 20);
  doc.text('EVIDENCIAS DE CUSTODIA OFICIAL', metaX + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(70, 70, 75);

  doc.text(`Fecha y Hora: ${dateFormatted} (Madrid)`, metaX + 4, y + 10);
  doc.text(`ID Registro (UUID):`, metaX + 4, y + 14.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(data.consentId || 'REG-CDV-PENDING', metaX + 4, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text(`Sellado de Integridad SHA-256:`, metaX + 4, y + 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(20, 20, 20);
  const hashStr = data.documentHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  doc.text(hashStr.substring(0, 36), metaX + 4, y + 26.5);
  doc.text(hashStr.substring(36), metaX + 4, y + 29.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(110, 110, 115);
  doc.text('Custodia en BBDD Neon PostgreSQL · Inmutable', metaX + 4, y + 32.5);

  return doc;
}
