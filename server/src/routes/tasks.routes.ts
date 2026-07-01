import { Router } from 'express';
import { requireCouple } from '../middleware/requireCouple';
import { getTasks, getTask, createTask, updateTask, deleteTask } from '../controllers/tasks.controller';

const router = Router();

router.use(requireCouple);

router.get('/', getTasks);
router.get('/:id', getTask);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
