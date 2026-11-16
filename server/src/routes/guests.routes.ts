import { Router } from 'express';
import { requireCouple } from '../middleware/requireCouple';
import { requireGuest } from '../middleware/requireGuest';
import {
  getGuests,
  createGuest,
  updateGuest,
  deleteGuest,
  getGuestGroups,
  createGuestGroup,
  updateGuestGroup,
  deleteGuestGroup,
  getMyRsvp,
  updateMyRsvp,
  getMyBlessing,
  saveMyBlessing,
  getBlessings,
} from '../controllers/guests.controller';

const router = Router();

router.get('/me/rsvp', requireGuest, getMyRsvp);
router.put('/me/rsvp', requireGuest, updateMyRsvp);
router.get('/me/blessing', requireGuest, getMyBlessing);
router.put('/me/blessing', requireGuest, saveMyBlessing);

router.use(requireCouple);

router.get('/blessings', getBlessings);
router.get('/groups', getGuestGroups);
router.post('/groups', createGuestGroup);
router.put('/groups/:id', updateGuestGroup);
router.delete('/groups/:id', deleteGuestGroup);

router.get('/', getGuests);
router.post('/', createGuest);
router.put('/:id', updateGuest);
router.delete('/:id', deleteGuest);

export default router;
