const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Get all notifications for the user
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    res.json({ status: 200, data: notifications });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
});

// Mark a notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });
    if (!notification) return res.status(404).json({ status: 404, message: 'Notification not found' });
    
    notification.is_read = true;
    await notification.save();
    res.json({ status: 200, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
});

// Mark all as read
router.put('/read-all', async (req, res) => {
  try {
    await Notification.update({ is_read: true }, {
      where: { user_id: req.user.id, is_read: false }
    });
    res.json({ status: 200, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
});

module.exports = router;
