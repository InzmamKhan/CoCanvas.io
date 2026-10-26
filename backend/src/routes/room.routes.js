const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/create', authMiddleware, roomController.createRoom);
router.post('/join-check', authMiddleware, roomController.joinRoomCheck);
router.get('/:roomid', authMiddleware, roomController.getRoom);

module.exports = router;
