import { jsPDF } from 'jspdf';
import { CLUB_LOGO_BASE64 } from './club-logo-base64';
import { formatMadridTime } from './date-utils';
import {
  LOPIVI_AUTHORITIES,
  LOPIVI_CHANNELS,
  LOPIVI_CONDUCT_CODE_SECTIONS,
  LOPIVI_CONDUCT_CODE_TITLE,
  LOPIVI_DELEGATE,
  LOPIVI_IMMEDIATE_MEASURES,
  LOPIVI_IMMEDIATE_RISK_OPTIONS,
  LOPIVI_INCIDENT_MODEL_FINALIDAD,
  LOPIVI_INCIDENT_MODEL_TITLE,
  LOPIVI_KEY_MESSAGES,
  LOPIVI_LOCATIONS,
  LOPIVI_PROTOCOL_SECTIONS,
  LOPIVI_PROTOCOL_TITLE,
  LOPIVI_REPORTER_RELATIONS,
  LOPIVI_SITUATION_TYPES,
  LOPIVI_STATUS_META,
  type LopiviChannel,
  type LopiviImmediateRisk,
  type LopiviIncidentStatus,
} from './lopivi-content';

export interface LopiviIncidentPdfInput {
  isBlank?: boolean;
  variant?: 'INTERNAL' | 'RECEIPT';
  recordCode?: string;
  receivedAtIso?: string;
  receivedDateText?: string;
  receivedTimeText?: string;
  channel?: LopiviChannel;
  reporterName?: string;
  reporterRelationship?: string;
  reporterContact?: string;
  isAnonymous?: boolean;
  keepIdentityReserved?: boolean;
  minorName?: string;
  minorAge?: string;
  minorCategory?: string;
  minorTeam?: string;
  incidentDateText?: string;
  incidentLocation?: string;
  incidentTypes?: string[];
  immediateRisk?: LopiviImmediateRisk;
  description?: string;
  measuresTaken?: string[];
  measuresDescription?: string;
  authoritiesNotified?: string[];
  authorityNotificationDate?: string;
  authorityRecipient?: string;
  authorityReference?: string;
  followUpDate?: string;
  followUpMeasures?: string;
  followUpEvolution?: string;
  followUpActions?: string;
  closedDate?: string;
  observations?: string;
  status?: LopiviIncidentStatus;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 182 mm
const BOTTOM_LIMIT = PAGE_HEIGHT - 18; // 279 mm

/**
 * Limpia caracteres fuera de WinAnsi/Latin-1 que jsPDF Helvetica no puede renderizar
 * (como emojis), preservando acentos, eñe y signos españoles.
 */
function sanitizePdfText(input?: string | null): string {
  if (!input) return '';
  return String(input)
    .replace(/\r\n/g, '\n')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF]/g, ' ')
    .trim();
}

function formatMadridDateEs(isoInput?: string): { dateStr: string; timeStr: string } {
  const d = isoInput ? new Date(isoInput) : new Date();
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  const dateStr = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(safe);
  const timeStr = formatMadridTime(safe);
  return { dateStr, timeStr };
}

class LopiviPdfBuilder {
  public readonly doc: jsPDF;
  public y = MARGIN;
  private continuationTitle: string;
  private confidentialTag?: string;

  constructor(continuationTitle: string, confidentialTag?: string) {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    this.continuationTitle = sanitizePdfText(continuationTitle);
    this.confidentialTag = confidentialTag ? sanitizePdfText(confidentialTag) : undefined;
  }

