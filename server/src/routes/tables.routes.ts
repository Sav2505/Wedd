import { Router } from 'express';
import { requireCouple } from '../middleware/requireCouple';
import {
  getTables, createTable, updateTable, deleteTable,
  assignGuest, unassignGuest, getUnassigned,
} from '../controllers/tables.controller';

const router = Router();

// Public (all authenticated users can view tables)
router.get('/',                getTables);
router.get('/unassigned',      requireCouple, getUnassigned);

// Couple-only mutations
router.post('/',               requireCouple, createTable);
router.put('/:id',             requireCouple, updateTable);
router.delete('/:id',          requireCouple, deleteTable);
router.post('/:id/assign',     requireCouple, assignGuest);
router.delete('/guests/:guestId', requireCouple, unassignGuest);

export default router;
