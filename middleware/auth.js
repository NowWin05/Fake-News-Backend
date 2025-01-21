const jwt = require('jsonwebtoken'); // Importing the jsonwebtoken library for handling JWT

// Middleware function for authentication
const auth = async (req, res, next) => {
    try {
        // Extract the token from the Authorization header
        const token = req.headers.authorization?.split(' ')[1];
        
        // If no token is provided, return a 401 Unauthorized response
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Verify the token using the secret stored in environment variable
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach the userId from the decoded token to the request object
        req.userId = decoded.userId;

        // Call the next middleware or route handler
        next();
    } catch (error) {
        // If the token is invalid, return a 401 Unauthorized response
        res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = auth; // Exporting the auth middleware for use in other routes
