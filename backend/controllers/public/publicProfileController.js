// backend/controllers/publicProfileController.js
const User = require('../models/User');
const axios = require('axios');

// Helper to call the Minecraft plugin, simplified for public data
const callMinecraftPlugin = async (endpoint, payload) => {
    try {
        const pluginUrl = `http://localhost:${process.env.PLUGIN_PORT || 4567}${endpoint}`;
        const pluginSecret = process.env.WEBHOOK_SECRET;

        if (!pluginSecret) {
            throw new Error('Server configuration error.');
        }
        
        const response = await axios.post(pluginUrl, payload, {
            headers: { 'Authorization': `Bearer ${pluginSecret}`, 'Content-Type': 'application/json' },
            timeout: 10000
        });
        return response.data;
    } catch (error) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Failed to communicate with the game server.';
        throw Object.assign(new Error(message), { status });
    }
};

/**
 * @desc    Search for users by username
 * @route   GET /api/v1/public-profiles/search/:username
 * @access  Public
 */
exports.searchUsers = async (req, res) => {
    try {
        const username = req.params.username;
        if (!username || username.length < 3) {
            return res.status(400).json({ success: false, message: 'Please provide a search term of at least 3 characters.' });
        }
        
        // This is a simple implementation. For a large user base, you'd want a more optimized search (e.g., using a dedicated search service like Elasticsearch).
        const user = await User.findByUsername(username);

        if (user && user.profile_is_public) {
            // Return a simplified user object for the search results
            res.status(200).json({ success: true, users: [{ id: user.id, username: user.username }] });
        } else {
            res.status(200).json({ success: true, users: [] });
        }

    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ success: false, message: 'Server error during user search.' });
    }
};


/**
 * @desc    Get a public character profile by username
 * @route   GET /api/v1/public-profiles/:username
 * @access  Public
 */
exports.getPublicProfile = async (req, res) => {
    try {
        const user = await User.findByUsername(req.params.username);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (!user.profile_is_public) {
            return res.status(403).json({ success: false, message: 'This user\'s profile is private.' });
        }

        if (!user.minecraft_uuid) {
            return res.status(200).json({
                success: true,
                data: {
                    username: user.username,
                    playerStats: null,
                    minecraft_uuid: null
                }
            });
        }
        
        let statsResponse = null;
        let statsError = null;
        try {
            statsResponse = await callMinecraftPlugin('/player-stats', { uuid: user.minecraft_uuid });
            if (!statsResponse.success) {
                statsError = statsResponse.message || 'Failed to retrieve player stats.';
            }
        } catch (e) {
            statsError = e.message;
        }

        res.status(200).json({
            success: true,
            data: {
                username: user.username,
                minecraft_uuid: user.minecraft_uuid,
                playerStats: statsResponse?.stats || null
            },
            error: statsError
        });

    } catch (error) {
        console.error('Error fetching public profile:', error);
        res.status(error.status || 500).json({ success: false, message: error.message || 'Server error fetching profile data.' });
    }
};
