const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

// Import our modularized services
const sourceService = require('../services/sourceData');
const analyzer = require('../services/analyzer');
const newsAnalyzer = require('../services/newsAnalyzer');

// Main analysis endpoint
router.post('/analyze', async (req, res) => {
  try {
    const { url, title, content } = req.body;
    let analysisText = '';
    let originalTitle = title || '';
    let sourceDomain = null;

    // Extract content from URL if provided
    if (url) {
      try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        
        
        // Try to extract title if not provided
        if (!originalTitle) {
          originalTitle = $('meta[property="og:title"]').attr('content') || 
                        $('title').text() || 
                        url;
        }
        
        // Extract content using more robust selectors
        analysisText = $('article').text() || 
                      $('main').text() || 
                      $('.content').text() || 
                      $('p').text().substring(0, 5000) || 
                      $('body').text().substring(0, 2000);
                      
        sourceDomain = sourceService.extractDomain(url);
      } catch (error) {
        console.error('Error fetching URL:', error);
      }
    }

    // Use provided content if URL extraction failed or wasn't provided
    if (!analysisText) {
      analysisText = content || originalTitle || '';
    }

    // Get source credibility data
    const sourceData = sourceService.getSourceCredibility(sourceDomain);
    
    // Generate sentiment analysis
    const sentiment = analyzer.analyzeSentiment(analysisText);
    
    // Extract key terms
    const keyTerms = analyzer.extractKeyTerms(analysisText);
    
    // Calculate language score
    const languageScore = analyzer.calculateLanguageScore(analysisText);
    
    // Calculate bias
    const biasScore = analyzer.calculateBias(analysisText);
    
    // Generate mock social media metrics based on source reputation
    const socialMetrics = sourceService.generateSocialMetrics(sourceData, originalTitle);
    
    // Calculate credibility score based on source reliability
    let credibilityScore = sourceData.reliability;
    
    // Apply structural and writing quality analysis for unknown sources
    // that haven't been identified as suspicious
    if (sourceData.reliability >= 40 && sourceData.reliability <= 70) {
      // For sources that aren't clearly identified as high or low quality,
      // analyze content structure and coherence
      const structuralScore = newsAnalyzer.analyzeStructuralElements(content || analysisText);
      const words = analyzer.tokenizer.tokenize((content || analysisText).toLowerCase());
      const coherenceScore = newsAnalyzer.analyzeTextCoherence(words, (content || analysisText).toLowerCase());
      
      console.log(`Content quality analysis: structural: ${structuralScore}, coherence: ${coherenceScore}`);
      
      // Adjust credibility score for unknown sources based on content quality
      const contentQualityScore = (structuralScore * 0.5) + (coherenceScore * 0.5);
      const contentWeight = 0.4;
      const sourceWeight = 0.6;
      
      credibilityScore = (credibilityScore * sourceWeight) + (contentQualityScore * contentWeight);
    }
    
    // For highly credible sources, keep score high
    if (sourceData.reliability >= 85) {
      credibilityScore = Math.max(credibilityScore, 85);
    }
    
    // For less credible sources, ALWAYS keep score lower than 40
    if (sourceData.reliability < 50) {
      credibilityScore = Math.min(40, credibilityScore);
    }
    
    // Round the credibility score for consistency
    credibilityScore = Math.round(credibilityScore);
    
    // Generate comprehensive analysis results
    const result = {
      // Credibility metrics
      sourceReliability: sourceData.reliability,
      credibilityScore: credibilityScore,
      languageScore: languageScore,
      contentScore: Math.min(sourceData.reliability + 10, 100),
      factScore: Math.min(sourceData.reliability + (sourceData.factChecking * 5), 100),
      
      // Verification status
      verificationStatus: analyzer.getVerificationStatus(credibilityScore),

      // Bias and sentiment
      bias: sourceData.bias,
      biasScore: biasScore,
      biasLevel: analyzer.getBiasLevel(biasScore),
      sentiment,

      // Source information
      source: sourceDomain || 'Unknown Source',
      sourceUrl: url || 'No URL provided',
      sourceAccuracy: Math.ceil(sourceData.reliability / 20),
      sourceFactChecking: sourceData.factChecking || 3,
      sourceEditorialStandards: sourceData.editorialStandards || 3,
      sourceTransparency: sourceData.transparency || 3,
      sourceKnownFor: sourceData.knownFor || ['General News Coverage'],

      // Content analysis
      keyTerms,
      title: originalTitle,
      contentSnippet: analysisText ? (analysisText.substring(0, 200) + '...') : 'No content available',

      // Social media metrics
      socialMetrics,

      // Red flags
      redFlags: sourceData.reliability < 40 ? ['Source has low credibility rating'] : [],

      // Educational resources
      educationalResources: {
        quickTips: [
          'Check the source\'s credibility',
          'Look for unusual URLs or site names',
          'Check the article\'s date and author',
          'Watch for emotional language',
          'Verify with fact-checking sites'
        ],
        guides: [
          {
            title: 'Source Evaluation',
            tips: [
              {
                title: 'Check the Domain',
                description: 'Verify if the website is legitimate and well-known'
              },
              {
                title: 'Author Credentials',
                description: 'Research the author\'s background and expertise'
              }
            ]
          },
          {
            title: 'Content Analysis',
            tips: [
              {
                title: 'Cross-Reference',
                description: 'Verify the information with other reliable sources'
              },
              {
                title: 'Check Dates',
                description: 'Ensure the content is current and relevant'
              }
            ]
          }
        ],
        recommendedResources: [
          {
            title: 'Fact-Checking Websites',
            description: 'Popular fact-checking resources',
            url: 'https://www.snopes.com'
          },
          {
            title: 'Media Bias Chart',
            description: 'Understanding news source biases',
            url: 'https://www.adfontesmedia.com'
          }
        ]
      },

      // Add more detailed content analysis information
      contentAnalysis: {
        wordCount: analysisText ? analyzer.tokenizer.tokenize(analysisText).length : 0,
        readabilityLevel: getReadabilityLevel(analysisText),
        factualIndicators: getFactualIndicators(analysisText),
        subjectivityLevel: getSubjectivityLevel(analysisText, languageScore)
      }
    };

    console.log("API response includes socialMetrics:", !!result.socialMetrics);
    
    res.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Error analyzing content' });
  }
});

