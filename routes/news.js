const express = require('express');
const router = express.Router();
const News = require('../models/News');
const natural = require('natural');
const axios = require('axios');
const cheerio = require('cheerio');

// Initialize Natural NLP tools
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

// Keywords that might indicate fake news - expanded list
const sensationalWords = [
    'shocking', 'amazing', 'incredible', 'unbelievable', 'miracle',
    'secret', 'conspiracy', 'they don\'t want you to know', 'breakthrough',
    'bombshell', 'stunning', 'jaw-dropping', 'mind-blowing', 'explosive',
    'censored', 'banned', 'what the media won\'t tell you', 'coverup',
    'hidden', 'anonymous sources', 'controversial', 'you won\'t believe',
    'according to sources', 'underground', 'establishment', 'globalist'
];

const scientificWords = [
    'study', 'research', 'evidence', 'data', 'analysis',
    'experiment', 'hypothesis', 'conclusion', 'findings', 'peer-reviewed',
    'controlled', 'methodology', 'statistical', 'journal', 'publication',
    'sample size', 'meta-analysis', 'correlation', 'causation', 'significant'
];

// List of phrases that often appear in fake news
const fakePhrases = [
    'they don\'t want you to know',
    'what the media isn\'t telling you',
    'doctors hate this',
    'the truth about',
    'what they\'re hiding',
    'what the government doesn\'t want you to know',
    'big pharma doesn\'t want you to know',
    'share before it\'s deleted',
    'the mainstream media won\'t report this'
];

// Analyze news content
const analyzeContent = async (title, content, sourceUrl) => {
    // Combine title and content for analysis
    const fullText = `${title} ${content}`.toLowerCase();
    const words = tokenizer.tokenize(fullText);
    
    if (words.length === 0) {
        return {
            credibilityScore: 50,
            biasScore: 0,
            languageScore: 50,
            analysis: {
                factualAccuracy: 50,
                sourceReliability: 50,
                languageScore: 50,
                biasLevel: 'center',
                verificationStatus: 'unverified',
                redFlags: ['insufficient content for analysis'],
                sentiment: { positive: 0, negative: 0, neutral: 100 }
            }
        };
    }
    
    // Calculate sensational language score - improved detection
    const sensationalWordsFound = words.filter(word => 
        sensationalWords.some(sensational => {
            const sensTerms = sensational.toLowerCase().split(' ');
            return sensTerms.some(term => word.includes(term));
        })
    );
    
    const sensationalScore = sensationalWordsFound.length / words.length;
    console.log(`Sensational words found: ${sensationalWordsFound.length}, words: ${sensationalWordsFound.join(', ')}`);

    // Calculate scientific language score - improved detection
    const scientificWordsFound = words.filter(word => 
        scientificWords.some(scientific => {
            const sciTerms = scientific.toLowerCase().split(' ');
            return sciTerms.some(term => word.includes(term));
        })
    );
    
    const scientificScore = scientificWordsFound.length / words.length;
    console.log(`Scientific words found: ${scientificWordsFound.length}, words: ${scientificWordsFound.join(', ')}`);

    // Calculate language score (0-100) based on sensational vs scientific language
    const languageScore = Math.max(0, Math.min(100, 50 - (sensationalScore * 200) + (scientificScore * 200)));
    
    // Check for fake news phrases
    let fakePhrasesCount = 0;
    let fakePhrasesList = [];
    fakePhrases.forEach(phrase => {
        if (fullText.includes(phrase)) {
            fakePhrasesCount++;
            fakePhrasesList.push(phrase);
        }
    });
    if (fakePhrasesCount > 0) {
        console.log(`Fake phrases found: ${fakePhrasesList.join(', ')}`);
    }
    
    // Calculate fake phrases score (0-1)
    const fakePhraseScore = Math.min(1, fakePhrasesCount / 3);
    
    // Check source URL credibility
    const sourceCredibility = checkSourceCredibility(sourceUrl);
    const isHighlyCredibleSource = sourceCredibility >= 85;

    // Initialize red flags array
    const redFlags = [];
    
    // Calculate overall credibility score with a stricter algorithm
    // Start based on source credibility to give it more weight
    let credibilityScore = isHighlyCredibleSource ? 80 : 40;
    
    // Apply penalties and bonuses
    
    // Significant penalty for sensational language
    const sensationalPenalty = sensationalScore * 150;
    credibilityScore -= sensationalPenalty;
    if (sensationalScore > 0.03) {
        redFlags.push('high use of sensational language');
    }
    
    // Heavy penalty for fake phrases
    const fakePhrasePenalty = fakePhraseScore * 200;
    credibilityScore -= fakePhrasePenalty;
    if (fakePhraseScore > 0) {
        redFlags.push(`contains suspicious phrases: ${fakePhrasesList.join(', ')}`);
    }
    
    // Bonus for scientific language
    credibilityScore += scientificScore * 100;
    
    // Factor in source credibility (weighted heavily)
    credibilityScore = (credibilityScore * 0.4) + (sourceCredibility * 0.6);
    
    // For highly credible sources, maintain a minimum score
    if (isHighlyCredibleSource && credibilityScore < 70) {
        credibilityScore = Math.max(70, credibilityScore);
    }
    
    // For non-credible sources, enforce maximum score of 40
    if (!isHighlyCredibleSource && sourceCredibility < 50) {
        credibilityScore = Math.min(40, credibilityScore);
    }
    
    // Additional checks
    
    // Text length check - very short content is suspicious
    if (words.length < 20) {
        credibilityScore -= 20;
        redFlags.push('content is suspiciously short');
    }

    // Check for excessive capitalization
    const capitalizedCount = (content.match(/[A-Z]{2,}/g) || []).length;
    if (capitalizedCount > 3) {
        credibilityScore -= Math.min(20, capitalizedCount * 3);
        redFlags.push('excessive capitalization');
    }
    
    // Ensure score stays within 0-100 range
    credibilityScore = Math.max(0, Math.min(100, credibilityScore));
    
    // Improved sentiment analysis
    const sentiment = analyzeSentiment(fullText);

    // Calculate bias score (-1 to 1)
    const biasScore = calculateBias(fullText);
    
    // Log analysis details for debugging
    console.log('Content analysis details:', {
        contentLength: words.length,
        sensationalScore,
        sensationalPenalty,
        scientificScore,
        languageScore,
        fakePhrasesCount,
        fakePhrasePenalty,
        sourceCredibility,
        isHighlyCredibleSource,
        finalCredibilityScore: credibilityScore,
        sentiment,
        redFlags
    });

    return {
        credibilityScore,
        biasScore,
        languageScore,
        analysis: {
            factualAccuracy: credibilityScore,
            sourceReliability: sourceCredibility,
            languageScore,
            biasLevel: getBiasLevel(biasScore),
            verificationStatus: getVerificationStatus(credibilityScore),
            redFlags: redFlags.length > 0 ? redFlags : ['none detected'],
            sentiment
        }
    };
};

