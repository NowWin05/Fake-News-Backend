const express = require('express');
const router = express.Router();
const News = require('../models/News');
const natural = require('natural');
const axios = require('axios');
const cheerio = require('cheerio');

// Initialize Natural NLP tools
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

// Keywords that might indicate fake news
const sensationalWords = [
    'shocking', 'amazing', 'incredible', 'unbelievable', 'miracle',
    'secret', 'conspiracy', 'they don\'t want you to know', 'breakthrough'
];

const scientificWords = [
    'study', 'research', 'evidence', 'data', 'analysis',
    'experiment', 'hypothesis', 'conclusion', 'findings'
];

// Analyze news content
const analyzeContent = async (title, content, sourceUrl) => {
    // Combine title and content for analysis
    const fullText = `${title} ${content}`.toLowerCase();
    const words = tokenizer.tokenize(fullText);
    
    // Calculate sensational language score
    const sensationalScore = words.filter(word => 
        sensationalWords.includes(word.toLowerCase())
    ).length / words.length;

    // Calculate scientific language score
    const scientificScore = words.filter(word => 
        scientificWords.includes(word.toLowerCase())
    ).length / words.length;

    // Check source URL credibility
    const sourceCredibility = checkSourceCredibility(sourceUrl);

    // Calculate overall credibility score
    let credibilityScore = 100;

    // Deduct points for sensational language
    credibilityScore -= sensationalScore * 100;

    // Add points for scientific language
    credibilityScore += scientificScore * 50;

    // Factor in source credibility
    credibilityScore = (credibilityScore + sourceCredibility) / 2;

    // Ensure score stays within 0-100 range
    credibilityScore = Math.max(0, Math.min(100, credibilityScore));

    // Calculate bias score (-1 to 1)
    const biasScore = calculateBias(fullText);

    return {
        credibilityScore,
        biasScore,
        analysis: {
            factualAccuracy: credibilityScore,
            sourceReliability: sourceCredibility,
            biasLevel: getBiasLevel(biasScore),
            verificationStatus: getVerificationStatus(credibilityScore)
        }
    };
};

// Helper function to check source credibility
const checkSourceCredibility = (sourceUrl) => {
    // List of trusted domains (example)
    const trustedDomains = [
        'reuters.com', 'apnews.com', 'bbc.com', 'npr.org',
        'nytimes.com', 'wsj.com', 'stanford.edu', 'harvard.edu'
    ];

    try {
        const url = new URL(sourceUrl);
        const domain = url.hostname.replace('www.', '');
        
        if (trustedDomains.some(trusted => domain.includes(trusted))) {
            return 90; // High credibility for trusted sources
        }

        // Check for suspicious TLDs
        if (domain.endsWith('.fake') || domain.endsWith('.temp') || 
            domain.endsWith('.info') || domain.endsWith('.xyz')) {
            return 30; // Low credibility for suspicious TLDs
        }

        return 60; // Medium credibility for unknown sources
    } catch {
        return 40; // Low credibility for invalid URLs
    }
};

// Helper function to calculate bias
const calculateBias = (text) => {
    // Simple bias detection based on keyword matching
    const leftBiasWords = ['progressive', 'liberal', 'democrat', 'socialism'];
    const rightBiasWords = ['conservative', 'republican', 'trump', 'patriot'];

    const words = text.toLowerCase().split(' ');
    let biasScore = 0;

    words.forEach(word => {
        if (leftBiasWords.includes(word)) biasScore -= 0.2;
        if (rightBiasWords.includes(word)) biasScore += 0.2;
    });

    return Math.max(-1, Math.min(1, biasScore));
};

// Helper function to get bias level
const getBiasLevel = (biasScore) => {
    if (biasScore > 0.3) return 'right';
    if (biasScore < -0.3) return 'left';
    return 'center';
};

// Helper function to get verification status
const getVerificationStatus = (credibilityScore) => {
    if (credibilityScore > 80) return 'verified';
    if (credibilityScore > 60) return 'partially_verified';
    if (credibilityScore > 40) return 'unverified';
    return 'fake';
};

// Submit news for analysis
router.post('/analyze', async (req, res) => {
    try {
        const { title, content, sourceUrl } = req.body;
        
        // Check if at least one field is provided
        if (!title && !content && !sourceUrl) {
            return res.status(400).json({ 
                message: 'Please provide at least one of: title, content, or source URL' 
            });
        }

        // If URL is provided, try to fetch content
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
                // Continue with available data if URL fetch fails
            }
        }
        
        // Perform content analysis with available data
        const analysis = await analyzeContent(
            analyzedTitle || title || '',
            analyzedContent || content || '',
            sourceUrl || ''
        );
        
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
});

// Get analysis history
router.get('/history', async (req, res) => {
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
});

module.exports = router;