// Helper function to estimate text readability
const getReadabilityLevel = (text) => {
  if (!text) return 'Unknown';
  
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  
  if (words.length === 0 || sentences.length === 0) return 'Unknown';
  
  const avgWordsPerSentence = words.length / sentences.length;
  const longWords = words.filter(word => word.length > 6).length;
  const percentLongWords = (longWords / words.length) * 100;
  
  // Simple readability estimate
  if (avgWordsPerSentence > 25 && percentLongWords > 25) {
    return 'Academic';
  } else if (avgWordsPerSentence > 20 && percentLongWords > 20) {
    return 'Professional';
  } else if (avgWordsPerSentence > 15) {
    return 'Standard';
  } else {
    return 'Casual';
  }
};

// Helper function to identify factual indicators
const getFactualIndicators = (text) => {
  if (!text) return [];
  
  const indicators = [];
  
  // Check for statistics and numbers
  const numberMatches = text.match(/\d+(\.\d+)?(\s*%)?/g) || [];
  if (numberMatches.length > 3) {
    indicators.push('Contains specific data and statistics');
  }
  
  // Check for quotes
  const quoteMatches = text.match(/["'""].*?["'""]/g) || [];
  if (quoteMatches.length > 1) {
    indicators.push('Contains direct quotes from sources');
  }
  
  // Check for specific dates
  const dateMatches = text.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/gi);
  if (dateMatches && dateMatches.length > 0) {
    indicators.push('Contains specific dates');
  }
  
  // Check for attributions
  const attributionMatches = text.match(/according to|said|reported|stated|according|source/gi);
  if (attributionMatches && attributionMatches.length > 2) {
    indicators.push('Contains source attributions');
  }
  
  return indicators;
};

// Helper function to determine subjectivity level
const getSubjectivityLevel = (text, languageScore) => {
  if (!text) return 'Unknown';
  
  // Use language score as a baseline
  if (languageScore > 70) {
    return 'Low';
  } else if (languageScore > 50) {
    return 'Moderate';
  } else {
    return 'High';
  }
};

// Test endpoint for social media metrics
router.get('/test-social-metrics', (req, res) => {
  const testSourceData = {
    reliability: 75,
    bias: -10,
    factChecking: 4,
    editorialStandards: 4,
    transparency: 4
  };
  
  const testTitle = "Sample News Article for Testing Social Metrics";
  
  const metrics = sourceService.generateSocialMetrics(testSourceData, testTitle);
  
  res.json({
    title: testTitle,
    sourceData: testSourceData,
    socialMetrics: metrics
  });
});

module.exports = router;
