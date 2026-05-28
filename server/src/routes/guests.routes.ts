import { Router } from 'express';
import { requireCouple } from '../middleware/requireCouple';
import {
  getGuests,
  createGuest,
  updateGuest,
  deleteGuest,
  getGuestGroups,
  createGuestGroup,
  updateGuestGroup,
  deleteGuestGroup,
} from '../controllers/guests.controller';

const router = Router();

router.use(requireCouple);

router.get('/groups', getGuestGroups);
router.post('/groups', createGuestGroup);
router.put('/groups/:id', updateGuestGroup);
router.delete('/groups/:id', deleteGuestGroup);

router.get('/', getGuests);
router.post('/', createGuest);
router.put('/:id', updateGuest);
router.delete('/:id', deleteGuest);

export default router;
