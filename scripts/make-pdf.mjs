import { readFileSync, createWriteStream } from 'fs';
import PDFDocument from 'pdfkit';

const md = readFileSync('DOCUMENTATION.md', 'utf8');
const lines = md.split('\n');

const doc = new PDFDocument({
  margins: { top: 60, bottom: 60, left: 72, right: 72 },
  size: 'A4',
  info: {
    Title: 'Athlete Intelligence — Complete Project Documentation',
    Author: 'Athlete Intelligence',
    CreationDate: new Date(),
  },
});

const out = createWriteStream('DOCUMENTATION.pdf');
doc.pipe(out);

const PAGE_W = doc.page.width - 72 * 2;

// Colours
const DARK   = '#0f172a';
const GREY   = '#475569';
const LIGHT  = '#94a3b8';
const ACCENT = '#0ea5e9';
const CODE_BG = '#f1f5f9';

function hr() {
  doc.moveDown(0.2);
  doc.moveTo(72, doc.y).lineTo(doc.page.width - 72, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
  doc.moveDown(0.4);
}

function isTableRow(line) {
  return line.trim().startsWith('|');
}

function isSeparatorRow(line) {
  return /^\|[-| :]+\|$/.test(line.trim());
}

function parseTableRow(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
}

function stripInline(text) {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\\([|*_`])/g, '$1');
}

let i = 0;
let inCodeBlock = false;
let codeLines = [];
let tableRows = [];
let inTable = false;

function flushTable() {
  if (tableRows.length === 0) return;

  const cols = tableRows[0].length;
  const colW = PAGE_W / cols;
  const ROW_H = 18;
  const PADDING = 4;

  tableRows.forEach((row, rowIdx) => {
    if (rowIdx === 0) {
      // Header row
      doc.rect(72, doc.y, PAGE_W, ROW_H).fill('#1e293b');
      const headerY = doc.y + PADDING;
      row.forEach((cell, ci) => {
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7)
          .text(stripInline(cell), 72 + ci * colW + PADDING, headerY, {
            width: colW - PADDING * 2, lineBreak: false, ellipsis: true
          });
      });
      doc.y = doc.y + ROW_H;
    } else {
      const bg = rowIdx % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(72, doc.y, PAGE_W, ROW_H).fill(bg);
      const cellY = doc.y + PADDING;
      row.forEach((cell, ci) => {
        doc.fillColor(DARK).font('Helvetica').fontSize(6.5)
          .text(stripInline(cell), 72 + ci * colW + PADDING, cellY, {
            width: colW - PADDING * 2, lineBreak: false, ellipsis: true
          });
      });
      doc.y = doc.y + ROW_H;
    }
  });
  doc.fillColor(DARK);
  doc.moveDown(0.6);
  tableRows = [];
  inTable = false;
}

function flushCode() {
  if (codeLines.length === 0) return;
  const text = codeLines.join('\n');
  const boxH = codeLines.length * 11 + 16;

  if (doc.y + boxH > doc.page.height - 80) doc.addPage();

  doc.rect(72, doc.y, PAGE_W, boxH).fill(CODE_BG);
  doc.fillColor('#1e293b').font('Courier').fontSize(7.5)
    .text(text, 80, doc.y - boxH + 8, { width: PAGE_W - 16, lineBreak: true });
  doc.moveDown(0.6);
  doc.fillColor(DARK).font('Helvetica');
  codeLines = [];
  inCodeBlock = false;
}

while (i < lines.length) {
  const raw = lines[i];
  const line = raw.trimEnd();

  // Code block toggle
  if (line.startsWith('```')) {
    if (!inCodeBlock) {
      if (inTable) flushTable();
      inCodeBlock = true;
      codeLines = [];
      i++;
      continue;
    } else {
      flushCode();
      i++;
      continue;
    }
  }

  if (inCodeBlock) {
    codeLines.push(raw.trimEnd());
    i++;
    continue;
  }

  // Table rows
  if (isTableRow(line)) {
    if (isSeparatorRow(line)) { i++; continue; }
    inTable = true;
    tableRows.push(parseTableRow(line));
    i++;
    continue;
  } else if (inTable) {
    flushTable();
  }

  // HR
  if (line.startsWith('---')) {
    hr();
    i++;
    continue;
  }

  // Headings
  const h1 = line.match(/^# (.+)/);
  const h2 = line.match(/^## (.+)/);
  const h3 = line.match(/^### (.+)/);
  const h4 = line.match(/^#### (.+)/);

  if (h1) {
    if (i > 0) doc.addPage();
    doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(22)
      .text(h1[1], 72, doc.y, { width: PAGE_W });
    doc.moveDown(0.3);
    doc.moveTo(72, doc.y).lineTo(doc.page.width - 72, doc.y).strokeColor(ACCENT).lineWidth(2).stroke();
    doc.moveDown(0.6);
    doc.fillColor(DARK);
    i++; continue;
  }

  if (h2) {
    doc.moveDown(0.5);
    if (doc.y > doc.page.height - 120) doc.addPage();
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(15)
      .text(h2[1], 72, doc.y, { width: PAGE_W });
    doc.moveDown(0.2);
    doc.moveTo(72, doc.y).lineTo(doc.page.width - 72, doc.y).strokeColor('#cbd5e1').lineWidth(1).stroke();
    doc.moveDown(0.5);
    doc.fillColor(DARK);
    i++; continue;
  }

  if (h3) {
    doc.moveDown(0.4);
    if (doc.y > doc.page.height - 80) doc.addPage();
    doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(11)
      .text(h3[1], 72, doc.y, { width: PAGE_W });
    doc.moveDown(0.3);
    doc.fillColor(DARK);
    i++; continue;
  }

  if (h4) {
    doc.moveDown(0.3);
    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(9.5)
      .text(h4[1], 72, doc.y, { width: PAGE_W });
    doc.moveDown(0.2);
    doc.fillColor(DARK);
    i++; continue;
  }

  // Blockquote
  if (line.startsWith('>')) {
    const text = stripInline(line.replace(/^>\s*/, ''));
    if (text) {
      doc.rect(72, doc.y, 3, 14).fill(ACCENT);
      doc.fillColor(GREY).font('Helvetica-Oblique').fontSize(9)
        .text(text, 82, doc.y, { width: PAGE_W - 10 });
      doc.moveDown(0.1);
      doc.fillColor(DARK).font('Helvetica');
    }
    i++; continue;
  }

  // List items
  const bullet = line.match(/^(\s*)[*\-] (.+)/);
  const numbered = line.match(/^(\s*)\d+\. (.+)/);
  if (bullet) {
    const indent = bullet[1].length;
    const text = stripInline(bullet[2]);
    const x = 72 + indent * 8;
    doc.fillColor(ACCENT).font('Helvetica').fontSize(9).text('•', x, doc.y, { continued: true, width: 10 });
    doc.fillColor(DARK).text(' ' + text, { width: PAGE_W - indent * 8 - 10 });
    i++; continue;
  }
  if (numbered) {
    const indent = numbered[1].length;
    const text = stripInline(numbered[2]);
    const x = 72 + indent * 8;
    doc.fillColor(DARK).font('Helvetica').fontSize(9)
      .text(text, x + 14, doc.y, { width: PAGE_W - indent * 8 - 14 });
    i++; continue;
  }

  // Empty line
  if (line.trim() === '') {
    doc.moveDown(0.35);
    i++; continue;
  }

  // Normal paragraph
  const text = stripInline(line);
  if (text) {
    doc.fillColor(DARK).font('Helvetica').fontSize(9)
      .text(text, 72, doc.y, { width: PAGE_W, lineBreak: true });
  }
  i++;
}

if (inTable) flushTable();
if (inCodeBlock) flushCode();

doc.end();
out.on('finish', () => {
  console.log('PDF written to DOCUMENTATION.pdf');
});
