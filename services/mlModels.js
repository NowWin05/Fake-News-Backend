/**
 * Machine Learning Models Service
 * Provides pre-trained ML models for sentiment analysis, credibility scoring, and bias detection
 * Uses Python backend for more powerful ML capabilities
 */

const tf = require('@tensorflow/tfjs');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');

// For browser-compatible TensorFlow.js, we'll need to use an approach without direct node bindings
const natural = require('natural');

// Initialize models - will be loaded when needed
let toxicityModel;
let universalEncoder;

// Path for cached model files
const MODEL_DIR = path.join(__dirname, '../ml-models');
const PYTHON_SCRIPT_PATH = path.join(MODEL_DIR, 'fake_news_classifier.py');

// Ensure the model directory exists
if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
}

// Set up TensorFlow.js for Node.js environment using CPU backend
async function setupTensorflowBackend() {
    try {
        await tf.setBackend('cpu');
        // console.log('TensorFlow backend initialized:', tf.getBackend());
    } catch (error) {
        // console.error('Error initializing TensorFlow backend:', error);
    }
}

/**
 * Check if Python and required libraries are installed
 * @returns {Promise<boolean>} True if Python is available
 */
async function checkPythonSetup() {
    try {
        const execPromise = promisify(exec);
        
        // Check if Python is installed
        const pythonCheck = await execPromise('python --version');
        // console.log('Python detected:', pythonCheck.stdout.trim());

        // Install required packages if needed
        await execPromise('pip install scikit-learn numpy');
        
        return true;
    } catch (error) {
        // console.error('Python setup error:', error.message);
        // console.log('Make sure Python 3 and pip are installed on your system.');
        return false;
    }
}

/**
 * Train the Python-based fake news model
 * @returns {Promise<boolean>} True if training was successful
 */
async function trainPythonModel() {
    return new Promise((resolve, reject) => {
        // console.log('Training Python fake news classification model...');
        
        const pythonProcess = spawn('python', [PYTHON_SCRIPT_PATH]);
        
        let outputData = '';
        let errorData = '';
        
        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
            // console.log(`Python Output: ${data.toString().trim()}`);
        });
        
        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
            // console.error(`Python Error: ${data.toString().trim()}`);
        });
        
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                // console.error(`Python process exited with code ${code}`);
                // console.error(errorData);
                reject(new Error(`Training failed with code ${code}: ${errorData}`));
                return;
            }
            
            // console.log('Python model training completed successfully');
            resolve(true);
        });
    });
}

/**
 * Classify news text as fake or real using Python model
 * @param {string} text - News text to classify
 * @returns {Promise<Object>} - Classification result with fakeProbability and isLikelyFake
 */
async function classifyNews(text) {
    try {
        // Ensure Python is set up
        const pythonAvailable = await checkPythonSetup();
        if (!pythonAvailable) {
            throw new Error('Python environment is not properly set up');
        }
        
        // Check if model file exists, if not train it
        const modelPath = path.join(MODEL_DIR, 'fake_news_model.pkl');
        if (!fs.existsSync(modelPath)) {
            // console.log('Model file not found. Training new model...');
            await trainPythonModel();
        }
        
        // Escape text for shell
        const escapedText = text.replace(/"/g, '\\"');
        
        return new Promise((resolve, reject) => {
            // Call Python script with text as argument
            const pythonProcess = spawn('python', [
                PYTHON_SCRIPT_PATH,
                escapedText
            ]);
            
            let resultData = '';
            let errorData = '';
            
            pythonProcess.stdout.on('data', (data) => {
                resultData += data.toString();
            });
            
            pythonProcess.stderr.on('data', (data) => {
                errorData += data.toString();
                // console.error(`Python Error: ${data.toString().trim()}`);
            });
            
            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    // console.error(`Python process exited with code ${code}`);
                    reject(new Error(`Classification failed: ${errorData}`));
                    return;
                }
                
                try {
                    // Parse the JSON result from Python
                    const result = JSON.parse(resultData);
                    resolve(result);
                } catch (error) {
                    // console.error('Error parsing Python output:', error);
                    // console.error('Raw output:', resultData);
                    reject(new Error('Failed to parse Python output'));
                }
            });
        });
    } catch (error) {
        // console.error('Error classifying news:', error);
        // Return fallback response when model fails
        return {
            fakeProbability: 50, // Neutral response
            isLikelyFake: false,
            confidence: 30,
            error: error.message
        };
    }
}

// Modified model loader for toxicity model
const loadToxicityModel = async () => {
    if (toxicityModel) return toxicityModel;
    
    try {
        // console.log('Loading toxicity model...');
        // We need to dynamically import toxicity because it's a browser-based module
        const toxicity = require('@tensorflow-models/toxicity');
        
        // The minimum prediction confidence
        const threshold = 0.7;
        toxicityModel = await toxicity.load(threshold);
        // console.log('Toxicity model loaded successfully');
        return toxicityModel;
    } catch (error) {
        // console.error('Error loading toxicity model:', error);
        throw error;
    }
};

