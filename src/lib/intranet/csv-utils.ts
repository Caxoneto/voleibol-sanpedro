/**
  * Utilidades robustas de CSV compatibles con RFC-4180 y Excel en España.
  * Incluye protección contra Formula Injection y codificación BOM UTF-8.
  */

export function parseCsv(text: string): string[][] {
  if (!text || typeof text !== 'string') return [];

  // Normalizar saltos de línea
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length === 0) return [];

  // Detectar separador en la primera línea si no viene especificado
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const result: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let inQuotes = false;
    let currentValue = '';
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Comilla doble escapada dentro de campo entrecomillado
          currentValue += '"';
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(currentValue);
        currentValue = '';
        i++;
      } else {
        currentValue += char;
        i++;
      }
    }
    row.push(currentValue);
    result.push(row);
  }

  return result;
}

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);

  // Protección estricta contra CSV Formula Injection (incluyendo espacios iniciales o tubería '|')
  let sanitized = str;
  if (/^[\s]*[=+\-@\t\r\n|]/.test(sanitized)) {
    sanitized = `'${sanitized}`;
  }

  // Si contiene comillas, saltos de línea o delimitadores (; ,), entrecomillar y escapar comillas dobles
  if (
    sanitized.includes('"') ||
    sanitized.includes(';') ||
    sanitized.includes(',') ||
    sanitized.includes('\n') ||
    sanitized.includes('\r')
  ) {
    sanitized = `"${sanitized.replace(/"/g, '""')}"`;
  }

  return sanitized;
}

export function buildCsvString(headers: string[], rows: unknown[][], delimiter: string = ';'): string {
  const headerLine = headers.map((h) => sanitizeCsvCell(h)).join(delimiter);
  const rowLines = rows.map((row) => row.map((cell) => sanitizeCsvCell(cell)).join(delimiter));

  const csvContent = [headerLine, ...rowLines].join('\r\n');
  // BOM UTF-8 para compatibilidad óptima con Excel en Windows/macOS
  return '\uFEFF' + csvContent;
}

export const FEELSPORTS_CSV_TEMPLATE = buildCsvString(
  ['Nombre', 'Apellidos', 'DNI/NIE', 'Fecha Nacimiento', 'Email', 'Teléfono', 'Categoría', 'Equipo', 'Tutor Legal'],
  [
    ['Sofía', 'García López', '12345678A', '2012-05-14', 'sofia@example.com', '600111222', 'Infantil Femenino Rojo', 'Infantil Femenino', 'María López Pérez'],
    ['Alejandro', 'Martín Ruiz', '87654321B', '2010-09-22', 'alejandro@example.com', '600333444', 'Cadete Masculino', 'Cadete Masculino', 'Carlos Martín Gómez'],
  ],
  ';'
);

export const STAFF_CSV_TEMPLATE = buildCsvString(
  ['Nombre', 'Apellidos', 'Email', 'Teléfono', 'Cargo', 'Equipo Asignado', 'Rol Intranet'],
  [
    ['Alberto', 'Alcántara González', 'alberto@voleibolsanpedro.es', '657713771', 'Presidente / Entrenador', 'Senior Femenino', 'PRESIDENTE'],
    ['Lucía', 'Pérez Gómez', 'lucia@voleibolsanpedro.es', '600555666', 'Entrenadora Ayudante', 'Infantil Femenino Rojo', 'ENTRENADOR'],
  ],
  ';'
);
