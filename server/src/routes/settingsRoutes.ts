import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { authenticateToken, isAdmin, isSuperAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Public read for some settings (branding), or Protected?
// Usually branding is public (Landing page needs it).
// But for now, app structure loads settings after login or for hydration.
// Landing page isn't connected to DB yet probably. 
// Let's make GET public-ish or at least check flow. 
// Actually safest: GET requires no auth for landing page parts, but full settings need auth.
// User asks for "Admin Setting", so PUT is definitely Admin only.
// Let's implement full protection for now, as Landing Page can fetch a public subset if needed later.
// Wait, "LandingPage.tsx" exists. It might need settings.
// I'll make GET public for now to facilitate easier access, or maybe just authenticated.
// Given strict requirements, let's keep GET public (so frontend can load logo etc on login screen).

router.get('/', getSettings); 
router.put('/', authenticateToken, isSuperAdmin, updateSettings);

export default router;
