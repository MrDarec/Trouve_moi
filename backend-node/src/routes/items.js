const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', optionalAuth, itemController.getItems);
router.get('/map', optionalAuth, itemController.getMapItems);
router.get('/my-items', protect, itemController.getMyItems);
router.get('/:id', optionalAuth, itemController.getItem);
router.post('/', protect, upload.array('photos', 5), itemController.createItem);
router.put('/:id', protect, itemController.updateItem);
router.delete('/:id', protect, itemController.deleteItem);
router.post('/:id/confirm-restitution', protect, itemController.confirmRestitution);

module.exports = router;
