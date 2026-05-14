const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { addGroup, getGroups, deleteGroup, updateGroup, getAllGroups, getUserToInvite, getGroupById } = require('../controllers/groupController');

router.post('/', authMiddleware, addGroup);
router.get('/', authMiddleware, getGroups);
router.get('/all', authMiddleware, getAllGroups);
router.get('/:id', authMiddleware, getGroupById);
router.delete('/:id', authMiddleware, deleteGroup);
router.get('/user-to-invite/:id', authMiddleware, getUserToInvite);

module.exports = router;
