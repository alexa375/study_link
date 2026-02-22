import { Router } from 'express';
import { getConceptWithRelations, findAccessiblePath } from '../controllers/graphController';

const router = Router();

// Concept Graph queries
router.get('/:id/relations', getConceptWithRelations);
router.get('/path', findAccessiblePath);

export default router;
