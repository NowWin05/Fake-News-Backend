const mongoose = require('mongoose'); // Import mongoose for schema definition

// Define news schema
const newsSchema = new mongoose.Schema({
    title: {
        type: String,             // Title of the news article
        required: true            // This field is required
    },
    content: {
        type: String,             // Content of the news article
        required: true            // This field is required
    },
    sourceUrl: {
        type: String,             // URL of the source where the news is published
        required: true            // This field is required
    },
    credibilityScore: {
        type: Number,             // Credibility score of the news article
        required: true            // This field is required
    },
    biasScore: {
        type: Number,             // Bias score of the news article
        required: true            // This field is required
    },
    analysis: {
        factualAccuracy: Number,       // Factual accuracy score
        sourceReliability: Number,     // Reliability of the source
        biasLevel: {                    // Level of bias (left, center, right)
            type: String,
            enum: ['left', 'center', 'right'] // Allowed values: 'left', 'center', 'right'
        },
        verificationStatus: {           // Verification status
            type: String,
            enum: ['verified', 'partially_verified', 'unverified', 'fake'] // Allowed values: 'verified', 'partially_verified', 'unverified', 'fake'
        }
    },
    createdAt: {
        type: Date,               // Date and time when the news was created
        default: Date.now         // Defaults to the current date and time
    }
});

module.exports = mongoose.model('News', newsSchema); // Export the News model
