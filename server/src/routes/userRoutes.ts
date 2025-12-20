import { Router } from 'express';
import {
    getUsers, toggleUserStatus, deleteUser, getDashboardStats, getNetwork,
    getWalletHistory, getWithdrawals, requestWithdrawal, getRecentActions,
    processWithdrawalRequest, updateMe, updateUser, getHumanDesign, saveHumanDesign, transferPoints, getAdminWalletLogs, toggleKakaAccess, getKakaItems,
    getAdminUserTransactions, grantAccess, updateAccess, sendFileEmail,
    createKakaItem, updateKakaItem, deleteKakaItem, toggleHumanDesignAccess, updateHDAccessLevels, toggleAiAssistantAccess,
    cancelWithdrawalRequest, archiveActions, archiveAdminLogs
} from '../controllers/userController';
import { authenticateToken, isAdmin, isSuperAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Routes
router.put('/profile', authenticateToken, updateMe);
router.get('/', authenticateToken, isAdmin, getUsers);
router.get('/admin/wallet', authenticateToken, isAdmin, getAdminWalletLogs); // NEW Admin Wallet
router.post('/admin/wallet/archive', authenticateToken, isAdmin, archiveAdminLogs); // [NEW] Archive Logs
router.put('/:id/status', authenticateToken, isAdmin, toggleUserStatus);
router.delete('/:id', authenticateToken, isAdmin, deleteUser);
router.put('/:id', authenticateToken, isSuperAdmin, updateUser);
router.get('/:id/human-design', authenticateToken, getHumanDesign); // Allow member to read their own
router.post('/:id/human-design', authenticateToken, isAdmin, saveHumanDesign); // Allow admin to save
router.post('/:id/transfer-points', authenticateToken, isAdmin, transferPoints); // Admin Transfer
router.put('/:id/kaka-access', authenticateToken, isAdmin, toggleKakaAccess); // Toggle Kaka Access
router.put('/:id/human-design-access', authenticateToken, isAdmin, toggleHumanDesignAccess); // Toggle Human Design Access
router.put('/:id/ai-assistant-access', authenticateToken, isAdmin, toggleAiAssistantAccess); // Toggle AI Assistant Access
router.put('/:id/hd-access-levels', authenticateToken, isAdmin, updateHDAccessLevels); 
// Actually I need to add updateHDAccessLevels to import list first.


router.get('/stats', authenticateToken, getDashboardStats);
router.get('/network', authenticateToken, getNetwork);
router.get('/recent', authenticateToken, getRecentActions);
router.post('/recent/archive', authenticateToken, archiveActions);
// Kaka Items (Public/Member View)
router.get('/kaka-items', authenticateToken, getKakaItems);
// Kaka Management (Admin)
router.post('/kaka-items', authenticateToken, isAdmin, createKakaItem);
router.put('/kaka-items/:id', authenticateToken, isAdmin, updateKakaItem);
router.delete('/kaka-items/:id', authenticateToken, isAdmin, deleteKakaItem);

// Admin File Access Management
router.get('/:id/transactions', authenticateToken, isAdmin, getAdminUserTransactions);
router.post('/:id/grant-access', authenticateToken, isAdmin, grantAccess);
router.put('/:id/update-access', authenticateToken, isAdmin, updateAccess);
router.post('/:id/send-file', authenticateToken, isAdmin, sendFileEmail);

// Wallet
router.get('/wallet/history', authenticateToken, getWalletHistory);
router.get('/withdrawals', authenticateToken, getWithdrawals);
router.post('/withdraw', authenticateToken, requestWithdrawal);
router.post('/withdraw/:id/cancel', authenticateToken, cancelWithdrawalRequest);
router.put('/withdraw/:id', authenticateToken, isAdmin, processWithdrawalRequest);

export default router;
