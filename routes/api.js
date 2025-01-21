const express = require('express'); // Import express for creating routes
const router = express.Router(); // Initialize an express router
const axios = require('axios'); // HTTP client for making requests
const cheerio = require('cheerio'); // HTML parser for scraping content from webpages
const natural = require('natural'); // Natural Language Processing (NLP) library

// Initialize NLP tools
const tokenizer = new natural.WordTokenizer(); // Tokenizer for splitting text into words
const TfIdf = natural.TfIdf; // Term Frequency-Inverse Document Frequency for extracting key terms
const tfidf = new TfIdf(); // TF-IDF instance for analyzing importance of terms

// Mock data for demonstration purposes
const mockSourceData = {
  'bbc.com': { reliability: 90, bias: -5 }, // Example of a trusted source with low bias
  'cnn.com': { reliability: 85, bias: -15 }, // Example of a reliable news source with moderate bias
  'foxnews.com': { reliability: 75, bias: 25 }, // Example of a less reliable source with high bias
};

// Helper function to extract domain from URL
const extractDomain = (url) => {
  try {
    return new URL(url).hostname; // Extract domain from URL
  } catch {
    return null; // Return null if URL is invalid
  }
};

// Helper function to analyze text sentiment
const analyzeSentiment = (text) => {
  const words = tokenizer.tokenize(text.toLowerCase()); // Tokenize text into lowercase words
  let positive = 0;
  let negative = 0;
  let neutral = 0;

  // Simple sentiment analysis (replace with a more sophisticated library)
  words.forEach(word => {
    if (['good', 'great', 'excellent', 'amazing'].includes(word)) positive++;
    else if (['bad', 'terrible', 'awful', 'horrible'].includes(word)) negative++;
    else neutral++;
  });

  const total = words.length;
  return {
    positive: Math.round((positive / total) * 100), // Calculate positive sentiment percentage
    negative: Math.round((negative / total) * 100), // Calculate negative sentiment percentage
    neutral: Math.round((neutral / total) * 100) // Calculate neutral sentiment percentage
  };
};

// Helper function to extract key terms
const extractKeyTerms = (text) => {
  tfidf.addDocument(text); // Add text document to TF-IDF
  const terms = [];
  tfidf.listTerms(0).forEach(item => {
    terms.push({
      text: item.term,
      value: Math.round(item.tfidf * 100) // Get TF-IDF value for terms
    });
  });
  return terms.slice(0, 50); // Return top 50 terms
};

// Main analysis endpoint
router.post('/analyze', async (req, res) => {
  try {
    const { url, title, content } = req.body;
    let analysisText = '';
    let sourceDomain = null;

    // Extract content from URL if provided
    if (url) {
      try {
        const response = await axios.get(url); // Fetch content from URL
        const $ = cheerio.load(response.data); // Load HTML data
        analysisText = $('article').text() || $('main').text() || $('body').text(); // Extract main content
        sourceDomain = extractDomain(url); // Extract domain from URL
      } catch (error) {
        console.error('Error fetching URL:', error); // Handle errors gracefully
      }
    }

    // Use provided content if URL extraction failed or wasn't provided
    if (!analysisText) {
      analysisText = content || title || '';
    }

    // Generate analysis results
    const sentiment = analyzeSentiment(analysisText); // Sentiment analysis
    const keyTerms = extractKeyTerms(analysisText); // Extract key terms

    // Mock source reputation data
    const sourceData = sourceDomain ? mockSourceData[sourceDomain] || {
      reliability: 70,
      bias: 0
    } : {
      reliability: 50,
      bias: 0
    };

    // Generate comprehensive analysis results
    const result = {
      // Credibility metrics
      sourceReliability: sourceData.reliability,
      contentScore: Math.round(Math.random() * 20 + 70), // Mock score
      factScore: Math.round(Math.random() * 20 + 70), // Mock score
      languageScore: Math.round(Math.random() * 20 + 70), // Mock score

      // Bias and sentiment
      bias: sourceData.bias,
      sentiment,

      // Source information
      source: sourceDomain || 'Unknown Source',
      sourceAccuracy: Math.round(sourceData.reliability / 20),
      sourceFactChecking: Math.round(Math.random() * 2 + 3),
      sourceEditorialStandards: Math.round(Math.random() * 2 + 3),
      sourceTransparency: Math.round(Math.random() * 2 + 3),
      sourceKnownFor: ['Investigative Journalism', 'Political Coverage', 'International News'],

      // Content analysis
      keyTerms,

      // Social media metrics (mock data)
      socialMetrics: {
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
        }
      },

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

    res.json(result); // Return the analysis results
  } catch (error) {
    console.error('Analysis error:', error); // Log any errors
    res.status(500).json({ error: 'Error analyzing content' }); // Send error response
  }
});

module.exports = router; // Export the router
