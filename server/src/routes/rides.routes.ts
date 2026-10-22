import { Router } from 'express';
import { requireGuest } from '../middleware/requireGuest';
import {
  createRidePost,
  deleteRidePost,
  listRidePosts,
  updateRidePost,
  updateRidePostStatus,
} from '../controllers/rides.controller';

const router = Router();

router.use(requireGuest);
router.get('/', listRidePosts);
router.post('/', createRidePost);
router.put('/:id', updateRidePost);
router.patch('/:id/status', updateRidePostStatus);
router.delete('/:id', deleteRidePost);

export default router;