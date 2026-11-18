import { jsPDF } from 'jspdf';
import { CLUB_INFO } from '@/lib/club-info';
import { CLUB_LOGO_BASE64 } from '@/lib/club-logo-base64';

export interface ReceiptPdfInput {
  receiptNumber: string;
  paidMadridDate: string;
  athleteName: string;
  teamName: string;
  payerName: string;
  payerEmail?: string | null;
  methodLabel: string;
  reference?: string | null;
  amount: number;
  items: Array<{ concept: string; amount: number }>;
  notes?: string | null;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo (Caja del Club)',
  BANK_TRANSFER: 'Transferencia Bancaria',
  POS_TERMINAL: 'TPV Físico / Datafono',
  REDSYS_CARD: 'Tarjeta Online (Redsys)',
  REDSYS_BIZUM: 'Bizum (Redsys)',
};

export function getPaymentMethodLabel(method: string): string {
  return METHOD_LABELS[method] || method;
}

/**
 * Genera el recibo oficial de cuota o pago deportivo en formato estricto de 1 página A4.
 */
export function generatePaymentReceiptPdf(data: ReceiptPdfInput): ArrayBuffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Banda superior carmesí del club
  doc.setFillColor(217, 4, 41);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Logo + Datos fiscales del Club
  try {
    doc.addImage(CLUB_LOGO_BASE64, 'JPEG', margin, y, 22, 16);
  } catch {
    // Continuar sin logo si falla decodificación
  }

  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(CLUB_INFO.federationRegisteredName || CLUB_INFO.name.toUpperCase(), margin + 26, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(`CIF: ${CLUB_INFO.cif} · ${CLUB_INFO.officialAddress}`, margin + 26, y + 10.5);
  doc.text(`${CLUB_INFO.contactEmail} · ${CLUB_INFO.contactPhone} · voleibolsanpedro.es`, margin + 26, y + 15);

  // Recuadro número de recibo
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(pageWidth - margin - 52, y - 1, 52, 18, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(217, 4, 41);
  doc.text('RECIBO OFICIAL', pageWidth - margin - 26, y + 4.5, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text(data.receiptNumber, pageWidth - margin - 26, y + 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`Fecha: ${data.paidMadridDate}`, pageWidth - margin - 26, y + 14.5, { align: 'center' });

  y += 26;
  doc.setDrawColor(217, 4, 41);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Bloque Deportista y Pagador
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('DEPORTISTA', margin + 5, y + 7);
  doc.text('PAGADOR / TUTOR', margin + contentWidth / 2 + 4, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(data.athleteName.slice(0, 40), margin + 5, y + 14);
  doc.text(data.payerName.slice(0, 40), margin + contentWidth / 2 + 4, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(`Equipo: ${data.teamName}`, margin + 5, y + 21);
  if (data.payerEmail) {
    doc.text(`Email: ${data.payerEmail}`, margin + contentWidth / 2 + 4, y + 21);
  }
  doc.text(`Forma de pago: ${data.methodLabel}`, margin + 5, y + 28);
  if (data.reference) {
    doc.text(`Ref.: ${data.reference}`, margin + contentWidth / 2 + 4, y + 28);
  }

  y += 44;

  // Tabla de conceptos imputados
  doc.setFillColor(24, 24, 27);
  doc.rect(margin, y, contentWidth, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('CONCEPTO', margin + 4, y + 6);
  doc.text('IMPORTE', pageWidth - margin - 4, y + 6, { align: 'right' });
  y += 9;

  const items =
    data.items.length > 0
      ? data.items
      : [{ concept: 'Abono de cuota deportiva / actividad del club', amount: data.amount }];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  for (const item of items.slice(0, 12)) {
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y + 9, pageWidth - margin, y + 9);
    doc.setTextColor(31, 41, 55);
    doc.text(item.concept.slice(0, 68), margin + 4, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.amount.toFixed(2)} €`, pageWidth - margin - 4, y + 6, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 9;
  }

  y += 8;

  // Total destacado
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(217, 4, 41);
  doc.roundedRect(pageWidth - margin - 72, y, 72, 16, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(153, 27, 27);
  doc.text('TOTAL ABONADO', pageWidth - margin - 68, y + 6);
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text(`${data.amount.toFixed(2)} €`, pageWidth - margin - 4, y + 12.5, { align: 'right' });

  if (data.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99);
    const noteLines = doc.splitTextToSize(`Observaciones: ${data.notes}`, contentWidth - 80);
    doc.text(noteLines, margin, y + 5);
  }

  // Pie fiscal y exención IVA deportivo
  const footerY = 262;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  const legalLines = doc.splitTextToSize(
    `Entidad deportiva sin ánimo de lucro (${CLUB_INFO.federationRegisteredName}, CIF ${CLUB_INFO.cif}). Operación exenta de IVA en virtud del Art. 20.Uno.13º de la Ley 37/1992 del Impuesto sobre el Valor Añadido (servicios deportivos prestados a personas físicas por entidades sin finalidad lucrativa).`,
    contentWidth
  );
  doc.text(legalLines, margin, footerY);

  return doc.output('arraybuffer');
}