  public drawInstitutionalHeader(title: string, subtitle?: string, badgeText?: string): void {
    const doc = this.doc;
    let y = 12;

    try {
      doc.addImage(CLUB_LOGO_BASE64, 'JPEG', MARGIN, y, 16, 10.6);
    } catch {
      doc.setFillColor(180, 10, 20);
      doc.rect(MARGIN, y, 4, 10.6, 'F');
    }

    const leftTextX = MARGIN + 19;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(180, 10, 20);
    doc.text(LOPIVI_DELEGATE.clubName.toUpperCase(), leftTextX, y + 3.4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(70, 72, 78);
    doc.text(
      `CIF: ${LOPIVI_DELEGATE.cif} · ${LOPIVI_DELEGATE.address}`,
      leftTextX,
      y + 6.9
    );
    doc.text(
      `Delegado de Protección de Menores: ${LOPIVI_DELEGATE.name} · Tel: ${LOPIVI_DELEGATE.phone} · ${LOPIVI_DELEGATE.email}`,
      leftTextX,
      y + 10.1
    );

    y += 13.5;
    doc.setDrawColor(180, 10, 20);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
    doc.setLineWidth(0.2);

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    const titleLines: string[] = doc.splitTextToSize(sanitizePdfText(title), CONTENT_WIDTH - 8);

    let subLines: string[] = [];
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      subLines = doc.splitTextToSize(sanitizePdfText(subtitle), CONTENT_WIDTH - 8);
    }

    let badgeLines: string[] = [];
    if (badgeText) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.6);
      badgeLines = doc.splitTextToSize(sanitizePdfText(badgeText), CONTENT_WIDTH - 8);
    }

    const titleStep = 4.6;
    const subStep = 3.5;
    const badgeStep = 3.6;
    const topPad = 5.4;
    const bottomPad = 3.2;

    let innerHeight = Math.max(0, titleLines.length - 1) * titleStep;
    if (subLines.length > 0) {
      innerHeight += 4.4 + (subLines.length - 1) * subStep;
    }
    if (badgeLines.length > 0) {
      innerHeight += 4.4 + (badgeLines.length - 1) * badgeStep;
    }
    const boxH = topPad + innerHeight + bottomPad;

    doc.setFillColor(248, 249, 252);
    doc.setDrawColor(212, 216, 224);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, boxH, 1.2, 1.2, 'FD');

    let innerY = y + topPad;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(22, 24, 30);
    for (let i = 0; i < titleLines.length; i++) {
      doc.text(titleLines[i], MARGIN + 4, innerY);
      if (i < titleLines.length - 1) {
        innerY += titleStep;
      }
    }

    if (subLines.length > 0) {
      innerY += 4.4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(80, 84, 92);
      for (let i = 0; i < subLines.length; i++) {
        doc.text(subLines[i], MARGIN + 4, innerY);
        if (i < subLines.length - 1) {
          innerY += subStep;
        }
      }
    }

    if (badgeLines.length > 0) {
      innerY += 4.4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.6);
      doc.setTextColor(185, 28, 28);
      for (let i = 0; i < badgeLines.length; i++) {
        doc.text(badgeLines[i], MARGIN + 4, innerY);
        if (i < badgeLines.length - 1) {
          innerY += badgeStep;
        }
      }
    }

    this.y = y + boxH + 5;
  }

  public addNewPageWithHeader(): void {
    const doc = this.doc;
    doc.addPage();

    // Línea 1 (y = 11.5): club a la izquierda y etiqueta confidencial a la derecha
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(180, 10, 20);
    doc.text(LOPIVI_DELEGATE.clubName.toUpperCase(), MARGIN, 11.5);

    if (this.confidentialTag) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      doc.setTextColor(185, 28, 28);
      doc.text(this.confidentialTag, MARGIN + CONTENT_WIDTH, 11.5, { align: 'right' });
    }

    // Línea 2 (desde y = 15.5): título de continuación con ajuste real de fuente antes de medir
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.0);
    doc.setTextColor(95, 98, 106);
    const titleLines: string[] = doc.splitTextToSize(this.continuationTitle, CONTENT_WIDTH);
    let titleY = 15.5;
    for (const line of titleLines) {
      doc.text(line, MARGIN, titleY);
      titleY += 3.3;
    }

    const dividerY = 15.5 + titleLines.length * 3.3 + 1.5;
    doc.setDrawColor(215, 218, 224);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, dividerY, MARGIN + CONTENT_WIDTH, dividerY);
    doc.setLineWidth(0.2);

    this.y = dividerY + 5.5;
  }

  public ensureSpace(neededMm: number): void {
    if (this.y + neededMm > BOTTOM_LIMIT) {
      this.addNewPageWithHeader();
    }
  }

  public drawSectionTitle(title: string): void {
    const doc = this.doc;
    const clean = sanitizePdfText(title);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.4);
    const lines: string[] = doc.splitTextToSize(clean, CONTENT_WIDTH - 4.5);
    const needed = lines.length * 4.2 + 12;
    this.ensureSpace(needed);

    doc.setFillColor(242, 244, 248);
    doc.setDrawColor(180, 10, 20);
    doc.rect(MARGIN, this.y, 2.2, lines.length * 4.2 + 2.6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.4);
    doc.setTextColor(25, 28, 36);
    let ty = this.y + 4.1;
    for (const line of lines) {
      doc.text(line, MARGIN + 4.2, ty);
      ty += 4.2;
    }

    this.y += lines.length * 4.2 + 6.4;
  }

  public drawSubheading(title: string): void {
    const doc = this.doc;
    const clean = sanitizePdfText(title);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    const titleLines: string[] = doc.splitTextToSize(clean, CONTENT_WIDTH - 2);
    this.ensureSpace(titleLines.length * 4.2 + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    doc.setTextColor(150, 12, 22);
    let ty = this.y + 3.2;
    for (const line of titleLines) {
      doc.text(line, MARGIN + 1, ty);
      ty += 4.2;
    }
    this.y += titleLines.length * 4.2 + 4.8;
  }

  public drawParagraphs(
    paragraphs?: string[],
    options?: { fontSize?: number; lineHeight?: number; indent?: number; italic?: boolean; color?: [number, number, number] }
  ): void {
    if (!paragraphs || paragraphs.length === 0) return;
    const fontSize = options?.fontSize ?? 8.4;
    const lineHeight = options?.lineHeight ?? 3.9;
    const indent = options?.indent ?? 0;
    const color = options?.color ?? [42, 44, 52];

    const doc = this.doc;
    doc.setFont('helvetica', options?.italic ? 'italic' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);

    for (const rawP of paragraphs) {
      const cleanP = sanitizePdfText(rawP);
      if (!cleanP) continue;
      const lines = doc.splitTextToSize(cleanP, CONTENT_WIDTH - indent);
      for (const line of lines) {
        this.ensureSpace(lineHeight + 1);
        doc.setFont('helvetica', options?.italic ? 'italic' : 'normal');
        doc.setFontSize(fontSize);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(line, MARGIN + indent, this.y);
        this.y += lineHeight;
      }
      this.y += 1.4;
    }
  }

  public drawBullets(items?: string[], indent = 3.5): void {
    if (!items || items.length === 0) return;
    const doc = this.doc;
    const lineHeight = 3.85;
    const textWidth = CONTENT_WIDTH - indent - 4.5;

    for (const item of items) {
      const clean = sanitizePdfText(item);
      if (!clean) continue;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.3);
      const lines: string[] = doc.splitTextToSize(clean, textWidth);
      this.ensureSpace(lineHeight + 1.5);

      doc.setFillColor(180, 10, 20);
      doc.rect(MARGIN + indent, this.y - 2.1, 1.3, 1.3, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.3);
      doc.setTextColor(42, 44, 52);

      lines.forEach((line: string, idx: number) => {
        if (idx > 0) {
          this.ensureSpace(lineHeight + 1);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.3);
          doc.setTextColor(42, 44, 52);
        }
        doc.text(line, MARGIN + indent + 3.5, this.y);
        this.y += lineHeight;
      });
      this.y += 0.9;
    }
    this.y += 1.2;
  }

  public drawDelegateCard(): void {
    this.ensureSpace(22);
    const doc = this.doc;
    doc.setFillColor(252, 246, 246);
    doc.setDrawColor(225, 190, 194);
    doc.roundedRect(MARGIN + 1, this.y, CONTENT_WIDTH - 2, 18.5, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(165, 12, 24);
    doc.text(LOPIVI_DELEGATE.name, MARGIN + 5, this.y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(45, 45, 52);
    doc.text(
      `${LOPIVI_DELEGATE.delegateTitle} · ${LOPIVI_DELEGATE.roleTitle}`,
      MARGIN + 5,
      this.y + 10.0
    );
    doc.text(
      `Correo electrónico: ${LOPIVI_DELEGATE.email} · Teléfono: ${LOPIVI_DELEGATE.phone}`,
      MARGIN + 5,
      this.y + 14.5
    );

    this.y += 22;
  }

  public drawCheckbox(x: number, y: number, checked: boolean): void {
    const doc = this.doc;
    const size = 3.2;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(checked ? 180 : 95, checked ? 10 : 102, checked ? 20 : 112);
    doc.setLineWidth(checked ? 0.45 : 0.3);
    doc.rect(x, y - 2.6, size, size, 'FD');
    if (checked) {
      doc.setDrawColor(180, 10, 20);
      doc.setLineWidth(0.55);
      doc.line(x + 0.6, y - 2.0, x + size - 0.6, y + 0.0);
      doc.line(x + size - 0.6, y - 2.0, x + 0.6, y + 0.0);
    }
    doc.setLineWidth(0.2);
  }

  public drawCheckboxGrid(
    items: Array<{ label: string; checked: boolean }>,
    columns = 2,
    extraNote?: string
  ): void {
    const doc = this.doc;
    const colW = CONTENT_WIDTH / columns;
    const rowStep = 5.4;
    const lineStep = 3.8;

    for (let i = 0; i < items.length; i += columns) {
      const rowEntries: Array<{
        col: number;
        checked: boolean;
        lines: string[];
      }> = [];
      let maxLines = 1;

      for (let c = 0; c < columns; c++) {
        const item = items[i + c];
        if (!item) continue;
        doc.setFont('helvetica', item.checked ? 'bold' : 'normal');
        doc.setFontSize(8.0);
        const lines: string[] = doc.splitTextToSize(sanitizePdfText(item.label), colW - 8);
        maxLines = Math.max(maxLines, lines.length);
        rowEntries.push({ col: c, checked: item.checked, lines });
      }

      const rowHeight = (maxLines - 1) * lineStep + rowStep;
      this.ensureSpace(rowHeight + 1);

      for (const entry of rowEntries) {
        const x = MARGIN + 1.5 + entry.col * colW;
        this.drawCheckbox(x, this.y, entry.checked);

        doc.setFont('helvetica', entry.checked ? 'bold' : 'normal');
        doc.setFontSize(8.0);
        doc.setTextColor(entry.checked ? 15 : 48, entry.checked ? 23 : 50, entry.checked ? 42 : 58);
        entry.lines.forEach((line, lineIdx) => {
          doc.text(line, x + 4.8, this.y + lineIdx * lineStep);
        });
      }

      this.y += rowHeight;
    }

    if (extraNote) {
      this.drawParagraphs([extraNote], {
        fontSize: 7.7,
        lineHeight: 3.5,
        indent: 2,
        italic: true,
        color: [85, 88, 96],
      });
    } else {
      this.y += 1.5;
    }
  }

  public drawFieldLine(label: string, value: string, blankLineLen = '________________________________________'): void {
    const doc = this.doc;
    const cleanLabel = sanitizePdfText(label);
    const cleanVal = sanitizePdfText(value);
    const valOrLine = cleanVal || blankLineLen;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.1);
    const labelWidth = doc.getTextWidth(`${cleanLabel}: `);
    const firstLineMaxW = CONTENT_WIDTH - 3 - labelWidth;
    const labelWrapsLine = firstLineMaxW < 40;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.1);
    const valWrapped: string[] = labelWrapsLine
      ? doc.splitTextToSize(valOrLine, CONTENT_WIDTH - 4.5)
      : doc.splitTextToSize(valOrLine, firstLineMaxW);

    const totalLines = (labelWrapsLine ? 1 : 0) + Math.max(1, valWrapped.length);
    this.ensureSpace(totalLines * 4.2 + 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.1);
    doc.setTextColor(35, 38, 46);
    doc.text(`${cleanLabel}:`, MARGIN + 1.5, this.y);

    if (labelWrapsLine) {
      this.y += 4.3;
      for (let i = 0; i < valWrapped.length; i++) {
        this.ensureSpace(4.2);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.1);
        doc.setTextColor(cleanVal ? 18 : 110, cleanVal ? 20 : 114, cleanVal ? 24 : 122);
        doc.text(valWrapped[i], MARGIN + 3, this.y);
        this.y += 4.1;
      }
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.1);
      doc.setTextColor(cleanVal ? 18 : 110, cleanVal ? 20 : 114, cleanVal ? 24 : 122);
      doc.text(valWrapped[0] || '', MARGIN + 1.5 + labelWidth, this.y);
      this.y += 4.3;

      for (let i = 1; i < valWrapped.length; i++) {
        this.ensureSpace(4.2);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.1);
        doc.setTextColor(cleanVal ? 18 : 110, cleanVal ? 20 : 114, cleanVal ? 24 : 122);
        doc.text(valWrapped[i], MARGIN + 3, this.y);
        this.y += 4.1;
      }
    }
    this.y += 0.7;
  }

  public drawTextAreaBox(label: string, content: string, minBoxHeight = 20): void {
    const doc = this.doc;
    const cleanLabel = sanitizePdfText(label);
    const cleanContent = sanitizePdfText(content);

    this.ensureSpace(minBoxHeight + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.1);
    doc.setTextColor(35, 38, 46);
    doc.text(`${cleanLabel}:`, MARGIN + 1.5, this.y);
    this.y += 3.2;

    if (!cleanContent) {
      this.ensureSpace(minBoxHeight + 2);
      doc.setFillColor(253, 253, 255);
      doc.setDrawColor(195, 200, 210);
      doc.roundedRect(MARGIN + 1, this.y, CONTENT_WIDTH - 2, minBoxHeight, 1, 1, 'FD');

      doc.setDrawColor(225, 228, 234);
      for (let lineY = this.y + 6.5; lineY < this.y + minBoxHeight - 2; lineY += 6) {
        doc.line(MARGIN + 4, lineY, MARGIN + CONTENT_WIDTH - 4, lineY);
      }
      this.y += minBoxHeight + 3;
      return;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.1);
    const lines = doc.splitTextToSize(cleanContent, CONTENT_WIDTH - 8);
    const lineH = 4.0;
    let idx = 0;

    while (idx < lines.length) {
      const availableMm = BOTTOM_LIMIT - this.y - 6;
      const maxLinesHere = Math.max(2, Math.floor(availableMm / lineH));
      const chunk = lines.slice(idx, idx + maxLinesHere);
      const boxH = Math.max(idx === 0 && lines.length <= maxLinesHere ? minBoxHeight : 10, chunk.length * lineH + 5);

      doc.setFillColor(250, 251, 253);
      doc.setDrawColor(200, 205, 214);
      doc.roundedRect(MARGIN + 1, this.y, CONTENT_WIDTH - 2, boxH, 1, 1, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.1);
      doc.setTextColor(25, 28, 34);
      let textY = this.y + 4.4;
      for (const l of chunk) {
        doc.text(l, MARGIN + 4, textY);
        textY += lineH;
      }

      this.y += boxH + 3;
      idx += chunk.length;
      if (idx < lines.length) {
        this.addNewPageWithHeader();
      }
    }
  }

  public finalizeFooters(leftFooterText: string): jsPDF {
    const doc = this.doc;
    const total = doc.getNumberOfPages();
    const cleanLeft = sanitizePdfText(leftFooterText);

    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setDrawColor(215, 218, 224);
      doc.setLineWidth(0.25);
      doc.line(MARGIN, PAGE_HEIGHT - 13, MARGIN + CONTENT_WIDTH, PAGE_HEIGHT - 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.0);
      doc.setTextColor(100, 104, 112);
      doc.text(cleanLeft, MARGIN, PAGE_HEIGHT - 8.8);
      doc.text(`Página ${i} de ${total}`, MARGIN + CONTENT_WIDTH, PAGE_HEIGHT - 8.8, {
        align: 'right',
      });
    }
    return doc;
  }
}

