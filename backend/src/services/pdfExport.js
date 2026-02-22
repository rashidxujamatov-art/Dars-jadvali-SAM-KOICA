import { PDFDocument, StandardFonts } from 'pdf-lib';

export async function buildGroupPdf({ group, entries, teachers, subjects }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawText('Organization name', { x: 50, y: 800, size: 14, font });
  page.drawText('Tasdiqlayman', { x: 420, y: 800, size: 12, font });
  page.drawText('Position: ___________________', { x: 420, y: 780, size: 10, font });
  page.drawText('FIO: _______________________', { x: 420, y: 765, size: 10, font });
  page.drawText('Date: ______________________', { x: 420, y: 750, size: 10, font });
  page.drawText('Signature: ________________', { x: 420, y: 735, size: 10, font });

  page.drawText(`GROUP: ${group.name}`, { x: 50, y: 760, size: 13, font });
  let y = 720;
  for (const e of entries) {
    const subject = subjects.find((s) => s.id === e.subject_id);
    const teacher = teachers.find((t) => t.id === e.teacher_id);
    page.drawText(`W${e.week_number} D${e.day} P${e.pair_start}: ${(subject?.name || '').toUpperCase()} - ${teacher?.last_name || ''}`, { x: 50, y, size: 10, font });
    y -= 14;
    if (y < 120) break;
  }

  page.drawText('Teacher list:', { x: 50, y: 90, size: 11, font });
  page.drawText(teachers.map((t) => `${t.last_name} ${t.first_name[0]}.`).join(', '), { x: 120, y: 90, size: 10, font });
  page.drawText('ICHTU', { x: 50, y: 60, size: 12, font });
  page.drawText('Signature fields: ____________________', { x: 120, y: 60, size: 10, font });

  return Buffer.from(await pdf.save());
}
