/**
 * News Analyzer Service
 * Specialized news analysis functions that integrate multiple services
 */
const analyzer = require('./analyzer');
const sourceService = require('./sourceData');

const {fakePhrases}=require('./../data');
const axios = require('axios'); // Add axios for making HTTP requests to the ML model

// Additional imports for improved text analysis
const natural = require('natural');
const TfIdf = natural.TfIdf;

// Analyze news content
const analyzeContent = async (title, content, sourceUrl) => {
    // Combine title and content for analysis
    const fullText = `${title} ${content}`.toLowerCase();
    const words = analyzer.tokenizer.tokenize(fullText);
    
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
    
    // Calculate sensational language score
    const sensationalWordsFound = words.filter(word => 
        analyzer.sensationalWords.some(sensational => {
            const sensTerms = sensational.toLowerCase().split(' ');
            return sensTerms.some(term => word.includes(term));
        })
    );
    
    const sensationalScore = sensationalWordsFound.length / words.length;
    // console.log(`Sensational words found: ${sensationalWordsFound.length}, words: ${sensationalWordsFound.join(', ')}`);

    // Calculate scientific language score
    const scientificWordsFound = words.filter(word => 
        analyzer.scientificWords.some(scientific => {
            const sciTerms = scientific.toLowerCase().split(' ');
            return sciTerms.some(term => word.includes(term));
        })
    );
    
    const scientificScore = scientificWordsFound.length / words.length;
    // console.log(`Scientific words found: ${scientificWordsFound.length}, words: ${scientificWordsFound.join(', ')}`);

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
        // console.log(`Fake phrases found: ${fakePhrasesList.join(', ')}`);
    }
    
    // Calculate fake phrases score (0-1)
    const fakePhraseScore = Math.min(1, fakePhrasesCount / 3);
    
    // NEW: Analyze structural elements that indicate quality journalism
    const structuralScore = analyzeStructuralElements(content);
    // console.log(`Structural quality score: ${structuralScore}`);
    
    // NEW: Content coherence analysis
    const coherenceScore = analyzeTextCoherence(words, fullText);
    // console.log(`Content coherence score: ${coherenceScore}`);
    
    // Check source URL credibility
    const sourceCredibility = await checkSourceCredibility(sourceUrl);
    const isHighlyCredibleSource = sourceCredibility >= 85;

    // Initialize red flags array
    const redFlags = [];
    
    // NEW: Use ML-powered credibility score calculation when possible
    let credibilityScore;
   
        // console.error('Error using ML for credibility score, falling back to rule-based:', error);
        // Fall back to the traditional scoring method
        credibilityScore = calculateCredibilityScore(
            sensationalScore, fakePhraseScore, scientificScore,
            sourceCredibility, isHighlyCredibleSource, words.length, content,
            structuralScore, coherenceScore,
            redFlags
        );
    
    
    // NEW: Use ML-based sentiment analysis when possible
    let sentiment;
    
        // console.error('Error using ML for sentiment analysis, falling back to rule-based:', error);
        // Fall back to the traditional sentiment analysis
        sentiment = analyzer.analyzeSentiment(fullText);
    

    // NEW: Use ML-based bias detection when possible
    let biasResult;
    
        // console.error('Error using ML for bias detection, falling back to rule-based:', error);
        // Fall back to the traditional bias calculation
        const biasScore = analyzer.calculateBias(fullText);
        biasResult = {
            biasScore,
            biasLevel: analyzer.getBiasLevel(biasScore)
        };
    
    
    // Log analysis details for debugging
    // console.log('Content analysis details:',
    //      {
    //     contentLength: words.length,
    //     sensationalScore,
    //     scientificScore,
    //     languageScore,
    //     structuralScore,
    //     coherenceScore,
    //     sourceCredibility,
    //     isHighlyCredibleSource,
    //     finalCredibilityScore: credibilityScore,
    //     redFlags
    // });

    return {
        credibilityScore,
        biasScore: biasResult.biasScore,
        languageScore,
        analysis: {
            factualAccuracy: credibilityScore,
            sourceReliability: sourceCredibility,
            languageScore,
            biasLevel: biasResult.biasLevel,
            verificationStatus: analyzer.getVerificationStatus(credibilityScore),
            redFlags: redFlags.length > 0 ? redFlags : ['none detected'],
            sentiment,
            contentStructure: structuralScore,
            contentCoherence: coherenceScore,
            mlConfidence: biasResult.confidence || 70
        }
    };
};

