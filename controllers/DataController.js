/**
 * Data Controller
 * 
 * Utility functions for pre-processing API data before it gets passed to components
 */

// Ensures social metrics are properly formatted for the SocialMediaTracker component
export const prepareSocialMetrics = (metrics) => {
  // If metrics is null or undefined, return empty object
  if (!metrics) return {};
  
  // Check if metrics has the expected structure
  const hasTwitter = metrics.twitter && typeof metrics.twitter === 'object';
  const hasFacebook = metrics.facebook && typeof metrics.facebook === 'object';
  const hasInstagram = metrics.instagram && typeof metrics.instagram === 'object';
  const hasOverall = metrics.overall && typeof metrics.overall === 'object';
  
  // If the structure doesn't match what we expect, log warning and return empty
  if (!hasTwitter && !hasFacebook && !hasInstagram) {
    console.warn('Social metrics data is not in the expected format:', metrics);
    return {};
  }
  
  // Ensure each platform has valid keys
  const processed = {};
  
  // Process Twitter
  if (hasTwitter) {
    processed.twitter = {
      shares: metrics.twitter.shares || 0,
      engagement: metrics.twitter.engagement || 0,
      sentiment: metrics.twitter.sentiment || 0,
      hashtags: Array.isArray(metrics.twitter.hashtags) ? metrics.twitter.hashtags : ['#news']
    };
  }
  
  // Process Facebook
  if (hasFacebook) {
    processed.facebook = {
      shares: metrics.facebook.shares || 0,
      engagement: metrics.facebook.engagement || 0,
      sentiment: metrics.facebook.sentiment || 0,
      hashtags: Array.isArray(metrics.facebook.hashtags) ? metrics.facebook.hashtags : ['#news']
    };
  }
  
  // Process Instagram
  if (hasInstagram) {
    processed.instagram = {
      engagement: metrics.instagram.engagement || 0,
      sentiment: metrics.instagram.sentiment || 0,
      hashtags: Array.isArray(metrics.instagram.hashtags) ? metrics.instagram.hashtags : ['#news']
    };
  }
  
  // Process overall metrics
  if (hasOverall) {
    processed.overall = {
      viralityScore: metrics.overall.viralityScore || 50,
      publicInterest: metrics.overall.publicInterest || 50,
      discussionPolarity: metrics.overall.discussionPolarity || 'balanced'
    };
  }
  
  return processed;
};

// Ensures sentiment data is properly formatted for the SentimentAnalysis component
export const prepareSentimentData = (sentiment) => {
  if (!sentiment) {
    return {
      positive: 0,
      negative: 0,
      neutral: 100,
      tone: 'neutral'
    };
  }
  
  // Make sure all required properties exist
  return {
    positive: typeof sentiment.positive === 'number' ? sentiment.positive : 0,
    negative: typeof sentiment.negative === 'number' ? sentiment.negative : 0,
    neutral: typeof sentiment.neutral === 'number' ? sentiment.neutral : 100,
    tone: sentiment.tone || 'neutral'
  };
};

export default {
  prepareSocialMetrics,
  prepareSentimentData
};