/**
 * 1. Genera en PDF completo el Protocolo Interno de Protección de las Personas Menores frente a la Violencia.
 */
export function generateLopiviProtocolPdf(): jsPDF {
  const builder = new LopiviPdfBuilder(
    `${LOPIVI_PROTOCOL_TITLE} · Temporada ${LOPIVI_DELEGATE.season}`
  );

  builder.drawInstitutionalHeader(
    LOPIVI_PROTOCOL_TITLE,
    `Ámbito de aplicación: ${LOPIVI_DELEGATE.scope} · Temporada ${LOPIVI_DELEGATE.season}`
  );

  for (const section of LOPIVI_PROTOCOL_SECTIONS) {
    builder.drawSectionTitle(section.title);
    builder.drawParagraphs(section.introParagraphs);

    if (section.delegateBlock) {
      builder.drawDelegateCard();
      builder.drawSubheading('Funciones principales:');
    }

    if (section.bullets) {
      builder.drawBullets(section.bullets);
    }

    if (section.subsections) {
      for (const sub of section.subsections) {
        builder.drawSubheading(sub.title);
        builder.drawParagraphs(sub.paragraphs);
        builder.drawBullets(sub.bullets, 5);
      }
    }

    if (section.phases) {
      for (const ph of section.phases) {
        builder.drawSubheading(ph.title);
        builder.drawParagraphs(ph.paragraphs, { indent: 2 });
        builder.drawBullets(ph.bullets, 5);
      }
    }

    builder.drawParagraphs(section.outroParagraphs);

    builder.y += 1.5;
  }

  return builder.finalizeFooters(
    `${LOPIVI_DELEGATE.clubName} · CIF ${LOPIVI_DELEGATE.cif} · Protocolo Interno LOPIVI (${LOPIVI_DELEGATE.season})`
  );
}