// Analyzer for sentiment using fallback methods
const analyzeSentimentWithML = async (text) => {
    if (!text || text.length < 3) {
        return {
            positive: 0,
            negative: 0,
            neutral: 100,
            tone: 'neutral'
        };
    }

    try {
        // Try to load and use the toxicity model
        const model = await loadToxicityModel();
        const predictions = await model.classify(text);
        
        // Extract relevant toxicity scores
        let negative = 0;
        let sentiment = {};
        
        predictions.forEach(prediction => {
            const label = prediction.label;
            const match = prediction.results[0].match;
            const confidenceScore = prediction.results[0].probabilities[1] * 100; // Probability of being toxic
            
            // Store each prediction
            sentiment[label] = {
                match,
                confidenceScore
            };
            
            // Negative sentiment indicators: toxicity, insult, threat
            if (match && ['toxicity', 'insult', 'threat'].includes(label)) {
                negative += confidenceScore;
            }
        });
        
        // Normalize negative score (average of negative categories that matched)
        let negativeScore = 0;
        let negativeCount = 0;
        
        ['toxicity', 'insult', 'threat'].forEach(category => {
            if (sentiment[category]?.match) {
                negativeScore += sentiment[category].confidenceScore;
                negativeCount++;
            }
        });
        
        // Calculate final sentiment scores
        const normalizedNegative = negativeCount > 0 ? negativeScore / negativeCount : 0;
        
        // Use rule-based positive detection since toxicity model focuses on negative attributes
        const positiveIndicators = ['identity_attack', 'insult', 'threat', 'toxicity'];
        const notNegative = positiveIndicators.every(category => 
            !sentiment[category]?.match || sentiment[category]?.confidenceScore < 50
        );
        
        // Calculate positive as inverse of negative, with adjustments
        const positiveScore = notNegative ? Math.max(10, 100 - normalizedNegative) : 
                                         Math.max(0, 50 - normalizedNegative/2);
        
        // Calculate neutral score
        const neutralScore = Math.max(0, 100 - positiveScore - normalizedNegative);
        
        return {
            positive: Math.round(positiveScore),
            negative: Math.round(normalizedNegative),
            neutral: Math.round(neutralScore),
            tone: normalizedNegative > positiveScore ? 'negative' : 
                  positiveScore > normalizedNegative + 20 ? 'positive' : 'neutral',
            details: sentiment
        };
    } catch (error) {
        // console.error('Error analyzing sentiment with ML:', error);
        // Fallback to simple sentiment analysis method
        return fallbackSentimentAnalysis(text);
    }
};

// Fallback method when ML model fails
const fallbackSentimentAnalysis = (text) => {
    const analyzer = new natural.SentimentAnalyzer("English", natural.PorterStemmer, "afinn");
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text.toLowerCase());
    
    const score = analyzer.getSentiment(tokens);
    
    // Convert score to percentages
    let positive = 0, negative = 0, neutral = 0;
    
    if (score > 0) {
        positive = Math.min(100, score * 100);
        neutral = 100 - positive;
    } else if (score < 0) {
        negative = Math.min(100, Math.abs(score) * 100);
        neutral = 100 - negative;
    } else {
        neutral = 100;
    }
    
    return {
        positive: Math.round(positive),
        negative: Math.round(negative),
        neutral: Math.round(neutral),
        tone: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral'
    };
};

/**
 * Feature extraction for text analysis
 * @param {string} text - Text to analyze
 * @returns {Object} - Extracted features
 */
const extractTextFeatures = (text = '') => {
    if (!text) return {};
    
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Calculate capitalization ratio (excessive caps is suspicious)
    const capsCount = (text.match(/[A-Z]/g) || []).length;
    const capsRatio = capsCount / Math.max(1, text.length);
    
    // Calculate various text features
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const avgSentenceLength = words.length / Math.max(1, sentences.length);
    
    // Check for clickbait patterns
    const clickbaitPatterns = [
        /you won't believe/i, /shocking/i, /amazing/i, /mind-?blowing/i,
        /revealing/i, /unbelievable/i, /insider/i, /secret/i,
        /\?\?\?+$/, /!!+/, /\d+ (tricks|signs|reasons|things|principles)/i,
        /^(how|what|when|why)/i
    ];
    
    const clickbaitScore = clickbaitPatterns.reduce((count, pattern) => 
        pattern.test(text) ? count + 1 : count, 0) / clickbaitPatterns.length;
    
    // Check for emotional words
    const emotionalWords = [
        'angry', 'mad', 'furious', 'happy', 'sad', 'thrilled', 'excited', 
        'outraged', 'devastated', 'shocking', 'unbelievable', 'incredible'
    ];
    
    const emotionalWordCount = words.filter(word => 
        emotionalWords.includes(word.toLowerCase())
    ).length;
    
    const emotionalScore = emotionalWordCount / words.length;
    
    return {
        wordCount: words.length,
        sentenceCount: sentences.length,
        avgWordLength,
        avgSentenceLength,
        capsRatio,
        clickbaitScore,
        emotionalScore
    };
};

