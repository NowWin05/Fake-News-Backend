/**
 * News Controller
 * Handles request processing and response for news routes
 */
require('dotenv').config(); // at top of file

const News = require('../models/News');
const axios = require('axios');
const cheerio = require('cheerio');
const { analyzeWithMLModel } = require('../services/newsAnalyzer'); // Import the new function


// Submit news for analysis
const analyzeNews = async (req, res) => {
    try {
        console.log('Incoming request body:', req.body); // Log the request body
        let { title, content, sourceUrl } = req.body;

        // If title and content are missing, extract them from the source URL
        if (!title && !content && sourceUrl) {
            console.log('Extracting title and content from source URL:', sourceUrl);
            const response = await axios.get(sourceUrl);
            const $ = cheerio.load(response.data);

            title = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Unknown Title';
            content = $('meta[property="og:description"]').attr('content') ||
                      $('meta[name="description"]').attr('content') ||
                      $('article').text() ||
                      $('p').text() ||
                      'No content available';
        }

        // Validate that at least one field is now available
        if (!title && !content && !sourceUrl) {
            return res.status(400).json({
                message: 'Please provide at least one of: title, content, or source URL'
            });
        }

        // Call the ML model for analysis
        const mlModelOutput = await analyzeWithMLModel(title, content, sourceUrl);

        // Save the analysis result in the database
        const news = new News({
            title: title || 'Unknown Title',
            content: content || 'No content available',
            sourceUrl: sourceUrl || 'No source URL',
            analysis: mlModelOutput
        });

        await news.save();

        // Return the ML model analysis as the API response
        res.json({ analysis: mlModelOutput });
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            message: 'Error analyzing news content',
            error: error.message
        });
    }
};

// Helper function to extract content from source URL
const extractContentFromSource = async (title, content, sourceUrl) => {
    let analyzedContent = content;
    let analyzedTitle = title;

    if (sourceUrl && (!content || !title)) {
        try {
            const response = await axios.get(sourceUrl);
            const $ = cheerio.load(response.data);

            if (!title) {
                analyzedTitle = $('meta[property="og:title"]').attr('content') ||
                    $('title').text() ||
                    sourceUrl;
            }

            if (!content) {
                analyzedContent = $('meta[property="og:description"]').attr('content') ||
                    $('meta[name="description"]').attr('content') ||
                    $('article').text() ||
                    $('p').text();
            }
        } catch (error) {
            console.log('Error fetching URL content:', error);
        }
    }

    return { analyzedTitle, analyzedContent };
};

module.exports = {
    analyzeNews // Export only analyzeNews if getHistory is not defined
};