/**
 * 2. Genera en PDF completo el Código de Conducta y Convivencia para Familias y Deportistas (8 secciones).
 */
export function generateLopiviConductCodePdf(): jsPDF {
  const builder = new LopiviPdfBuilder(
    `${LOPIVI_CONDUCT_CODE_TITLE} · Temporada ${LOPIVI_DELEGATE.season}`
  );

  builder.drawInstitutionalHeader(
    LOPIVI_CONDUCT_CODE_TITLE,
    `Normas de convivencia, respeto y buen trato · Temporada ${LOPIVI_DELEGATE.season}`
  );

  for (const section of LOPIVI_CONDUCT_CODE_SECTIONS) {
    builder.drawSectionTitle(section.title);
    builder.drawParagraphs(section.introParagraphs);

    if (section.delegateBlock) {
      builder.drawDelegateCard();
    }

    if (section.bullets) {
      builder.drawBullets(section.bullets);
    }

    builder.drawParagraphs(section.outroParagraphs);

    builder.y += 1.5;
  }

  return builder.finalizeFooters(
    `${LOPIVI_DELEGATE.clubName} · CIF ${LOPIVI_DELEGATE.cif} · Código de Conducta y Convivencia (${LOPIVI_DELEGATE.season})`
  );
}

/**
 * 3. Genera el Modelo Oficial de Comunicación y Registro de Incidencias (Secciones 1 a 10 completas).
 * - Sin argumento o con `isBlank: true`: modelo imprimible en blanco listo para entrega en mano.
 * - Con datos: expediente cumplimentado (uso interno del Delegado o justificante de recepción del comunicante).
 */
