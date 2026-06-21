const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications - Get user notifications
router.get('/', authenticate, (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = db.prepare('SELECT COUNT(*) as n FROM notifications WHERE user_id = ?').get(req.user.id).n;
    const unread = db.prepare('SELECT COUNT(*) as n FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id).n;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const notifications = db.prepare(`
      SELECT * FROM notifications WHERE user_id = ?
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(req.user.id, parseInt(limit), offset);

    res.json({ success: true, data: { notifications, unread, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, (req, res, next) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, (req, res, next) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ success: true, message: 'All marked as read' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
