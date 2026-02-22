import { Router } from 'express';
import { getMaps, createMap, deleteMap, updateMap, reorderMaps } from '../controllers/mapController';

const router = Router();

router.get('/', getMaps);
router.post('/', createMap);
router.post('/reorder', reorderMaps);
router.patch('/:id', updateMap);
router.delete('/:id', deleteMap);

export default router;