// Helper function to check source credibility - making it stricter
const checkSourceCredibility = (sourceUrl) => {
    if (!sourceUrl || sourceUrl === 'No source URL') {
        return 40; // No URL provided is suspicious
    }

    // Expanded list of highly trusted domains
    const highlyTrustedDomains = [
        'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'npr.org',
        'nytimes.com', 'wsj.com', 'washingtonpost.com', 'economist.com',
        'nature.com', 'science.org', 'scientificamerican.com',
        'pnas.org', 'who.int', 'cdc.gov', 'nih.gov', 'nejm.org'
    ];
    
    // Academic and government domains
    const academicDomains = [
        'edu', 'gov', 'org'
    ];
    
    // List of known fake news or low-quality domains
    const untrustedDomains = [
        'theonion.com', 'clickhole.com', 'infowars.com', 'breitbart.com',
        'naturalnews.com', 'dailybuzzlive.com', 'worldnewsdailyreport.com',
        'empirenews.net', 'huzlers.com', 'newswatch33.com', 'now8news.com',
        'thebeaverton.com', 'thedcgazette.com', 'thevalleyreport.com',
        'nationalreport.net', 'realnewsrightnow.com', 'satirewire.com',
        'babylonbee.com', 'duffelblog.com'
    ];

    try {
        const url = new URL(sourceUrl);
        const domain = url.hostname.replace('www.', '');
        
        // Check for non-credible domains first - these should always get low scores
        if (untrustedDomains.some(fake => domain.includes(fake))) {
            console.log(`Non-credible domain detected: ${domain}`);
            return 20; // Very low credibility for known fake/satire sites
        }
        
        // Give high scores to highly trusted domains
        if (highlyTrustedDomains.some(trusted => domain.includes(trusted))) {
            return 90; // Very high credibility
        }
        
        // Check for academic or government domains
        for (const academicDomain of academicDomains) {
            if (domain.endsWith(`.${academicDomain}`)) {
                return 85; // High credibility for academic/government
            }
        }
        
        // Very low scores for known fake news sites
        if (untrustedDomains.some(untrusted => domain.includes(untrusted))) {
            return 10; // Very low credibility
        }

        // Check for suspicious TLDs
        if (domain.endsWith('.fake') || domain.endsWith('.temp') || 
            domain.endsWith('.info') || domain.endsWith('.xyz') ||
            domain.endsWith('.click') || domain.endsWith('.top') ||
            domain.endsWith('.buzz') || domain.endsWith('.gq') ||
            domain.endsWith('.ml') || domain.endsWith('.ga') ||
            domain.endsWith('.cf')) {
            return 20; // Very low credibility for suspicious TLDs
        }

        // Check domain age (approximate approach)
        const domainParts = domain.split('.');
        if (domainParts.length > 0) {
            // Very long domain names are often suspicious
            if (domainParts[0].length > 20) {
                return 30;
            }
            // Domains with numbers are sometimes suspicious
            if (/\d/.test(domainParts[0])) {
                return 40;
            }
        }
        
        // For .com domains, give slightly above neutral
        if (domain.endsWith('.com')) {
            return 55;
        }
        
        return 50; // Medium credibility for unknown sources
    } catch {
        return 30; // Lower credibility for invalid URLs
    }
};

