import { Router } from 'express';
import { getConcepts, createConcept, deleteConcept, updateConcept } from '../controllers/conceptController';

const router = Router();

// Concept Routes
router.get('/', getConcepts);
router.post('/', createConcept);
router.patch('/:id', updateConcept);
router.delete('/:id', deleteConcept);

export default router;
