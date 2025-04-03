/**
 * News Controller
 * Handles request processing and response for news routes
 */
const News = require('../models/News');
const axios = require('axios');
const cheerio = require('cheerio');
const newsAnalyzer = require('../services/newsAnalyzer');
const sourceService = require('../services/sourceData');
const analyzer = require('../services/analyzer');

// Submit news for analysis
const analyzeNews = async (req, res) => {
    try {
        const { title, content, sourceUrl } = req.body;
        
        // Check if at least one field is provided
        if (!title && !content && !sourceUrl) {
            return res.status(400).json({ 
                message: 'Please provide at least one of: title, content, or source URL' 
            });
        }

        // Extract and process content
        const { analyzedTitle, analyzedContent, sourceDomain } = 
            await extractContentFromSource(title, content, sourceUrl);
        
        // Perform content analysis with available data
        const analysis = await newsAnalyzer.analyzeContent(
            analyzedTitle || title || '',
            analyzedContent || content || '',
            sourceUrl || ''
        );
        
        console.log('Analysis results:', {
            title: analyzedTitle || title || 'Unknown Title',
            biasScore: analysis.biasScore,
            biasLevel: analysis.analysis.biasLevel
        });
        
        // Create new news entry
        const news = new News({
            title: analyzedTitle || title || 'Unknown Title',
            content: analyzedContent || content || 'No content available',
            sourceUrl: sourceUrl || 'No source URL',
            ...analysis
        });

        // Save to database
        await news.save();
        
        // Return analysis results
        res.json(analysis);
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
    let sourceDomain = null;

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

            sourceDomain = sourceService.extractDomain(sourceUrl);
        } catch (error) {
            console.log('Error fetching URL content:', error);
            // Continue with available data if URL fetch fails
        }
    }

    return { analyzedTitle, analyzedContent, sourceDomain };
};

// Get analysis history
const getHistory = async (req, res) => {
    try {
        const history = await News.find()
            .sort({ createdAt: -1 })
            .limit(10);
        res.json(history);
    } catch (error) {
        res.status(500).json({ 
            message: 'Error fetching analysis history',
            error: error.message 
        });
    }
};

module.exports = {
    analyzeNews,
    getHistory
};