// NEW: Analyze structural elements of content that indicate quality journalism
const analyzeStructuralElements = (content) => {
    if (!content) return 0;
    
    let score = 50; // Start with neutral score
    
    // Check for paragraph structure (legitimate news typically has proper paragraphs)
    const paragraphs = content.split(/\n\s*\n|\r\n\s*\r\n/);
    if (paragraphs.length >= 3) {
        score += 5;
    }
    
    // Check for quotes (legitimate reporting often includes quotes)
    const quoteMatches = content.match(/["'""].*?["'""]/g) || [];
    score += Math.min(15, quoteMatches.length * 3);
    
    // Check for numbers and statistics (factual reporting often includes specific figures)
    const numberMatches = content.match(/\d+(\.\d+)?(\s*%)?/g) || [];
    score += Math.min(10, numberMatches.length * 2);
    
    // Check for attribution phrases ("according to", "said", etc.)
    const attributionPhrases = [
        "according to", "said", "reported", "stated", "announced", "confirmed",
        "explained", "noted", "added", "commented", "revealed"
    ];
    
    let attributionCount = 0;
    attributionPhrases.forEach(phrase => {
        const regex = new RegExp(phrase, 'gi');
        const matches = content.match(regex) || [];
        attributionCount += matches.length;
    });
    
    score += Math.min(15, attributionCount * 3);
    
    // Check for dates and temporal references (suggests timely reporting)
    const datePatterns = [
        /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,  // MM/DD/YYYY
        /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,    // MM-DD-YYYY
        /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/gi, // Month DD, YYYY
        /\btoday\b|\byesterday\b|\blast week\b|\blast month\b|\blast year\b|\brecently\b|\bearlier\b|\blast\s+(?:week|month|year)\b/gi // Temporal references
    ];
    
    let dateCount = 0;
    datePatterns.forEach(pattern => {
        const matches = content.match(pattern) || [];
        dateCount += matches.length;
    });
    
    score += Math.min(10, dateCount * 2);
    
    return Math.min(100, score);
};

// NEW: Analyze text coherence
const analyzeTextCoherence = (words, fullText) => {
    // Check for sentence structure and readability
    const sentences = fullText.split(/[.!?]+/);
    if (sentences.length < 2) return 50; // Default score for very short content
    
    // Calculate average sentence length (too short or too long sentences are suspicious)
    const avgSentenceLength = words.length / sentences.length;
    let sentenceLengthScore = 70;
    
    if (avgSentenceLength < 5) {
        sentenceLengthScore = 40; // Too short sentences
    } else if (avgSentenceLength > 35) {
        sentenceLengthScore = 40; // Too long sentences
    } else if (avgSentenceLength > 12 && avgSentenceLength < 25) {
        sentenceLengthScore = 90; // Ideal length for formal writing
    }
    
    // Calculate sentence variety (more variance suggests more natural writing)
    const sentenceLengths = sentences.map(s => analyzer.tokenizer.tokenize(s).length);
    const sentenceLengthVariance = calculateVariance(sentenceLengths);
    const sentenceVarietyScore = Math.min(100, Math.max(0, 
        50 + (sentenceLengthVariance * 10)
    ));
    
    // Calculate word variety using type-token ratio
    const uniqueWords = new Set(words);
    const typeTokenRatio = uniqueWords.size / words.length;
    const wordVarietyScore = Math.min(100, Math.max(0,
        typeTokenRatio * 150
    ));
    
    // Calculate final coherence score as weighted average
    return Math.round(
        (sentenceLengthScore * 0.3) + 
        (sentenceVarietyScore * 0.3) + 
        (wordVarietyScore * 0.4)
    );
};

// Helper function to calculate variance
const calculateVariance = (arr) => {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
    const squareDiffs = arr.map(val => Math.pow(val - mean, 2));
    return squareDiffs.reduce((sum, val) => sum + val, 0) / arr.length;
};

// Calculate credibility score based on various factors
const calculateCredibilityScore = (
    sensationalScore, fakePhraseScore, scientificScore, 
    sourceCredibility, isHighlyCredibleSource, textLength, content,
    structuralScore, coherenceScore, // New parameters
    redFlags
) => {
    // Start with a more balanced base score that considers content structure and coherence
    let credibilityScore = 50;
    
    // Factor in source credibility but with less weight for unknown sources
    if (sourceCredibility > 70) {
        // Highly credible sources still get good weight
        credibilityScore = (credibilityScore * 0.4) + (sourceCredibility * 0.6);
    } else if (sourceCredibility < 30) {
        // Known low-credibility sources get full penalty
        credibilityScore = (credibilityScore * 0.7) + (sourceCredibility * 0.3);
    } else {
        // Unknown or mid-tier sources - put more weight on content itself
        credibilityScore = (credibilityScore * 0.7) + (sourceCredibility * 0.3);
    }
    
    // Apply penalties and bonuses
    
    // Significant penalty for sensational language
    const sensationalPenalty = sensationalScore * 120; // Reduced from 150
    credibilityScore -= sensationalPenalty;
    if (sensationalScore > 0.04) { // Increased threshold from 0.03
        redFlags.push('high use of sensational language');
    }
    
    // Heavy penalty for fake phrases
    const fakePhrasePenalty = fakePhraseScore * 200;
    credibilityScore -= fakePhrasePenalty;
    if (fakePhraseScore > 0) {
        redFlags.push(`contains suspicious phrases commonly found in fake news`);
    }
    
    // Bonus for scientific language
    credibilityScore += scientificScore * 80; // Reduced from 100
    
    // NEW: Apply bonuses for good structure and coherence
    credibilityScore += (structuralScore - 50) * 0.4; // structural score - 50 (neutral point)
    credibilityScore += (coherenceScore - 50) * 0.4; // coherence score - 50 (neutral point)
    
    // For highly credible sources, maintain a minimum score
    if (isHighlyCredibleSource && credibilityScore < 70) {
        credibilityScore = Math.max(70, credibilityScore);
    }
    
    // For non-credible sources, enforce maximum score of 40
    if (!isHighlyCredibleSource && sourceCredibility < 30) {
        credibilityScore = Math.min(40, credibilityScore);
    }
    
    // Additional checks
    
    // Text length check - very short content is suspicious
    if (textLength < 20) {
        credibilityScore -= 20;
        redFlags.push('content is suspiciously short');
    }

    // Check for excessive capitalization
    const capitalizedCount = (content.match(/[A-Z]{2,}/g) || []).length;
    if (capitalizedCount > 3) {
        credibilityScore -= Math.min(15, capitalizedCount * 2); // Reduced from 3x penalty
        redFlags.push('excessive capitalization');
    }
    
    // Ensure score stays within 0-100 range
    return Math.max(0, Math.min(100, credibilityScore));
};

// Helper function to check source credibility
const checkSourceCredibility = async (sourceUrl) => {
    if (!sourceUrl || sourceUrl === 'No source URL') {
        return 50; // Changed from 40 to more neutral default
    }

    try {
        const url = new URL(sourceUrl);
        const domain = url.hostname.replace('www.', '');
        
        // Get source reputation data
        const sourceData = sourceService.getSourceCredibility(domain);
        
        // Check if it's a mainstream news domain without specific reputation data
        if (sourceData.reliability === 50 && isMainstreamNewsDomain(domain)) {
            return 65; // Give slightly higher score to mainstream news domains not in our database
        }
        
        return sourceData.reliability;
    } catch {
        return 40; // Lower credibility for invalid URLs
    }
};

// NEW: Helper function to identify mainstream news domains not in our database
const isMainstreamNewsDomain = (domain) => {
    // Check if the domain contains common news-related terms
    const newsDomainKeywords = ['news', 'post', 'herald', 'tribune', 'times', 'daily', 'journal', 'gazette'];
    const isDomainLikelyNews = newsDomainKeywords.some(keyword => domain.includes(keyword));
    
    // Check if the domain ends with common news TLDs
    const isNewsTLD = domain.endsWith('.com') || domain.endsWith('.org') || domain.endsWith('.net');
    
    return isDomainLikelyNews && isNewsTLD;
};

// Call ML model for fake/true classification and sentiment analysis
const analyzeWithMLModel = async (url,title,content) => {
    try {
        console.log('Calling ML model with:', { url }); // Log the input
        const response = await axios.post('http://127.0.0.1:5000/analyze', {
            url,
            title,
            content
        });
        console.log('ML model response:', response.data); // Log the ML model's output
        return response.data; // Return the ML model's output
    } catch (error) {
        console.error('Error calling ML model:', error.message);
        throw new Error('Failed to analyze with ML model');
    }
};
const fakeNews = async (url,title,content) => {
    try {
        console.log('Calling ML model with:', { url }); // Log the input
        const response = await axios.post('http://127.0.0.1:5001/detect_fake_news', {
            url,
            title,
            content
        });
        console.log('ML model response:', response.data);
        return response.data; // Return the ML model's output
    } catch (error) {
        console.error('Error calling ML model:', error.message);
        throw new Error('Failed to analyze with ML model');
    }
};

module.exports = {
    analyzeContent,
    analyzeWithMLModel, // Export the new function
    fakePhrases,
    fakeNews,
    // Export new functions for testing
    analyzeStructuralElements,
    analyzeTextCoherence,
    calculateVariance
};
