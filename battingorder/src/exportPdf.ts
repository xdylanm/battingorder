import jsPDF from 'jspdf';
import type { Game, Player } from './types';

const INNINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function exportLineupPdf(
  game: Game,
  battingOrder: string[],
  playerMap: Record<string, Player>,
  grid: Record<string, string[]>,
  scratchIds: Set<string>,
  notes = '',
  teamName = 'Blue Jays U17C',
  jerseyOverrides: Record<string, string> = {},
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;

  // ── Palette (black & white) ──────────────────────────────────────────────────
  const BLACK      = [0,   0,   0]   as [number,number,number];
  const WHITE      = [255, 255, 255] as [number,number,number];
  const DARK       = [33,  33,  33]  as [number,number,number];
  const HEADER_BG  = [50,  50,  50]  as [number,number,number]; // dark grey header
  const ROW_ALT    = [240, 240, 240] as [number,number,number]; // light grey alternating rows
  const BORDER     = [150, 150, 150] as [number,number,number];
  const SIT_BG     = [200, 200, 200] as [number,number,number]; // mid-grey for sits

  // ── Title ────────────────────────────────────────────────────────────────────
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, 0, pageW, 20, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${teamName} Game Card`, margin, 13);

  // ── Game info table ───────────────────────────────────────────────────────────
  let y = 26;
  const gameDate = new Date(game.starttime).toLocaleDateString('en-CA', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  const gameTime = new Date(game.starttime).toLocaleTimeString('en-CA', {
    hour: 'numeric', minute: '2-digit',
  });

  const infoColW = (pageW - margin * 2) / 3;
  const infoRows = [
    ['Start', 'Location', 'Opponent'],
    [`${gameDate}, ${gameTime}`, game.location, game.opponent],
  ];

  infoRows.forEach((row, rowIdx) => {
    row.forEach((cell, colIdx) => {
      const x = margin + colIdx * infoColW;
      const h = 8;
      if (rowIdx === 0) {
        doc.setFillColor(...ROW_ALT);
        doc.rect(x, y, infoColW, h, 'F');
        doc.setDrawColor(...BORDER);
        doc.rect(x, y, infoColW, h, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.text(cell, x + 3, y + 5.5);
      } else {
        doc.setFillColor(...WHITE);
        doc.rect(x, y, infoColW, h, 'F');
        doc.setDrawColor(...BORDER);
        doc.rect(x, y, infoColW, h, 'S');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.text(cell, x + 3, y + 5.5);
      }
    });
    y += 8;
  });

  // ── Section title: Lineup ────────────────────────────────────────────────────
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text('Lineup', margin, y);
  y += 5;

  // ── Column widths ─────────────────────────────────────────────────────────────
  const colOrder = 8;
  const colJsy   = 10;
  const colName  = 40;
  const tableContentW = pageW - margin * 2;
  const innW = (tableContentW - colOrder - colJsy - colName) / INNINGS.length;
  const rowH = 8;

  // ── Lineup header ─────────────────────────────────────────────────────────────
  doc.setFillColor(...HEADER_BG);
  doc.rect(margin, y, tableContentW, rowH, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  let cx = margin;
  doc.text('', cx + colOrder / 2, y + 5.5, { align: 'center' });
  cx += colOrder;
  doc.text('#', cx + colJsy / 2, y + 5.5, { align: 'center' });
  cx += colJsy;
  doc.text('Name', cx + 2, y + 5.5);
  cx += colName;
  INNINGS.forEach(inn => {
    doc.text(String(inn), cx + innW / 2, y + 5.5, { align: 'center' });
    cx += innW;
  });
  y += rowH;

  // ── Lineup rows ───────────────────────────────────────────────────────────────
  const activeBatters = battingOrder.filter(id => !scratchIds.has(id));
  activeBatters.forEach((playerId, rowIdx) => {
    const player = playerMap[playerId];
    if (!player) return;

    const rowBg: [number,number,number] = rowIdx % 2 === 0 ? WHITE : ROW_ALT;
    doc.setFillColor(...rowBg);
    doc.rect(margin, y, tableContentW, rowH, 'F');
    doc.setDrawColor(...BORDER);
    doc.rect(margin, y, tableContentW, rowH, 'S');

    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    let x = margin;
    // order
    doc.text(String(rowIdx + 1), x + colOrder / 2, y + 5.5, { align: 'center' });
    x += colOrder;
    // jersey
    doc.setFont('helvetica', 'normal');
    const jerseyVal = jerseyOverrides[playerId] !== undefined
      ? jerseyOverrides[playerId]
      : (player.jersey_number != null ? String(player.jersey_number) : '');
    doc.text(jerseyVal, x + colJsy / 2, y + 5.5, { align: 'center' });
    x += colJsy;
    // name
    doc.setFont('helvetica', 'bold');
    doc.text(player.name, x + 2, y + 5.5);
    x += colName;

    INNINGS.forEach((_, innIdx) => {
      const pos = grid[playerId]?.[innIdx] ?? '';
      if (pos === 'X') {
        doc.setFillColor(...SIT_BG);
        doc.rect(x, y, innW, rowH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text('X', x + innW / 2, y + 5.5, { align: 'center' });
      } else if (pos) {
        doc.setFillColor(...rowBg);
        doc.rect(x, y, innW, rowH, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK);
        doc.text(pos, x + innW / 2, y + 5.5, { align: 'center' });
      }
      doc.setDrawColor(...BORDER);
      doc.line(x, y, x, y + rowH);
      x += innW;
    });

    y += rowH;
  });

  // ── Scratches ─────────────────────────────────────────────────────────────────
  if (scratchIds.size > 0) {
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BLACK);
    doc.text('Scratches', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    const names = [...scratchIds].map(id => playerMap[id]?.name ?? id).join(', ');
    doc.text(names, margin, y);
    y += 6;
  }

  // ── Notes area ────────────────────────────────────────────────────────────────
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text('Notes', margin, y);
  y += 5;

  if (notes.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(notes.trim(), tableContentW - 4);
    const notesTextH = lines.length * 5 + 4;
    doc.setFillColor(...ROW_ALT);
    doc.setDrawColor(...BORDER);
    doc.rect(margin, y, tableContentW, notesTextH, 'FD');
    doc.text(lines, margin + 2, y + 5);
    y += notesTextH;
  } else {
    // blank box
    const notesH = 35;
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(...BORDER);
    doc.rect(margin, y, tableContentW, notesH, 'FD');
  }

  doc.save(
    `GameCard-${game.opponent.replace(/\s+/g, '_')}-${new Date(game.starttime).toLocaleDateString('en-CA')}.pdf`,
  );
}
