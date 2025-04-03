/**
 * Text analysis service
 * Contains methods for analyzing content, sentiment, and language
 */
const { 
    rightBiasWords, 
    leftBiasWords, 
    negativeWords, 
    positiveWords, 
    scientificWords, 
    sensationalWords,
    stopWords
  } = require('./../data');
const natural = require('natural');

// Initialize NLP tools
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

// Improved sentiment analysis function that better detects nuanced sentiment
const analyzeSentiment = (text) => {
  // Tokenize and count sentiment words
  const words = tokenizer.tokenize(text.toLowerCase());
  let positive = 0;
  let negative = 0;
  
  // Use a more sophisticated word matching approach
  words.forEach(word => {
    // For positive words, check for negation in preceding words
    const isPositiveWord = positiveWords.some(pos => {
      // Check if word matches or contains the positive word
      return word === pos || word.includes(pos);
    });
    
    if (isPositiveWord) {
      // Check for negations in nearby words that could flip sentiment
      const wordIndex = words.indexOf(word);
      const previousWords = words.slice(Math.max(0, wordIndex - 3), wordIndex);
      const hasNegation = previousWords.some(w => ['not', 'no', 'never', "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't", "weren't"].includes(w));
      
      if (hasNegation) {
        negative++;
      } else {
        positive++;
      }
    }
    
    // For negative words, also check for negation which could make them positive
    const isNegativeWord = negativeWords.some(neg => {
      return word === neg || word.includes(neg);
    });
    
    if (isNegativeWord) {
      const wordIndex = words.indexOf(word);
      const previousWords = words.slice(Math.max(0, wordIndex - 3), wordIndex);
      const hasNegation = previousWords.some(w => ['not', 'no', 'never', "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't", "weren't"].includes(w));
      
      if (hasNegation) {
        positive++;
      } else {
        negative++;
      }
    }
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

// Improved language score calculation that better detects factual reporting
const calculateLanguageScore = (text) => {
  if (!text || text.length < 10) return 50; // Default for very short text
  
  const words = tokenizer.tokenize(text.toLowerCase());
  
  // Count occurrences of each language type
  let sensationalCount = 0;
  let scientificCount = 0;
  
  // More sophisticated sensational word detection with context awareness
  words.forEach((word, index) => {
    // Check for sensational words
    if (sensationalWords.some(term => word.includes(term))) {
      // Check if word is part of a legitimate quote (reduces false positives)
      const surroundingText = words.slice(Math.max(0, index - 5), Math.min(words.length, index + 6)).join(' ');
      if (!surroundingText.includes('"') && !surroundingText.includes("'")) {
        sensationalCount++;
      } else {
        // Lower weight for sensational words in quotes
        sensationalCount += 0.3;
      }
    }
    
    // Check for scientific words
    if (scientificWords.some(term => word.includes(term))) {
      scientificCount++;
    }
  });
  
  // Consider sentence structure for factual reporting (avoid penalizing longer articles)
  const sentences = text.split(/[.!?]+/);
  const averageWordsPerSentence = words.length / sentences.length;
  
  // The ideal average words per sentence for factual reporting is between 15-25
  // Higher or lower may impact the language score
  let sentenceStructureFactor = 1.0;
  if (averageWordsPerSentence > 10 && averageWordsPerSentence < 30) {
    sentenceStructureFactor = 1.2; // Bonus for good sentence structure
  }
  
  // Calculate normalized scores
  const totalWords = words.length;
  const sensationalScore = totalWords > 0 ? (sensationalCount / totalWords) * 100 : 0;
  const scientificScore = totalWords > 0 ? (scientificCount / totalWords) * 100 : 0;
  
  // Language score calculation - scientific language increases score, sensational decreases it
  // Adjusted to be more forgiving for mainstream news
  const baseScore = 55; // Slight positive bias for well-structured content
  const languageScore = Math.max(0, Math.min(100, 
    baseScore + (scientificScore * 1.8 * sentenceStructureFactor) - (sensationalScore * 2.5)
  ));
  
  console.log(`Language score: ${languageScore} (scientific: ${scientificScore}, sensational: ${sensationalScore}, structure factor: ${sentenceStructureFactor})`);
  
  return Math.round(languageScore);
};

// Helper function to calculate bias - improved to avoid false positives
const calculateBias = (text) => {
  // Use the same tokenizer for consistency
  const words = tokenizer.tokenize(text.toLowerCase());
  
  // Count occurrences of bias words
  let leftCount = 0;
  let rightCount = 0;
  
  const biasWordContext = [];
  
  words.forEach((word, index) => {
    // Check if any left-bias word contains this word or vice versa
    if (leftBiasWords.some(biasWord => 
      word.includes(biasWord) || biasWord.includes(word))) {
      // Check if this is quoted material - adjust weight if so
      const surroundingText = words.slice(Math.max(0, index - 5), Math.min(words.length, index + 6)).join(' ');
      if (surroundingText.includes('"') || surroundingText.includes("'")) {
        leftCount += 0.5; // Less weight for quotes
      } else {
        leftCount += 1;
      }
      
      biasWordContext.push({
        word,
        type: 'left',
        context: surroundingText
      });
    }
    
    // Check if any right-bias word contains this word or vice versa
    if (rightBiasWords.some(biasWord => 
      word.includes(biasWord) || biasWord.includes(word))) {
      // Check if this is quoted material - adjust weight if so
      const surroundingText = words.slice(Math.max(0, index - 5), Math.min(words.length, index + 6)).join(' ');
      if (surroundingText.includes('"') || surroundingText.includes("'")) {
        rightCount += 0.5; // Less weight for quotes
      } else {
        rightCount += 1;
      }
      
      biasWordContext.push({
        word,
        type: 'right',
        context: surroundingText
      });
    }
  });
  
  // Calculate normalized bias score between -1 and 1
  let biasScore = 0;
  const totalBiasWords = leftCount + rightCount;
  
  if (totalBiasWords > 0) {
    biasScore = (rightCount - leftCount) / totalBiasWords;
  }
  
  console.log(`Bias analysis: Left words: ${leftCount}, Right words: ${rightCount}, Score: ${biasScore}`);
  if (biasWordContext.length > 0) {
    console.log('Bias word context:', biasWordContext);
  }
  
  return biasScore;
};

// Helper function to get bias level
const getBiasLevel = (biasScore) => {
  if (biasScore > 0.2) return 'right';
  if (biasScore < -0.2) return 'left';
  return 'center';
};

// Helper function to extract key terms with improved relevance
const extractKeyTerms = (text) => {
  if (!text || text.length < 10) return [];
  
  const tfidf = new natural.TfIdf(); // Create a new instance for each text analysis
  tfidf.addDocument(text);
  
  // Add stop words to improve term extraction
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

// Helper function to get verification status
const getVerificationStatus = (credibilityScore) => {
  if (credibilityScore > 85) return 'verified';
  if (credibilityScore > 70) return 'partially_verified';
  if (credibilityScore > 45) return 'unverified';
  return 'fake';
};

module.exports = {
  tokenizer,
  sensationalWords,
  scientificWords,
  analyzeSentiment,
  calculateBias,
  getBiasLevel,
  calculateLanguageScore,
  extractKeyTerms,
  getVerificationStatus
};
