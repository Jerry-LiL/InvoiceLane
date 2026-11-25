import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;
const BOTTOM = 56;

const ink = rgb(0.114, 0.102, 0.086);
const muted = rgb(0.435, 0.404, 0.369);
const pine = rgb(0.118, 0.227, 0.196);
const ruleColor = rgb(0.886, 0.851, 0.8);

export type InvoicePdfLine = {
  description: string;
  quantityLabel: string;
  unitPriceLabel: string;
  amountLabel: string;
};

export type InvoicePdfModel = {
  numberLabel: string;
  statusLabel: string;
  fromLines: string[];
  billToLines: string[];
  issueDateLabel: string;
  dueDateLabel: string;
  lines: InvoicePdfLine[];
  subtotalLabel: string;
  taxLabel: string;
  taxAmountLabel: string;
  totalLabel: string;
  notes: string | null;
};

function clean(value: string): string {
  return value.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, '');
}

function drawRight(
  page: PDFPage,
  text: string,
  right: number,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: right - width, y, size, font, color });
}

function drawRule(page: PDFPage, y: number): number {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.6,
    color: ruleColor,
  });
  return y;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

function paintBand(page: PDFPage) {
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 8, width: PAGE_WIDTH, height: 8, color: pine });
}

function drawBlock(
  page: PDFPage,
  title: string,
  lines: string[],
  x: number,
  y: number,
  titleFont: PDFFont,
  bodyFont: PDFFont,
): number {
  page.drawText(title.toUpperCase(), { x, y, size: 8, font: titleFont, color: muted });
  let cursor = y - 14;
  const printable = lines.length > 0 ? lines : ['-'];
  for (const line of printable) {
    page.drawText(line || '-', { x, y: cursor, size: 10, font: bodyFont, color: ink });
    cursor -= 13;
  }
  return cursor;
}

function drawTableHeader(page: PDFPage, y: number, font: PDFFont): number {
  page.drawText('Description', { x: MARGIN, y, size: 9, font, color: muted });
  drawRight(page, 'Qty', 390, y, 9, font, muted);
  drawRight(page, 'Price', 470, y, 9, font, muted);
  drawRight(page, 'Amount', PAGE_WIDTH - MARGIN, y, 9, font, muted);
  return drawRule(page, y - 8) - 14;
}

export async function renderInvoicePdf(model: InvoicePdfModel): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);

  doc.setTitle(clean(model.numberLabel));
  doc.setAuthor(clean(model.fromLines[0] ?? 'InvoiceLane'));

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  paintBand(page);
  let y = PAGE_HEIGHT - MARGIN;

  page.drawText('INVOICE', { x: MARGIN, y, size: 22, font: serifBold, color: pine });
  drawRight(page, clean(model.numberLabel), PAGE_WIDTH - MARGIN, y, 22, serifBold, ink);
  y -= 18;
  page.drawText(clean(model.statusLabel).toUpperCase(), { x: MARGIN, y, size: 9, font: sansBold, color: muted });
  y -= 28;

  const fromBottom = drawBlock(page, 'From', model.fromLines.map(clean), MARGIN, y, sansBold, sans);
  const billBottom = drawBlock(page, 'Bill to', model.billToLines.map(clean), 320, y, sansBold, sans);
  y = Math.min(fromBottom, billBottom) - 16;

  page.drawText(`Issued ${clean(model.issueDateLabel)}`, { x: MARGIN, y, size: 10, font: sans, color: ink });
  drawRight(page, `Due ${clean(model.dueDateLabel)}`, PAGE_WIDTH - MARGIN, y, 10, sans, ink);
  y -= 16;
  y = drawRule(page, y) - 16;
  y = drawTableHeader(page, y, sansBold);

  const continuePage = (needed: number) => {
    if (y - needed >= BOTTOM) return;
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    paintBand(page);
    y = PAGE_HEIGHT - MARGIN;
    page.drawText(clean(model.numberLabel), { x: MARGIN, y, size: 12, font: serifBold, color: pine });
    y -= 22;
    y = drawTableHeader(page, y, sansBold);
  };

  for (const line of model.lines) {
    const wrapped = wrap(clean(line.description), sans, 10, 260);
    continuePage(wrapped.length * 14 + 8);
    wrapped.forEach((text, index) => {
      page.drawText(text, { x: MARGIN, y, size: 10, font: sans, color: ink });
      if (index === 0) {
        drawRight(page, clean(line.quantityLabel), 390, y, 10, sans, ink);
        drawRight(page, clean(line.unitPriceLabel), 470, y, 10, sans, ink);
        drawRight(page, clean(line.amountLabel), PAGE_WIDTH - MARGIN, y, 10, sans, ink);
      }
      y -= 14;
    });
    y -= 6;
  }

  continuePage(96);
  y -= 4;
  y = drawRule(page, y) - 18;
  drawRight(page, `Subtotal  ${clean(model.subtotalLabel)}`, PAGE_WIDTH - MARGIN, y, 10, sans, ink);
  y -= 16;
  drawRight(page, `${clean(model.taxLabel)}  ${clean(model.taxAmountLabel)}`, PAGE_WIDTH - MARGIN, y, 10, sans, ink);
  y -= 18;
  drawRight(page, `Total  ${clean(model.totalLabel)}`, PAGE_WIDTH - MARGIN, y, 12, sansBold, ink);

  if (model.notes?.trim()) {
    const noteLines = model.notes
      .split(/\r?\n/)
      .flatMap((line) => wrap(clean(line), sans, 10, PAGE_WIDTH - MARGIN * 2));
    y -= 28;
    continuePage(20 + noteLines.length * 14);
    page.drawText('Notes', { x: MARGIN, y, size: 10, font: sansBold, color: muted });
    y -= 16;
    for (const line of noteLines) {
      if (y < BOTTOM) {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        paintBand(page);
        y = PAGE_HEIGHT - MARGIN;
      }
      page.drawText(line, { x: MARGIN, y, size: 10, font: sans, color: ink });
      y -= 14;
    }
  }

  return doc.save();
}
