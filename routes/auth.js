const express = require('express'); // Import express for creating routes
const router = express.Router(); // Initialize an express router
const jwt = require('jsonwebtoken'); // JSON Web Token library for secure token management
const User = require('../models/User'); // Import User model for interacting with the database

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password
        });

        await user.save();

        // Create token
        const token = jwt.sign(
            { userId: user._id }, // Payload containing user ID
            process.env.JWT_SECRET, // Secret key for signing the token
            { expiresIn: '24h' } // Token expiration time
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password); // Assuming comparePassword method exists
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { userId: user._id }, // Payload containing user ID
            process.env.JWT_SECRET, // Secret key for signing the token
            { expiresIn: '24h' } // Token expiration time
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Extract token from header
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token
        const user = await User.findById(decoded.userId).select('-password'); // Retrieve user without password

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

module.exports = router;
