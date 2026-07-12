import { Router } from 'express';
import * as controller from '../controllers/weddingRequest.controller';

const router = Router();

router.post('/', controller.create);

export default router;