/**
 * Calculate credibility score using feature-based model
 * @param {Object} params - Parameters for credibility analysis
 * @returns {Promise<number>} - Credibility score from 0-100
 */
const calculateCredibilityScoreML = async ({ 
    title, 
    content, 
    sourceReliability, 
    structuralScore, 
    coherenceScore
}) => {
    // Process text to extract features
    try {
        // In absence of true embedding model, use feature extraction
        const titleFeatures = extractTextFeatures(title);
        const contentFeatures = extractTextFeatures(content);
        
        // Calculate combined features
        const contentLength = contentFeatures.wordCount;
        const titleLength = titleFeatures.wordCount;
        const avgSentenceLength = contentFeatures.avgSentenceLength;
        const capsRatio = contentFeatures.capsRatio;
        const clickbaitScore = titleFeatures.clickbaitScore;
        
        // Calculate credibility factors
        const contentFactor = Math.min(1, contentLength / 300) * 0.7 + 0.3;
        const sentenceFactor = avgSentenceLength > 5 && avgSentenceLength < 35 ? 1 : 0.7;
        const capsFactor = capsRatio < 0.3 ? 1 : Math.max(0.5, 1 - capsRatio);
        const clickbaitFactor = 1 - clickbaitScore;
        
        // Without true embeddings, create a feature-based score
        const featureScore = Math.min(100, 50 + 
            ((1 - titleFeatures.emotionalScore) * 10) + 
            ((1 - contentFeatures.emotionalScore) * 10) + 
            ((1 - clickbaitScore) * 20) + 
            (contentLength > 100 ? 10 : contentLength / 10)
        );
        
        // Weighted score calculation
        let score = (
            sourceReliability * 0.4 +
            structuralScore * 0.15 +
            coherenceScore * 0.15 +
            featureScore * 0.3
        );
        
        // Apply penalty factors
        score = score * contentFactor * sentenceFactor * capsFactor * clickbaitFactor;
        
        // Ensure score is between 0-100
        return Math.max(0, Math.min(100, score));
    } catch (error) {
        // console.error('Error calculating credibility score with ML:', error);
        // If ML fails, return a score mainly based on source reliability
        return Math.max(0, Math.min(100, sourceReliability * 0.8 + 
                                         (structuralScore + coherenceScore) * 0.1));
    }
};

/**
 * Calculate bias score using feature-based methods
 * @param {string} text - Text to analyze for bias
 * @returns {Promise<Object>} - Bias score results
 */
const calculateBiasScoreML = async (text) => {
    if (!text || text.length < 10) {
        return { biasScore: 0, biasLevel: 'center', confidence: 30 };
    }
    
    try {
        // Without a true bias detection model, use lexicon-based approach
        // Lists of words that may indicate political leaning
        const rightLeaningTerms = [
            'conservative', 'tradition', 'family values', 'tax cuts', 'small government',
            'freedom', 'capitalism', 'free market', 'patriot', 'religious liberty',
            'welfare reform', 'personal responsibility', 'tough on crime', 'defense'
        ];
        
        const leftLeaningTerms = [
            'progressive', 'social justice', 'equality', 'diversity', 'inclusion', 
            'climate change', 'workers rights', 'universal healthcare', 'regulation',
            'affordable housing', 'gun control', 'green', 'systemic', 'marginalized'
        ];
        
        const lowercaseText = text.toLowerCase();
        
        // Count occurrences of politically charged terms
        let rightCount = 0;
        let leftCount = 0;
        
        rightLeaningTerms.forEach(term => {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            const matches = lowercaseText.match(regex);
            if (matches) rightCount += matches.length;
        });
        
        leftLeaningTerms.forEach(term => {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            const matches = lowercaseText.match(regex);
            if (matches) leftCount += matches.length;
        });
        
        // Calculate bias based on term frequency
        const totalTerms = rightCount + leftCount;
        
        // Default to center if not enough bias indicators
        if (totalTerms < 2) {
            return { biasScore: 0, biasLevel: 'center', confidence: 30 };
        }
        
        // Calculate bias score (-1 to 1, negative is left, positive is right)
        const biasScore = totalTerms === 0 ? 0 : (rightCount - leftCount) / totalTerms;
        
        // Determine bias level
        let biasLevel;
        if (biasScore > 0.3) biasLevel = 'right';
        else if (biasScore < -0.3) biasLevel = 'left';
        else biasLevel = 'center';
        
        // Calculate confidence based on number of matches
        const confidence = Math.min(100, Math.max(30, totalTerms * 15));
        
        return {
            biasScore,
            biasLevel,
            confidence
        };
    } catch (error) {
        // console.error('Error calculating bias with ML:', error);
        // Fall back to simple rule-based bias detection
        return { biasScore: 0, biasLevel: 'center', confidence: 30 };
    }
};

// Initialize the TensorFlow backend
setupTensorflowBackend();

// Export methods
module.exports = {
    analyzeSentimentWithML,
    calculateCredibilityScoreML,
    calculateBiasScoreML,
    extractTextFeatures,
    classifyNews,
    trainPythonModel,
    checkPythonSetup
};