const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const natural = require('natural');

// Initialize NLP tools
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf; // Fix: Don't call as function, just reference the class
const tfidf = new TfIdf(); // Create a new instance correctly with 'new'

// Expanded and more accurate source data
const sourceReputationData = {
  // Highly trusted sources
  'reuters.com': { reliability: 95, bias: -2, factChecking: 5, editorialStandards: 5, transparency: 5 },
  'apnews.com': { reliability: 94, bias: 0, factChecking: 5, editorialStandards: 5, transparency: 5 },
  'bbc.com': { reliability: 92, bias: -5, factChecking: 5, editorialStandards: 5, transparency: 4 },
  'bbc.co.uk': { reliability: 92, bias: -5, factChecking: 5, editorialStandards: 5, transparency: 4 },
  'npr.org': { reliability: 90, bias: -8, factChecking: 5, editorialStandards: 4, transparency: 5 },
  'nytimes.com': { reliability: 88, bias: -12, factChecking: 4, editorialStandards: 5, transparency: 4 },
  'wsj.com': { reliability: 87, bias: 8, factChecking: 4, editorialStandards: 5, transparency: 4 },
  
  // Left-leaning
  'cnn.com': { reliability: 75, bias: -20, factChecking: 3, editorialStandards: 3, transparency: 3 },
  'msnbc.com': { reliability: 72, bias: -25, factChecking: 3, editorialStandards: 3, transparency: 3 },
  'huffpost.com': { reliability: 70, bias: -22, factChecking: 3, editorialStandards: 3, transparency: 3 },
  'vox.com': { reliability: 73, bias: -18, factChecking: 3, editorialStandards: 4, transparency: 4 },
  
  // Right-leaning
  'foxnews.com': { reliability: 68, bias: 25, factChecking: 2, editorialStandards: 3, transparency: 3 },
  'nypost.com': { reliability: 65, bias: 20, factChecking: 2, editorialStandards: 3, transparency: 3 },
  'dailywire.com': { reliability: 60, bias: 28, factChecking: 2, editorialStandards: 2, transparency: 2 },
  
  // Low credibility
  'infowars.com': { reliability: 25, bias: 35, factChecking: 1, editorialStandards: 1, transparency: 1 },
  'naturalnews.com': { reliability: 20, bias: 15, factChecking: 1, editorialStandards: 1, transparency: 1 },
  'breitbart.com': { reliability: 30, bias: 32, factChecking: 1, editorialStandards: 2, transparency: 2 },
  'dailybuzzlive.com': { reliability: 15, bias: 0, factChecking: 1, editorialStandards: 1, transparency: 1 }
};

// Helper function to extract domain from URL
const extractDomain = (url) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return null;
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
    neutral: Math.max(0, neutralScore),
    tone: positiveScore > negativeScore ? 'positive' : 
          negativeScore > positiveScore ? 'negative' : 'neutral'
  };
};

// Helper function to extract key terms with improved relevance
const extractKeyTerms = (text) => {
  if (!text || text.length < 10) return [];
  
  const tfidf = new natural.TfIdf(); // Create a new instance for each text analysis
  tfidf.addDocument(text);
  
  // Add stop words to improve term extraction
  const stopWords = ['the', 'and', 'a', 'to', 'of', 'in', 'is', 'it', 'that', 'was', 'for'];
  
  const terms = [];
  tfidf.listTerms(0).forEach(item => {
    // Filter out stop words and short terms
    if (!stopWords.includes(item.term) && item.term.length > 2) {
      terms.push({
        text: item.term,
        value: Math.round(item.tfidf * 100)
      });
    }
  });
  return terms.slice(0, 20); // Return top 20 terms
};

