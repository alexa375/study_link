import { Router } from 'express';
import {
    generateSocraticQuestion,
    generateEmotionalAnchor,
    generateWaterDropConnection,
    generateWaterDropZoom,
    generateMetaPattern
} from '../controllers/aiController';

const router = Router();

// AI Pipeline Routes
router.get('/socratic/:conceptId', generateSocraticQuestion);
router.get('/emotional/:conceptId', generateEmotionalAnchor);
router.get('/waterdrop', generateWaterDropConnection);
router.get('/waterdrop-zoom', generateWaterDropZoom);
router.get('/meta-pattern', generateMetaPattern);

export default router;
