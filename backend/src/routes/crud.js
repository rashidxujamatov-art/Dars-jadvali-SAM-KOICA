import express from 'express';
import { prisma } from '../utils/prisma.js';

export const crudRouter = express.Router();

const models = {
  groups: prisma.group,
  teachers: prisma.teacher,
  subjects: prisma.subject,
  blockedDays: prisma.blockedDay,
  holidays: prisma.holiday,
  schedule: prisma.scheduleEntry
};

for (const [path, model] of Object.entries(models)) {
  crudRouter.get(`/${path}`, async (_, res) => res.json(await model.findMany()));
  crudRouter.post(`/${path}`, async (req, res) => res.json(await model.create({ data: req.body })));
  crudRouter.put(`/${path}/:id`, async (req, res) => res.json(await model.update({ where: { id: Number(req.params.id) }, data: req.body })));
  crudRouter.delete(`/${path}/:id`, async (req, res) => res.json(await model.delete({ where: { id: Number(req.params.id) } })));
}