// Determine source credibility with more accurate data
const getSourceCredibility = (domain) => {
  if (!domain) return {
    reliability: 50,
    bias: 0,
    factChecking: 3,
    editorialStandards: 3,
    transparency: 3,
    knownFor: ['Unknown Source']
  };
  
  // Check in our expanded database
  if (sourceReputationData[domain]) {
    const data = sourceReputationData[domain];
    
    // Determine what the source is known for
    let knownFor = [];
    if (data.reliability > 85) knownFor.push('High Factual Reporting');
    if (data.bias > 15) knownFor.push('Right-Leaning Coverage');
    if (data.bias < -15) knownFor.push('Left-Leaning Coverage');
    if (Math.abs(data.bias) < 10) knownFor.push('Balanced Reporting');
    if (data.factChecking >= 4) knownFor.push('Strong Fact-Checking');
    if (data.transparency >= 4) knownFor.push('Editorial Transparency');
    
    return {
      ...data,
      knownFor: knownFor.length > 0 ? knownFor : ['General News Coverage']
    };
  }
  
  // Handle academic and government domains
  if (domain.endsWith('.edu')) {
    return {
      reliability: 85,
      bias: -5,
      factChecking: 4,
      editorialStandards: 4,
      transparency: 4,
      knownFor: ['Academic Research', 'Educational Content']
    };
  }
  
  if (domain.endsWith('.gov')) {
    return {
      reliability: 80,
      bias: 0,
      factChecking: 4,
      editorialStandards: 4,
      transparency: 4,
      knownFor: ['Government Information', 'Official Statements']
    };
  }
  
  // Handle suspicious TLDs
  const suspiciousTLDs = ['.xyz', '.info', '.click', '.top', '.buzz', '.gq', '.ml', '.ga', '.cf'];
  for (const tld of suspiciousTLDs) {
    if (domain.endsWith(tld)) {
      return {
        reliability: 30,
        bias: 0,
        factChecking: 1,
        editorialStandards: 1,
        transparency: 1,
        knownFor: ['Questionable Content', 'Suspicious Domain']
      };
    }
  }

  // Default for unknown sources
  return {
    reliability: 50,
    bias: 0,
    factChecking: 3,
    editorialStandards: 3,
    transparency: 3,
    knownFor: ['Unknown Source Type']
  };
};

// Calculate language score based on text content
const calculateLanguageScore = (text) => {
  if (!text || text.length < 10) return 50; // Default for very short text
  
  const words = tokenizer.tokenize(text.toLowerCase());
  
  // Define word lists for different language types
  const sensationalWords = [
    'shocking', 'amazing', 'incredible', 'unbelievable', 'miracle',
    'secret', 'conspiracy', 'they don\'t want you to know', 'breakthrough',
    'bombshell', 'stunning', 'jaw-dropping', 'mind-blowing', 'explosive'
  ];
  
  const scientificWords = [
    'study', 'research', 'evidence', 'data', 'analysis',
    'experiment', 'hypothesis', 'conclusion', 'findings', 'method'
  ];
  
  // Count occurrences of each language type
  let sensationalCount = 0;
  let scientificCount = 0;
  
  words.forEach(word => {
    if (sensationalWords.some(term => word.includes(term))) sensationalCount++;
    if (scientificWords.some(term => word.includes(term))) scientificCount++;
  });
  
  // Calculate normalized scores
  const totalWords = words.length;
  const sensationalScore = totalWords > 0 ? (sensationalCount / totalWords) * 100 : 0;
  const scientificScore = totalWords > 0 ? (scientificCount / totalWords) * 100 : 0;
  
  // Language score calculation - scientific language increases score, sensational decreases it
  const baseScore = 50;
  const languageScore = Math.max(0, Math.min(100, 
    baseScore + (scientificScore * 2) - (sensationalScore * 3)
  ));
  
  console.log(`Language score: ${languageScore} (scientific: ${scientificScore}, sensational: ${sensationalScore})`);
  
  return Math.round(languageScore);
};

// Helper function to generate realistic social media metrics
const generateSocialMetrics = (sourceData, title) => {
  // Base the metrics on source reputation and reliability
  const reliability = sourceData.reliability || 50;
  const bias = Math.abs(sourceData.bias || 0);
  
  console.log("Generating social metrics for:", { reliability, bias, title });
  
  // More reliable sources tend to have higher engagement
  // Biased sources tend to have more Twitter activity and polarized sentiment
  const baseEngagement = reliability * 100;
  const virality = bias > 15 ? 1.5 : 1.0; // Biased content typically spreads more
  const engagement = Math.floor(baseEngagement * (0.8 + (Math.random() * 0.4)));
  
  // Generate realistic hashtags based on bias
  const hashtags = [];
  if (title && title.length > 0) {
    // Extract potential hashtags from title
    const words = title.split(' ')
      .filter(word => word.length > 4)
      .map(word => word.replace(/[^a-zA-Z0-9]/g, ''))
      .slice(0, 2);
    
    words.forEach(word => hashtags.push('#' + word));
  }
  
  // Add generic hashtags
  hashtags.push('#news');
  if (reliability > 70) hashtags.push('#factcheck');
  else if (reliability < 40) hashtags.push('#trending');

  if (sourceData.bias > 15) hashtags.push('#conservative');
  else if (sourceData.bias < -15) hashtags.push('#progressive');
  
  // Ensure at least some hashtags are present
  if (hashtags.length === 0) {
    hashtags.push('#news', '#current', '#trending');
  }
  
  const socialData = {
    twitter: {
      shares: Math.floor((baseEngagement * virality * 0.8) * (0.7 + (Math.random() * 0.6))),
      engagement: Math.floor((baseEngagement * virality) * (0.9 + (Math.random() * 0.4))),
      sentiment: reliability > 60 ? (65 + Math.floor(Math.random() * 20)) : (40 + Math.floor(Math.random() * 30)),
      hashtags: hashtags
    },
    facebook: {
      shares: Math.floor((baseEngagement * 1.2) * (0.8 + (Math.random() * 0.5))),
      engagement: Math.floor((baseEngagement * 1.5) * (0.9 + (Math.random() * 0.5))),
      sentiment: reliability > 60 ? (70 + Math.floor(Math.random() * 15)) : (50 + Math.floor(Math.random() * 20)),
      hashtags: hashtags
    },
    instagram: {
      engagement: Math.floor((baseEngagement * 0.7) * (0.8 + (Math.random() * 0.4))),
      sentiment: reliability > 60 ? (75 + Math.floor(Math.random() * 15)) : (55 + Math.floor(Math.random() * 15)),
      hashtags: hashtags
    },
    overall: {
      viralityScore: Math.min(100, Math.floor((bias * 0.7) + (100 - reliability) * 0.5 + Math.random() * 20)),
      publicInterest: Math.floor(60 + Math.random() * 30),
      discussionPolarity: calculateDiscussionPolarity(sourceData.bias)
    }
  };
  
  console.log("Generated social metrics:", socialData);
  return socialData;
};

