const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');

// Submit news for analysis
router.post('/analyze', newsController.analyzeNews);

// Get analysis history
router.get('/history', newsController.getHistory);

module.exports = router;
