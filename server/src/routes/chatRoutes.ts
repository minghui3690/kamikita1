
import express from 'express';
import { askWithContext } from '../controllers/chatController';

const router = express.Router();

// POST /api/chat/ask
router.post('/ask', askWithContext);

export default router;
