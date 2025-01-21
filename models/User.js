const mongoose = require('mongoose'); // Import mongoose for schema definition
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing

// Define user schema
const userSchema = new mongoose.Schema({
    username: {
        type: String,             // Username field
        required: true,           // This field is required
        unique: true,             // Ensures unique usernames
        trim: true                // Removes whitespace from both ends
    },
    email: {
        type: String,             // Email field
        required: true,           // This field is required
        unique: true,             // Ensures unique emails
        trim: true,               // Removes whitespace from both ends
        lowercase: true           // Converts email to lowercase
    },
    password: {
        type: String,             // Password field
        required: true            // This field is required
    },
    createdAt: {
        type: Date,               // Creation timestamp
        default: Date.now         // Defaults to current date and time
    }
});

// Middleware to hash password before saving user document
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next(); // If password is not modified, skip hashing

    try {
        const salt = await bcrypt.genSalt(10); // Generate a salt
        this.password = await bcrypt.hash(this.password, salt); // Hash the password with salt
        next(); // Proceed to save the document
    } catch (error) {
        next(error); // Pass error to next middleware in case of failure
    }
});

// Method to compare input password with hashed password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password); // Compare input password with stored hash
};

module.exports = mongoose.model('User', userSchema); // Export the User model