// Improved sentiment analysis function
const analyzeSentiment = (text) => {
    // Define sentiment word lists
    const positiveWords = [
        'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
        'positive', 'beneficial', 'success', 'successful', 'well', 'best',
        'better', 'impressive', 'remarkable', 'outstanding', 'superior',
        'peaceful', 'happy', 'joy', 'confident', 'reliable', 'trustworthy'
    ];
    
    const negativeWords = [
        'bad', 'terrible', 'awful', 'horrible', 'poor', 'negative',
        'worst', 'failure', 'failed', 'inadequate', 'inferior', 'wrong',
        'mistake', 'problematic', 'dangerous', 'threat', 'crisis', 'disaster',
        'catastrophe', 'tragic', 'sad', 'angry', 'hostile', 'violent'
    ];
    
    // Tokenize and count sentiment words
    const words = tokenizer.tokenize(text.toLowerCase());
    let positive = 0;
    let negative = 0;
    
    words.forEach(word => {
        if (positiveWords.some(pos => word.includes(pos))) positive++;
        if (negativeWords.some(neg => word.includes(neg))) negative++;
    });
    
    const total = words.length;
    const positiveScore = total > 0 ? Math.round((positive / total) * 100) : 0;
    const negativeScore = total > 0 ? Math.round((negative / total) * 100) : 0;
    const neutralScore = 100 - positiveScore - negativeScore;
    
    return {
        positive: positiveScore,
        negative: negativeScore,
        neutral: Math.max(0, neutralScore), // Ensure neutral is not negative
        tone: positiveScore > negativeScore ? 'positive' : 
              negativeScore > positiveScore ? 'negative' : 'neutral'
    };
};

// Helper function to calculate bias
const calculateBias = (text) => {
    // Expanded bias detection with more comprehensive keyword lists
    const leftBiasWords = [
        'progressive', 'liberal', 'democrat', 'socialism', 'leftist', 
        'welfare', 'equality', 'regulation', 'green', 'labor', 
        'diversity', 'inclusive', 'biden', 'harris', 'immigration'
    ];
    
    const rightBiasWords = [
        'conservative', 'republican', 'trump', 'patriot', 'freedom', 
        'tradition', 'military', 'tax cut', 'border', 'business', 
        'religious', 'america first', 'nationalist', 'fiscal', 'second amendment'
    ];

    // Use the same tokenizer for consistency
    const words = tokenizer.tokenize(text.toLowerCase());
    
    // Count occurrences of bias words
    let leftCount = 0;
    let rightCount = 0;
    
    words.forEach(word => {
        // Check if any left-bias word contains this word or vice versa
        if (leftBiasWords.some(biasWord => 
            word.includes(biasWord) || biasWord.includes(word))) {
            leftCount++;
        }
        
        // Check if any right-bias word contains this word or vice versa
        if (rightBiasWords.some(biasWord => 
            word.includes(biasWord) || biasWord.includes(word))) {
            rightCount++;
        }
    });
    
    // Calculate normalized bias score between -1 and 1
    let biasScore = 0;
    const totalBiasWords = leftCount + rightCount;
    
    if (totalBiasWords > 0) {
        biasScore = (rightCount - leftCount) / totalBiasWords;
    }
    
    console.log(`Bias analysis: Left words: ${leftCount}, Right words: ${rightCount}, Score: ${biasScore}`);
    
    return biasScore;
};

// Helper function to get bias level - make thresholds smaller to be more sensitive
const getBiasLevel = (biasScore) => {
    if (biasScore > 0.2) return 'right';
    if (biasScore < -0.2) return 'left';
    return 'center';
};

// Helper function to get verification status - stricter thresholds
const getVerificationStatus = (credibilityScore) => {
    if (credibilityScore > 85) return 'verified';
    if (credibilityScore > 70) return 'partially_verified';
    if (credibilityScore > 45) return 'unverified';
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
