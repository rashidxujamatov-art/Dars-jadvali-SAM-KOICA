import express from 'express';
import { prisma } from '../utils/prisma.js';
import { detectConflicts, generateSchedule, shiftHolidayEntries } from '../services/scheduler.js';
import { buildGroupPdf } from '../services/pdfExport.js';

export const scheduleRouter = express.Router();

async function loadContext() {
  const [groups, teachers, subjects, blockedDays, entries] = await Promise.all([
    prisma.group.findMany(),
    prisma.teacher.findMany(),
    prisma.subject.findMany(),
    prisma.blockedDay.findMany(),
    prisma.scheduleEntry.findMany()
  ]);
  return { groups, teachers, subjects, blockedDays, entries };
}

scheduleRouter.post('/generate', async (_, res, next) => {
  try {
    await prisma.scheduleEntry.deleteMany();
    const ctx = await loadContext();
    const created = generateSchedule(ctx);
    const saved = await prisma.$transaction(created.map((e) => prisma.scheduleEntry.create({ data: e })));
    res.json(saved);
  } catch (e) { next(e); }
});

scheduleRouter.get('/view', async (_, res) => {
  const [entries, subjects, teachers] = await Promise.all([prisma.scheduleEntry.findMany(), prisma.subject.findMany(), prisma.teacher.findMany()]);
  res.json(detectConflicts(entries, subjects, teachers));
});

scheduleRouter.post('/holiday', async (req, res, next) => {
  try {
    const holiday = await prisma.holiday.create({ data: req.body });
    const ctx = await loadContext();
    await prisma.scheduleEntry.deleteMany();
    const rebuilt = shiftHolidayEntries({ entries: ctx.entries, holiday, blockedDays: ctx.blockedDays, groups: ctx.groups, teachers: ctx.teachers, subjects: ctx.subjects });
    const saved = await prisma.$transaction(rebuilt.map((e) => prisma.scheduleEntry.create({ data: e })));
    res.json(saved);
  } catch (e) { next(e); }
});

scheduleRouter.get('/pdf/:groupId', async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);
    const [group, entries, teachers, subjects] = await Promise.all([
      prisma.group.findUnique({ where: { id: groupId } }),
      prisma.scheduleEntry.findMany({ where: { group_id: groupId } }),
      prisma.teacher.findMany(),
      prisma.subject.findMany({ where: { group_id: groupId } })
    ]);
    const bytes = await buildGroupPdf({ group, entries, teachers, subjects });
    res.setHeader('Content-Type', 'application/pdf');
    res.send(bytes);
  } catch (e) { next(e); }
});
