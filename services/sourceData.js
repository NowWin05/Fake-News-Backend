/**
 * Source data and credibility checking service
 * Contains methods to evaluate domain reputation and generate social media metrics
 */

// Expanded and more accurate source data
const {sourceReputationData} =require('./../data')

// Helper function to extract domain from URL
const extractDomain = (url) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return null;
  }
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
  
  // Generate platform-specific metrics
  const twitterShares = Math.floor(engagement * virality * (0.7 + (Math.random() * 0.6)));
  const twitterEngagement = Math.floor(twitterShares * (1.2 + (Math.random() * 1.0)));
  
  // Facebook tends to have more shares but might be less for highly biased content
  const facebookFactor = bias > 20 ? 0.8 : 1.2;
  const facebookShares = Math.floor(engagement * facebookFactor * (0.8 + (Math.random() * 0.4)));
  const facebookEngagement = Math.floor(facebookShares * (1.1 + (Math.random() * 0.8)));
  
  // Instagram tends to focus more on visual content, so text-only news might get less engagement
  const instagramEngagement = Math.floor(engagement * 0.7 * (0.6 + (Math.random() * 0.8)));
  
  // Generate sentiment leaning based on source bias and reliability
  // Highly reliable sources tend to generate more balanced sentiment
  // Highly biased sources tend to generate more polarized sentiment
  let twitterSentiment, facebookSentiment, instagramSentiment;
  
  if (bias > 20) {
    // Highly biased content generates more polarized reactions
    twitterSentiment = 100 - Math.floor(reliability * 0.6); // Higher number is more negative
    facebookSentiment = Math.floor(40 + (Math.random() * 30)); // More mixed but still negative leaning
    instagramSentiment = Math.floor(30 + (Math.random() * 40)); // More mixed
  } else if (reliability > 75) {
    // Highly reliable content tends to generate more positive sentiment
    twitterSentiment = Math.floor(30 + (Math.random() * 30));
    facebookSentiment = Math.floor(20 + (Math.random() * 40));
    instagramSentiment = Math.floor(30 + (Math.random() * 30));
  } else {
    // Average content gets mixed sentiment
    twitterSentiment = Math.floor(40 + (Math.random() * 30));
    facebookSentiment = Math.floor(35 + (Math.random() * 30));
    instagramSentiment = Math.floor(35 + (Math.random() * 30));
  }
  
  // Calculate overall metrics
  const viralityScore = Math.min(100, Math.floor((twitterShares + facebookShares) / 100));
  const publicInterest = Math.min(100, Math.floor((twitterEngagement + facebookEngagement + instagramEngagement) / 300));
  const discussionPolarity = calculateDiscussionPolarity(sourceData.bias);
  
  return {
    twitter: {
      shares: twitterShares,
      engagement: twitterEngagement,
      sentiment: twitterSentiment,
      hashtags: hashtags
    },
    facebook: {
      shares: facebookShares,
      engagement: facebookEngagement,
      sentiment: facebookSentiment,
      hashtags: hashtags.slice(0, 3) // Facebook uses fewer hashtags
    },
    instagram: {
      engagement: instagramEngagement,
      sentiment: instagramSentiment,
      hashtags: hashtags.slice(0, 4)
    },
    overall: {
      viralityScore,
      publicInterest,
      discussionPolarity
    }
  };
};

module.exports = {
  extractDomain,
  getSourceCredibility,
  generateSocialMetrics
};