export function generateLopiviIncidentRecordPdf(record?: LopiviIncidentPdfInput): jsPDF {
  const isBlank = !record || record.isBlank === true;
  const isReceipt = !isBlank && record?.variant === 'RECEIPT';

  const builder = new LopiviPdfBuilder(
    LOPIVI_INCIDENT_MODEL_TITLE,
    LOPIVI_KEY_MESSAGES.documentConfidentialTag
  );

  const subtitle = isBlank
    ? 'Modelo Oficial Imprimible para Comunicación y Registro · Protección de Menores (Ley LOPIVI)'
    : isReceipt
    ? 'Justificante Confidencial de Comunicación Recibida · Canal de Protección de Menores'
    : 'Expediente Interno Confidencial · Registro Oficial de Incidencia LOPIVI';

  builder.drawInstitutionalHeader(
    LOPIVI_INCIDENT_MODEL_TITLE,
    subtitle,
    LOPIVI_KEY_MESSAGES.documentConfidentialTag
  );

  const madridNow = formatMadridDateEs(record?.receivedAtIso);
  const recDate = isBlank
    ? '____ / ____ / ______'
    : record?.receivedDateText || madridNow.dateStr;
  const recTime = isBlank
    ? '__________'
    : record?.receivedTimeText || `${madridNow.timeStr} (Europe/Madrid)`;

  // SECCIÓN 1: FINALIDAD
  builder.drawSectionTitle('1. FINALIDAD');
  builder.drawParagraphs(LOPIVI_INCIDENT_MODEL_FINALIDAD);

  // SECCIÓN 2: DATOS DE LA COMUNICACIÓN
  builder.drawSectionTitle('2. DATOS DE LA COMUNICACIÓN');
  builder.drawFieldLine(
    'Número de registro',
    isBlank ? '______________________________' : record?.recordCode || 'PENDIENTE'
  );
  builder.drawFieldLine('Fecha de recepción', recDate, '____ / ____ / ______');
  builder.drawFieldLine('Hora', recTime, '__________');
  if (!isBlank && record?.status) {
    const statusLabel = LOPIVI_STATUS_META[record.status]?.label || record.status;
    builder.drawFieldLine('Estado actual del expediente', statusLabel);
  }

  builder.drawParagraphs(['Medio de comunicación:'], { fontSize: 8.2, lineHeight: 3.8 });
  const selectedChannel = isBlank ? undefined : record?.channel;
  builder.drawCheckboxGrid(
    LOPIVI_CHANNELS.map((ch) => ({
      label: ch.value === 'OTRO' && selectedChannel === 'OTRO' ? 'Otra vía' : ch.label,
      checked: selectedChannel === ch.value,
    })),
    3
  );

  // SECCIÓN 3: DATOS DE LA PERSONA QUE COMUNICA
  builder.drawSectionTitle('3. DATOS DE LA PERSONA QUE COMUNICA');
  const reporterNameDisplay = isBlank
    ? '__________________________________________'
    : record?.isAnonymous
    ? 'COMUNICACIÓN ANÓNIMA'
    : record?.reporterName || 'No facilitado';
  builder.drawFieldLine('Nombre y apellidos', reporterNameDisplay);

  builder.drawParagraphs(['Relación con el club:'], { fontSize: 8.2, lineHeight: 3.8 });
  const relRaw = isBlank ? '' : (record?.reporterRelationship || '').trim();
  const isCustomRel =
    !isBlank &&
    Boolean(relRaw) &&
    !LOPIVI_REPORTER_RELATIONS.some((r) => r.toLowerCase() === relRaw.toLowerCase());
  builder.drawCheckboxGrid(
    LOPIVI_REPORTER_RELATIONS.map((rel) => ({
      label:
        rel === 'Otra' && isCustomRel
          ? `Otra: ${relRaw.replace(/^otra:\s*/i, '')}`
          : rel === 'Otra'
          ? 'Otra: __________________________'
          : rel,
      checked:
        !isBlank &&
        (rel.toLowerCase() === relRaw.toLowerCase() ||
          (rel === 'Otra' && (isCustomRel || relRaw.toLowerCase().startsWith('otra')))),
    })),
    2
  );

  const contactDisplay = isBlank
    ? '________________________'
    : record?.isAnonymous
    ? 'No facilitado (comunicación anónima)'
    : record?.reporterContact || 'No facilitado';
  builder.drawFieldLine('Teléfono o correo de contacto (opcional)', contactDisplay);

  builder.drawParagraphs([LOPIVI_KEY_MESSAGES.reservedIdentityQuestion], {
    fontSize: 8.2,
    lineHeight: 3.8,
  });
  builder.drawCheckboxGrid(
    [
      { label: 'Sí', checked: !isBlank && record?.keepIdentityReserved !== false },
      { label: 'No', checked: !isBlank && record?.keepIdentityReserved === false },
    ],
    2,
    LOPIVI_KEY_MESSAGES.confidentialityFormNotice
  );

  // SECCIÓN 4: DATOS DEL MENOR AFECTADO
  builder.drawSectionTitle('4. DATOS DEL MENOR AFECTADO');
  builder.drawFieldLine(
    'Nombre y apellidos',
    isBlank ? '__________________________________________' : record?.minorName || 'No especificado'
  );
  builder.drawFieldLine(
    'Edad',
    isBlank ? '__________' : record?.minorAge || 'No especificada'
  );
  builder.drawFieldLine(
    'Categoría deportiva',
    isBlank ? '_________________________________________' : record?.minorCategory || 'No especificada'
  );
  builder.drawFieldLine(
    'Equipo',
    isBlank ? '___________________________________________________' : record?.minorTeam || 'No especificado'
  );

  // SECCIÓN 5: DESCRIPCIÓN DE LA INCIDENCIA
  builder.drawSectionTitle('5. DESCRIPCIÓN DE LA INCIDENCIA');
  builder.drawFieldLine(
    'Fecha en la que ocurrieron los hechos (si se conoce)',
    isBlank ? '________________________________' : record?.incidentDateText || 'No especificada'
  );

  builder.drawParagraphs(['Lugar donde ocurrieron:'], { fontSize: 8.2, lineHeight: 3.8 });
  const locRaw = isBlank ? '' : (record?.incidentLocation || '').trim();
  const isCustomLoc =
    !isBlank &&
    Boolean(locRaw) &&
    !LOPIVI_LOCATIONS.some((l) => l.toLowerCase() === locRaw.toLowerCase());
  builder.drawCheckboxGrid(
    LOPIVI_LOCATIONS.map((loc) => ({
      label:
        loc === 'Otro' && isCustomLoc
          ? `Otro: ${locRaw.replace(/^otro:\s*/i, '')}`
          : loc === 'Otro'
          ? 'Otro: __________________________'
          : loc,
      checked:
        !isBlank &&
        (loc.toLowerCase() === locRaw.toLowerCase() ||
          (loc === 'Otro' && (isCustomLoc || locRaw.toLowerCase().startsWith('otro')))),
    })),
    2
  );

  builder.drawParagraphs(['Tipo de situación comunicada:'], { fontSize: 8.2, lineHeight: 3.8 });
  const selectedTypes = new Set(
    (record?.incidentTypes || []).map((t) => t.trim().toLowerCase())
  );
  builder.drawCheckboxGrid(
    LOPIVI_SITUATION_TYPES.map((st) => ({
      label: st,
      checked: !isBlank && selectedTypes.has(st.toLowerCase()),
    })),
    2
  );

  builder.drawTextAreaBox(
    'Descripción objetiva de los hechos',
    isBlank ? '' : record?.description || '',
    28
  );
  builder.drawParagraphs([LOPIVI_KEY_MESSAGES.objectiveDescriptionHint], {
    fontSize: 7.7,
    lineHeight: 3.5,
    indent: 2,
    italic: true,
    color: [85, 88, 96],
  });

  // SECCIÓN 6: MEDIDAS INMEDIATAS DE PROTECCIÓN
  builder.drawSectionTitle('6. MEDIDAS INMEDIATAS DE PROTECCIÓN');
  builder.drawParagraphs(['¿Existe riesgo inmediato para el menor?'], {
    fontSize: 8.2,
    lineHeight: 3.8,
  });
  builder.drawCheckboxGrid(
    LOPIVI_IMMEDIATE_RISK_OPTIONS.map((opt) => ({
      label: opt.label,
      checked: !isBlank && record?.immediateRisk === opt.value,
    })),
    3
  );

  builder.drawParagraphs(['Medidas adoptadas:'], { fontSize: 8.2, lineHeight: 3.8 });
  const rawMeasures = record?.measuresTaken || [];
  const selectedMeasures = new Set(rawMeasures.map((m) => m.trim().toLowerCase()));
  const customMeasureText = rawMeasures.find((m) =>
    m.trim().toLowerCase().startsWith('otras medidas:')
  );
  builder.drawCheckboxGrid(
    LOPIVI_IMMEDIATE_MEASURES.map((m) => ({
      label:
        m === 'Otras medidas' && isBlank
          ? 'Otras medidas: ________________________________________'
          : m === 'Otras medidas' && !isReceipt && customMeasureText
          ? customMeasureText
          : m,
      checked:
        !isBlank &&
        !isReceipt &&
        (selectedMeasures.has(m.toLowerCase()) ||
          (m === 'Otras medidas' && Boolean(customMeasureText))),
    })),
    1
  );

  builder.drawTextAreaBox(
    'Descripción de las medidas adoptadas',
    isBlank
      ? ''
      : isReceipt
      ? 'Pendiente de valoración y adopción por el Delegado de Protección de Menores.'
      : record?.measuresDescription || 'Sin descripción adicional registrada.',
    18
  );

  // SECCIÓN 7: COMUNICACIONES REALIZADAS
  builder.drawSectionTitle('7. COMUNICACIONES REALIZADAS');
  builder.drawParagraphs(['Organismo o servicio al que se ha comunicado:'], {
    fontSize: 8.2,
    lineHeight: 3.8,
  });
  const rawAuths = record?.authoritiesNotified || [];
  const selectedAuth = new Set(rawAuths.map((a) => a.trim().toLowerCase()));
  const customAuthText = rawAuths.find((a) => a.trim().toLowerCase().startsWith('otros:'));
  builder.drawCheckboxGrid(
    LOPIVI_AUTHORITIES.map((a) => ({
      label:
        a === 'Otros' && isBlank
          ? 'Otros: ______________________________________________'
          : a === 'Otros' && !isReceipt && customAuthText
          ? customAuthText
          : a,
      checked:
        !isBlank &&
        !isReceipt &&
        (selectedAuth.has(a.toLowerCase()) || (a === 'Otros' && Boolean(customAuthText))),
    })),
    2
  );
  builder.drawFieldLine(
    'Fecha de comunicación',
    isBlank
      ? '____ / ____ / ______'
      : isReceipt
      ? 'No procede en este justificante'
      : record?.authorityNotificationDate || 'No realizada hasta la fecha',
    '____ / ____ / ______'
  );
  builder.drawFieldLine(
    'Persona o entidad receptora',
    isBlank
      ? '_________________________________'
      : isReceipt
      ? 'Uso interno del Delegado de Protección'
      : record?.authorityRecipient || '—'
  );
  builder.drawFieldLine(
    'Referencia o número de expediente, si existe',
    isBlank
      ? '___________________'
      : isReceipt
      ? 'Uso interno del Delegado de Protección'
      : record?.authorityReference || '—'
  );

  // SECCIÓN 8: SEGUIMIENTO DE LA INCIDENCIA
  builder.drawSectionTitle('8. SEGUIMIENTO DE LA INCIDENCIA');
  builder.drawFieldLine(
    'Responsable del seguimiento',
    `Delegado de Protección de Menores (${LOPIVI_DELEGATE.name})`
  );
  builder.drawFieldLine(
    'Fecha de seguimiento',
    isBlank
      ? '____ / ____ / ______'
      : isReceipt
      ? 'Pendiente'
      : record?.followUpDate || 'Pendiente de programar',
    '____ / ____ / ______'
  );
  builder.drawTextAreaBox(
    'Medidas de protección mantenidas',
    isBlank ? '' : isReceipt ? 'Uso interno del Delegado de Protección.' : record?.followUpMeasures || '',
    14
  );
  builder.drawTextAreaBox(
    'Evolución de la situación',
    isBlank ? '' : isReceipt ? 'Uso interno del Delegado de Protección.' : record?.followUpEvolution || '',
    14
  );
  builder.drawTextAreaBox(
    'Nuevas actuaciones realizadas',
    isBlank ? '' : isReceipt ? 'Uso interno del Delegado de Protección.' : record?.followUpActions || '',
    14
  );
  builder.drawFieldLine(
    'Fecha de cierre o revisión',
    isBlank
      ? '____ / ____ / ______'
      : isReceipt
      ? 'Pendiente'
      : record?.closedDate || 'Expediente abierto / en seguimiento',
    '____ / ____ / ______'
  );
  builder.drawParagraphs([LOPIVI_KEY_MESSAGES.noClosureOnFirstReport], {
    fontSize: 7.7,
    lineHeight: 3.5,
    indent: 2,
    italic: true,
    color: [85, 88, 96],
  });

  // SECCIÓN 9: OBSERVACIONES
  builder.drawSectionTitle('9. OBSERVACIONES');
  builder.drawTextAreaBox(
    'Observaciones adicionales',
    isBlank
      ? ''
      : isReceipt
      ? 'Este documento sirve como acuse de recibo confidencial de su comunicación.'
      : record?.observations || '',
    18
  );

  // SECCIÓN 10: RESPONSABLE DEL REGISTRO
  builder.drawSectionTitle('10. RESPONSABLE DEL REGISTRO');
  builder.ensureSpace(26);
  const doc = builder.doc;
  doc.setFillColor(250, 251, 253);
  doc.setDrawColor(210, 214, 222);
  doc.roundedRect(MARGIN, builder.y, CONTENT_WIDTH, 22, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(22, 24, 30);
  doc.text(LOPIVI_DELEGATE.name, MARGIN + 4, builder.y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.1);
  doc.setTextColor(60, 64, 72);
  doc.text(
    `${LOPIVI_DELEGATE.delegateTitle} · ${LOPIVI_DELEGATE.clubName}`,
    MARGIN + 4,
    builder.y + 10.2
  );
  doc.text(
    `Firma: ___________________________________   Fecha: ${isBlank ? '____ / ____ / ______' : madridNow.dateStr}`,
    MARGIN + 4,
    builder.y + 17.2
  );
  builder.y += 26;

  // ADVERTENCIA SOBRE CONFIDENCIALIDAD
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  const warnLinesAll: string[][] = LOPIVI_KEY_MESSAGES.confidentialityWarnings.map((w) =>
    doc.splitTextToSize(sanitizePdfText(w), CONTENT_WIDTH - 10)
  );
  const warnTotalLines = warnLinesAll.reduce((acc, l) => acc + l.length, 0);
  const warnBoxH = 11 + warnTotalLines * 3.7 + LOPIVI_KEY_MESSAGES.confidentialityWarnings.length * 1.4;

  builder.ensureSpace(warnBoxH + 2);

  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.45);
  doc.roundedRect(MARGIN, builder.y, CONTENT_WIDTH, warnBoxH, 1.2, 1.2, 'FD');
  doc.setLineWidth(0.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.6);
  doc.setTextColor(185, 28, 28);
  doc.text('ADVERTENCIA SOBRE CONFIDENCIALIDAD', MARGIN + 4.5, builder.y + 5.8);

  let wy = builder.y + 10.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(69, 10, 10);
  for (const lines of warnLinesAll) {
    for (const l of lines) {
      doc.text(l, MARGIN + 4.5, wy);
      wy += 3.7;
    }
    wy += 1.4;
  }

  builder.y += warnBoxH + 4;

  return builder.finalizeFooters(
    `${LOPIVI_DELEGATE.clubName} · ${LOPIVI_KEY_MESSAGES.documentConfidentialTag} · ${
      isBlank ? 'Modelo Oficial en Blanco' : record?.recordCode || 'Registro LOPIVI'
    }`
  );
}
