/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express';
import { PublisherController } from '@/modules/publishers/publisher.controller';

const router = Router();
const controller = new PublisherController();

router.get('/', (req, res) => controller.getAll(req, res));
router.get('/:id', (req, res) => controller.getById(req, res));
router.post('/', (req, res) => controller.create(req, res));
router.put('/:id', (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));

export default router;