// Helper function to calculate discussion polarity based on bias
const calculateDiscussionPolarity = (bias) => {
  // Higher absolute bias means more polarized discussions
  const absBias = Math.abs(bias || 0);
  
  if (absBias > 25) {
    return "highly_polarized";
  } else if (absBias > 15) {
    return "polarized";
  } else if (absBias > 5) {
    return "moderate";
  } else {
    return "balanced";
  }
};

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
                      
        sourceDomain = extractDomain(url);
      } catch (error) {
        console.error('Error fetching URL:', error);
      }
    }

    // Use provided content if URL extraction failed or wasn't provided
    if (!analysisText) {
      analysisText = content || originalTitle || '';
    }

    // Get source credibility data
    const sourceData = getSourceCredibility(sourceDomain);
    
    // Generate sentiment analysis
    const sentiment = analyzeSentiment(analysisText);
    
    // Extract key terms
    const keyTerms = extractKeyTerms(analysisText);
    
    // Calculate language score
    const languageScore = calculateLanguageScore(analysisText);
    
    // Generate mock social media metrics based on source reputation
    const socialMetrics = generateSocialMetrics(sourceData, originalTitle);
    
    // Calculate credibility score based on source reliability
    let credibilityScore = sourceData.reliability;
    
    // For highly credible sources, keep score high
    if (sourceData.reliability >= 85) {
      credibilityScore = Math.max(credibilityScore, 85);
    }
    
    // For less credible sources, ALWAYS keep score lower than 40
    if (sourceData.reliability < 50) {
      credibilityScore = Math.min(40, credibilityScore);
    }
    
    // Generate comprehensive analysis results
    const result = {
      // Credibility metrics
      sourceReliability: sourceData.reliability,
      credibilityScore: credibilityScore,
      languageScore: languageScore,
      contentScore: Math.min(sourceData.reliability + 10, 100),
      factScore: Math.min(sourceData.reliability + (sourceData.factChecking * 5), 100),
      
      // Verification status
      verificationStatus: credibilityScore > 85 ? 'verified' : 
                          credibilityScore > 70 ? 'partially_verified' : 
                          credibilityScore > 45 ? 'unverified' : 'fake',

      // Bias and sentiment
      bias: sourceData.bias,
      biasLevel: sourceData.bias > 15 ? 'right' : 
                sourceData.bias < -15 ? 'left' : 'center',
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

      // Social media metrics - ensure this is included in the response and properly formatted
      socialMetrics: socialMetrics || {
        twitter: {
          shares: Math.round(Math.random() * 10000),
          engagement: Math.round(Math.random() * 50000),
          sentiment: Math.round(Math.random() * 40 + 60),
          hashtags: ['#news', '#factcheck', '#trending']
        },
        facebook: {
          shares: Math.round(Math.random() * 20000),
          engagement: Math.round(Math.random() * 100000),
          sentiment: Math.round(Math.random() * 40 + 60),
          hashtags: ['#viral', '#breaking', '#news']
        },
        instagram: {
          engagement: Math.round(Math.random() * 15000),
          sentiment: Math.round(Math.random() * 40 + 60),
          hashtags: ['#news', '#trending']
        },
        overall: {
          viralityScore: Math.round(Math.random() * 100),
          publicInterest: Math.round(Math.random() * 100),
          discussionPolarity: "moderate"
        }
      },

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
      }
    };

    console.log("API response includes socialMetrics:", !!result.socialMetrics);
    
    res.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Error analyzing content' });
  }
});

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
  
  const metrics = generateSocialMetrics(testSourceData, testTitle);
  
  res.json({
    title: testTitle,
    sourceData: testSourceData,
    socialMetrics: metrics
  });
});

module.exports = router;
