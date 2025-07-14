// backend/routes/publicProfileRoutes.js
const express = require('express');
const router = express.Router();
const { searchUsers, getPublicProfile } = require('../controllers/publicProfileController');

// @route   GET /api/v1/public-profiles/search/:username
// @desc    Search for users by username
// @access  Public
router.get('/search/:username', searchUsers);

// @route   GET /api/v1/public-profiles/:username
// @desc    Get a user's public profile
// @access  Public
router.get('/:username', getPublicProfile);

module.exports = router;
