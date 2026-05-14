const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { addInvitation, acceptOrRejectInvitation, getInvitations, getUserToInvite } = require('../controllers/invitationController');

router.post('/add-invitation', authMiddleware, addInvitation);
router.post('/accept-reject-invitation', authMiddleware, acceptOrRejectInvitation);
router.get('/get-invitations', authMiddleware, getInvitations);

module.exports = router;
