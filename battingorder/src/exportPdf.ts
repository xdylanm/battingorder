import jsPDF from 'jspdf';
import type { Game, Player } from './types';

const INNINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function exportLineupPdf(
  game: Game,
  battingOrder: string[],
  playerMap: Record<string, Player>,
  grid: Record<string, string[]>,
  scratchIds: Set<string>,
  teamName = 'Blue Jays U17C',
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;

  // ── Pallette ─────────────────────────────────────────────────────────────────
  const BLUE       = [13,  71, 161] as [number,number,number];
  const LIGHT_BLUE = [222, 235, 255] as [number,number,number];
  const INFIELD_BG = [232, 245, 233] as [number,number,number]; // green tint
  const OUTFIELD_BG= [255, 243, 224] as [number,number,number]; // orange tint
  const SIT_BG     = [255, 205, 210] as [number,number,number]; // red tint
  const HEADER_BG  = [236, 239, 241] as [number,number,number]; // light grey
  const DARK       = [33,  33,  33]  as [number,number,number];
  const SCRATCH_RED= [183,  28,  28]  as [number,number,number];

  // ── Title ────────────────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageW, 20, 'F');
  doc.setTextColor(255, 255, 255);
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
        doc.setFillColor(...HEADER_BG);
        doc.rect(x, y, infoColW, h, 'F');
        doc.setDrawColor(180, 180, 180);
        doc.rect(x, y, infoColW, h, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.text(cell, x + 3, y + 5.5);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(x, y, infoColW, h, 'F');
        doc.setDrawColor(180, 180, 180);
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
  doc.setTextColor(...BLUE);
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
  doc.setFillColor(...BLUE);
  doc.rect(margin, y, tableContentW, rowH, 'F');
  doc.setTextColor(255, 255, 255);
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

    const rowBg: [number,number,number] = rowIdx % 2 === 0 ? [255,255,255] : [248,249,250];
    doc.setFillColor(...rowBg);
    doc.rect(margin, y, tableContentW, rowH, 'F');
    doc.setDrawColor(210, 210, 210);
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
    doc.text(player.jersey_number != null ? String(player.jersey_number) : '', x + colJsy / 2, y + 5.5, { align: 'center' });
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
        doc.setTextColor(...SCRATCH_RED);
        doc.text('X', x + innW / 2, y + 5.5, { align: 'center' });
        doc.setTextColor(...DARK);
      } else if (pos) {
        const isP = pos === 'P', isC = pos === 'C';
        const isIF = ['1B','2B','3B','SS'].includes(pos);
        const bg: [number,number,number] = isP || isC ? LIGHT_BLUE : isIF ? INFIELD_BG : OUTFIELD_BG;
        doc.setFillColor(...bg);
        doc.rect(x, y, innW, rowH, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK);
        doc.text(pos, x + innW / 2, y + 5.5, { align: 'center' });
      }
      doc.setDrawColor(210, 210, 210);
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
    doc.setTextColor(...BLUE);
    doc.text('Scratches', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SCRATCH_RED);
    const names = [...scratchIds].map(id => playerMap[id]?.name ?? id).join(', ');
    doc.text(names, margin, y);
    y += 6;
  }

  // ── Notes area ────────────────────────────────────────────────────────────────
  y += 6;
  const notesH = 40;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.text('Notes', margin, y);
  y += 4;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(180, 180, 180);
  doc.rect(margin, y, tableContentW, notesH, 'FD');

  doc.save(
    `GameCard-${game.opponent.replace(/\s+/g, '_')}-${new Date(game.starttime).toLocaleDateString('en-CA')}.pdf`,
  );
}
