#!/usr/bin/env python3
# Fake News Classifier - Pretrained ML model for news classification
# This script provides a simple pretrained model that can be called from Node.js

import os
import sys
import json
import pickle
import numpy as np
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.feature_selection import SelectKBest, chi2
from sklearn.calibration import CalibratedClassifierCV
import math

# Define paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, 'fake_news_model.pkl')
VECTORIZER_PATH = os.path.join(SCRIPT_DIR, 'vectorizer.pkl')

# Enhanced training data for the model
# A much larger dataset with more examples of fake and real news

# Fake news examples - titles and snippets that exhibit typical characteristics of fake news
fake_news_texts = [
    "BREAKING: Secret document reveals shocking conspiracy in government",
    "You won't believe what celebrities are hiding from the public",
    "Doctor discovers miracle cure that big pharma doesn't want you to know about",
    "Anonymous source reveals shocking truth about political leader",
    "Scientists baffled by mysterious phenomenon that defies explanation",
    "Secret insider information reveals market manipulation",
    "Government trying to hide the truth about controversial project",
    "This one trick will eliminate all your health problems overnight",
    "What the mainstream media isn't telling you about this crisis",
    "Leaked documents expose massive cover-up by officials",
    "BOMBSHELL: President caught in secret late-night deal with foreign agents",
    "Doctors STUNNED by this new weight loss trick - no diet or exercise needed",
    "The miracle food that kills cancer cells - BANNED by big pharmaceutical companies",
    "Former government agent reveals classified alien contact cover-up",
    "What the elite don't want you to know about the banking system",
    "SHOCKING truth about vaccines the CDC is desperately trying to hide",
    "Military insider confirms secret weapon that could change warfare forever",
    "Breaking news: Famous celebrity reveals industry's darkest secret",
    "This common household item is slowly poisoning your family",
    "Scientists discover the REAL reason behind global climate patterns",
    "PROOF: Election rigged by shadowy international organization",
    "Top doctor fired after discovering THIS cure for all diseases",
    "Secret society controlling world governments exposed in leaked emails",
    "Internet to be shut down nationwide next week - prepare NOW",
    "Famous billionaire's secret to wealth THEY don't want you to know",
    "Expert warns: Major disaster predicted within 30 days",
    "Child genius solves problem scientists have struggled with for decades",
    "Government implementing secret plan to monitor all citizens",
    "Alternative health practitioner discovers cure for ALL autoimmune diseases",
    "LEAKED: Internal memo shows company knowingly poisoned water supply",
    "Why mainstream media is hiding this major health breakthrough",
    "Whistleblower reveals classified documents about secret military operations",
    "New evidence proves historical event was actually staged",
    "This everyday food causes cancer according to suppressed research",
    "Famous politician caught on hidden camera revealing true agenda",
    "The shocking connection between common medication and early death",
    "Secret technology can control the weather - government admits",
    "Major corporation paying millions to hide this information from public",
    "ALERT: Internet shutdown planned to prevent spread of this information",
    "Scientist who discovered cure for major disease found dead under mysterious circumstances",
    "Your phone is secretly recording everything - former tech employee reveals all",
    "Government planning to implant microchips in all citizens by 2025",
    "Hidden camera catches doctors admitting vaccines cause harm",
    "Celebrity's death wasn't natural - insider reveals shocking truth",
    "Former banker exposes how the 1% controls the global economy",
    "NASA employee breaks silence about what's REALLY on the moon",
    "Secret ingredient in popular foods designed to make you addicted",
    "BREAKING: Major world leader secretly building nuclear weapons",
    "This simple solution cures diabetes instantly - doctors hate it",
    "Former intelligence officer reveals classified mind control program"
]

# Real news examples - titles and snippets from legitimate news sources
real_news_texts = [
    "Senate passes bipartisan infrastructure bill after months of negotiations",
    "Scientists publish findings of climate study in peer-reviewed journal",
    "Company announces quarterly earnings below analyst expectations",
    "Mayor proposes new budget with focus on community development",
    "Research shows correlation between exercise and improved mental health",
    "Court rules on controversial case after reviewing evidence",
    "Study finds new treatment effective for specific medical condition",
    "Officials respond to concerns about public health measures",
    "Economic indicators suggest slow but steady growth in coming months",
    "International conference addresses global challenges through diplomatic solutions",
    "Stock market closes higher following Federal Reserve announcement",
    "City council approves funding for infrastructure improvement project",
    "Recent study identifies potential risk factors for cardiovascular disease",
    "Local school district implements new educational program",
    "Company reports 15% increase in quarterly revenue compared to last year",
    "Governor signs bill to expand healthcare access in rural communities",
    "Weather service predicts above-average precipitation for coming season",
    "University researchers publish findings on renewable energy efficiency",
    "National park announces temporary closure for trail maintenance",
    "Transportation department begins highway construction project",
    "FDA approves new medication following extensive clinical trials",
    "County officials discuss plans for emergency preparedness",
    "Museum opens new exhibition featuring historical artifacts",
    "Agricultural report shows increase in crop yields despite drought conditions",
    "Health department releases updated guidelines for disease prevention",
    "Consumer spending increased by 2.4% in the first quarter",
    "Police department implements community engagement initiative",
    "Census data reveals demographic shifts in metropolitan areas",
    "Committee recommends updates to building safety regulations",
    "Library system expands digital resources for remote learning",
    "Environmental study shows improvement in air quality over five-year period",
    "State legislature debates funding for public education programs",
    "Medical researchers identify genetic marker associated with rare condition",
    "Technology company announces plan to reduce carbon emissions by 2030",
    "Survey indicates changing consumer preferences in retail market",
    "Housing development project approved after environmental review",
    "Health officials monitor cases of seasonal influenza",
    "Manufacturing sector reports steady employment figures",
    "Transportation study identifies traffic patterns in urban centers",
    "International trade agreement enters final negotiation phase",
    "Community college expands vocational training programs",
    "Energy company invests in renewable infrastructure development",
    "Scientists document changes in local ecosystem after conservation efforts",
    "School board approves budget for upcoming academic year",
    "Expert panel discusses implications of recent economic data",
    "Archeologists uncover artifacts at historical site",
    "Court of appeals upholds ruling in precedent-setting case",
    "Consumer protection agency issues guidelines for online transactions",
    "City implements water conservation measures during dry season",
    "Public health study examines effectiveness of prevention programs"
]

# Opinion pieces examples - distinct from both fake and real news
opinion_texts = [
    "I believe the new policy will have serious consequences for our economy",
    "Why I think the government's approach to healthcare is fundamentally flawed",
    "The case for renewable energy: A perspective on climate policy",
    "My view: Tax cuts benefit the wealthy more than the middle class",
    "Opinion: The education system needs significant reform to prepare students for the future",
    "Editorial: Why we should reconsider our approach to immigration",
    "Commentary: The real problem with social media regulation",
    "Analysis: What the election results mean for the country's future",
    "Perspective: The hidden costs of healthcare reform",
    "The argument for a four-day work week and its economic benefits",
    "Why I've changed my mind about nuclear energy as a climate solution",
    "How we should think about AI regulation in the coming decade",
    "The case against expanding military intervention overseas",
    "In my view, the housing crisis requires bold government action",
    "Why consumer protection laws don't go far enough - my perspective"
]

# Satirical content examples
satire_texts = [
    "Nation's leading experts confirm whatever you want to hear",
    "Man who just woke up from 20-year coma immediately asks to be put back under",
    "Report: We should have seen economic crisis coming, say experts who did not see economic crisis coming",
    "Area man passionate defender of what he imagines the Constitution to be",
    "Study finds link between headlines containing the phrase 'study finds' and not reading the article",
    "Scientists discover new form of life that evolved specifically to host podcast",
    "Child returns from summer camp somehow both more mature and grosser than ever",
    "Local man decides to give online dating 37th chance",
    "New study shows people who point out grammatical errors have no friends",
    "Report: Average person becomes unstoppably ravenous the moment they enter grocery store",
    "Area dad ruins three-hour movie by whispering questions throughout",
    "Facebook completes two-year project to add 'haha' reaction to all posts about climate change",
    "Nation decides to just throw all daily news in trash for 24-hour mental health break",
    "Local politician passionate about issue after it affects him personally",
    "Study finds waiting for your food while watching others who ordered after you get served first is leading cause of death"
]

# Clickbait examples
clickbait_texts = [
    "You won't believe what happens next!",
    "This one weird trick will change your life forever",
    "Doctors hate her for discovering this simple solution",
    "10 shocking secrets the government doesn't want you to know - #7 will blow your mind!",
    "What this celebrity did will leave you speechless",
    "I tried this for a week and you won't believe the results",
    "This simple hack can save you thousands - banks are furious!",
    "The truth about this everyday food will shock you",
    "She opened her door to find THIS - I'm still in tears",
    "This simple morning routine is transforming people's lives",
    "Watch what happens when this baby sees a dog for the first time",
    "They thought nobody was watching, but the camera caught everything",
    "Scientists are baffled by this new discovery",
    "This quiz will reveal your true personality - 99% get it wrong!",
    "I couldn't believe my eyes when I saw the transformation"
]

# Feature patterns that strongly indicate fake news
fake_news_patterns = {
    'conspiracy_terms': ['deep state', 'cover up', 'conspiracy', 'cabal', 'shadow government', 'illuminati'],
    'exaggerated_claims': ['cure for all', 'miracle', 'secret cure', '100% effective', 'discovered the truth'],
    'urgency_terms': ['urgent', 'breaking', 'alert', 'warning', 'must see', 'before it\'s deleted'],
    'clickbait_phrases': ['you won\'t believe', 'shocked', 'mind blown', 'doctors hate', 'this one trick'],
    'anonymous_sources': ['anonymous source', 'inside source', 'sources say', 'unnamed official'],
    'emotional_manipulation': ['outrage', 'furious', 'meltdown', 'destroyed', 'obliterated', 'slammed'],
    'sensationalism': ['bombshell', 'explosive', 'shocking truth', 'stunning', 'jaw-dropping']
}

# Feature patterns that indicate credible news
real_news_patterns = {
    'attribution': ['according to', 'reported by', 'cited in', 'study shows', 'research published in'],
    'measured_language': ['suggests', 'indicates', 'appears to', 'analysis shows', 'evidence points to'],
    'contextual_info': ['background', 'previously', 'historically', 'for context', 'in comparison'],
    'data_references': ['survey of', 'poll results', 'data indicates', 'statistics show', 'percent of'],
    'multiple_viewpoints': ['however', 'on the other hand', 'critics argue', 'supporters suggest', 'alternatively']
}

# List of credibility-enhancing phrases (when a source is cited)
source_citation_patterns = [
    'according to', 'said in a statement', 'published in', 'reported by', 'confirmed by',
    'analysis by', 'investigation by', 'study in', 'research from', 'data from',
    'as documented by', 'findings published', 'cited by', 'experts at', 'spokesperson said',
    'interview with', 'survey conducted by', 'poll by', 'report issued by', 'paper published in'
]

def preprocess_text(text):
    """Clean and preprocess text for better feature extraction"""
    # Convert to lowercase
    text = text.lower()
    
    # Remove special characters and digits
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\d+', ' ', text)
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def calculate_readability_metrics(text):
    """Calculate readability metrics for the text"""
    if not text or len(text) < 10:
        return {
            "averageWordLength": 0,
            "averageSentenceLength": 0,
            "readabilityScore": 0
        }
    
    # Split into sentences (basic splitting by punctuation)
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    # Split into words
    words = text.split()
    
    # Calculate metrics
    word_count = len(words)
    sentence_count = len(sentences)
    
    if word_count == 0 or sentence_count == 0:
        return {
            "averageWordLength": 0,
            "averageSentenceLength": 0,
            "readabilityScore": 0
        }
    
    avg_word_length = sum(len(word) for word in words) / word_count
    avg_sentence_length = word_count / sentence_count
    
    # Simplified readability score (higher is more complex)
    # Based loosely on Flesch-Kincaid but greatly simplified
    readability_score = (0.39 * avg_sentence_length) + (11.8 * avg_word_length) - 15.59
    readability_score = max(0, min(100, readability_score * 5))  # Scale to 0-100
    
    return {
        "averageWordLength": round(avg_word_length, 2),
        "averageSentenceLength": round(avg_sentence_length, 2),
        "readabilityScore": round(readability_score, 1)
    }

def detect_pattern_matches(text, patterns):
    """Detect matches of specific patterns in the text"""
    text_lower = text.lower()
    matches = {}
    
    for category, terms in patterns.items():
        category_matches = []
        for term in terms:
            if term.lower() in text_lower:
                category_matches.append(term)
        
        if category_matches:
            matches[category] = category_matches
    
    return matches

def detect_content_type(text, classifier=None):
    """Detect if the content is news, opinion, satire, or clickbait"""
    text_lower = text.lower()
    
    # Check for common indicators of different content types
    opinion_indicators = ['opinion', 'editorial', 'perspective', 'viewpoint', 'commentary', 
                         'i believe', 'i think', 'in my view', 'my opinion', 'i argue']
    
    satire_indicators = ['satire', 'parody', 'humor', 'fictional', 'not real news']
    
    clickbait_indicators = ['you won\'t believe', '!', '!!', 'shocking', 'mind-blowing', 
                           'amazing', 'incredible', 'insane', 'unbelievable', 'secret', 
                           'trick', 'simple', 'easy', 'wow', 'omg', 'shocking']
    
    # Check for explicit markers
    for indicator in opinion_indicators:
        if indicator in text_lower:
            return 'OPINION'
    
    for indicator in satire_indicators:
        if indicator in text_lower:
            return 'SATIRE'
    
    # Count clickbait features
    clickbait_count = sum(1 for indicator in clickbait_indicators if indicator in text_lower)
    if clickbait_count >= 2:
        return 'CLICKBAIT'
    
    # If no explicit markers are found, use other heuristics
    # Look for first-person pronouns, which are common in opinion pieces
    first_person_count = len(re.findall(r'\b(i|we|my|our|myself|ourselves)\b', text_lower))
    
    if first_person_count > 3:
        return 'OPINION'
    
    # Look for exaggerated language common in satire
    exaggeration_count = len(re.findall(r'\b(literally|actually|every single|everyone|nobody|best ever|worst ever)\b', text_lower))
    
    if exaggeration_count > 2:
        return 'POTENTIAL_SATIRE'
    
    # Default to news if no other type is detected
    return 'NEWS'

def explain_feature(feature_name):
    """Generate explanations for detected features"""
    feature_explanations = {
        # Fake news pattern explanations
        'conspiracy_terms': "Contains terms often used in conspiracy theories",
        'exaggerated_claims': "Makes claims that seem too good to be true",
        'urgency_terms': "Creates artificial urgency to prompt immediate action",
        'clickbait_phrases': "Uses sensationalist language to entice readers",
        'anonymous_sources': "Relies heavily on unnamed or anonymous sources",
        'emotional_manipulation': "Uses emotionally charged language to manipulate readers",
        'sensationalism': "Presents information in a way that provokes interest at the expense of accuracy",
        
        # Real news pattern explanations
        'attribution': "Properly attributes information to specific sources",
        'measured_language': "Uses cautious language that acknowledges uncertainty",
        'contextual_info': "Provides background context for better understanding",
        'data_references': "References specific data points or statistics",
        'multiple_viewpoints': "Presents multiple perspectives or viewpoints",
        
        # Common TF-IDF features explanations
        'secret': "The word 'secret' is often used in misleading content",
        'shocking': "The word 'shocking' is often used to sensationalize content",
        'breaking': "Overuse of 'breaking' often indicates sensationalism",
        'revealed': "Claims of revelations might indicate misleading content",
        'source': "References to generic 'sources' without specifics",
        'according': "Proper attribution is common in legitimate news",
        'research': "References to research is common in legitimate news",
        'study': "References to studies is common in legitimate news",
        'evidence': "Citation of evidence is common in legitimate news",
        'report': "References to specific reports indicates better sourcing",
        'confirmed': "Confirmation language is often seen in verified news"
    }
    
    # For any term not in our dictionary, create a generic explanation
    if feature_name in feature_explanations:
        return feature_explanations[feature_name]
    elif feature_name.startswith(('report', 'stud', 'research', 'evidence', 'data', 'analy')):
        return f"References to '{feature_name}' may indicate factual reporting"
    elif feature_name.startswith(('claim', 'shock', 'secret', 'reveal', 'amaz', 'unbeliev')):
        return f"Term '{feature_name}' is often used in sensationalized content"
    else:
        return f"This term appears frequently in the analyzed text category"

def enhance_feature_details(features, text):
    """Enhance the feature details with context from the text"""
    enhanced_features = []
    
    for feature in features:
        term = feature['term']
        weight = feature['weight']
        
        # Find the actual context in the original text
        pattern = re.compile(r'[^.!?]*\b' + re.escape(term) + r'\b[^.!?]*[.!?]?', re.IGNORECASE)
        match = pattern.search(text)
        context = match.group(0).strip() if match else None
        
        # Determine if this feature indicates credibility or skepticism
        is_credibility_indicator = any(term.startswith(credibility_term) for credibility_term in 
                                     ['according', 'research', 'study', 'report', 'data', 'evidence', 'expert'])
        
        is_skepticism_indicator = any(term.startswith(skepticism_term) for skepticism_term in
                                    ['secret', 'shocking', 'reveal', 'unbelievable', 'miracle', 'exclusive',
                                     'conspiracy', 'anonymous', 'bombshell', 'leak'])
        
        # Create an enhanced feature
        enhanced_feature = {
            'term': term,
            'weight': float(weight),
            'explanation': explain_feature(term),
            'effect': 'CREDIBILITY' if is_credibility_indicator else 
                     'SKEPTICISM' if is_skepticism_indicator else 'NEUTRAL',
        }
        
        if context:
            enhanced_feature['context'] = context
            
        enhanced_features.append(enhanced_feature)
    
    return enhanced_features

class FakeNewsClassifier:
    def __init__(self):
        self.pipeline = None
        self.calibrated_classifier = None
        
    def train_model(self, save=True):
        """Train an enhanced fake news classification model with optimized parameters"""
        print("Training advanced fake news classification model...")
        
        # Prepare training data
        X = fake_news_texts + real_news_texts + opinion_texts + satire_texts + clickbait_texts
        # 1 for fake, 0 for real, 2 for opinion, 3 for satire, 4 for clickbait
        y = ([1] * len(fake_news_texts) + 
             [0] * len(real_news_texts) + 
             [2] * len(opinion_texts) + 
             [3] * len(satire_texts) + 
             [4] * len(clickbait_texts))
        
        # Binary labels for fake vs real classification
        y_binary = ([1] * len(fake_news_texts) + 
                    [0] * len(real_news_texts) + 
                    [0] * len(opinion_texts) + 
                    [1] * len(satire_texts) + 
                    [1] * len(clickbait_texts))
        
        # Preprocess all texts
        X = [preprocess_text(text) for text in X]
        
        # Split data into training and testing sets
        X_train, X_test, y_train, y_test, y_binary_train, y_binary_test = train_test_split(
            X, y, y_binary, test_size=0.2, random_state=42, stratify=y
        )
        
        # Create a pipeline with TF-IDF, feature selection, and MultinomialNB
        self.pipeline = Pipeline([
            ('vectorizer', TfidfVectorizer(
                stop_words='english',
                ngram_range=(1, 2),
                max_features=5000,
                sublinear_tf=True,
                min_df=2
            )),
            ('feature_selection', SelectKBest(chi2, k=2500)),
            ('classifier', MultinomialNB(alpha=0.1))
        ])
        
        # Train the model
        self.pipeline.fit(X_train, y_binary_train)
        
        # Calibrate the classifier for better probability estimates
        base_classifier = self.pipeline
        self.calibrated_classifier = CalibratedClassifierCV(base_estimator=base_classifier, cv='prefit')
        self.calibrated_classifier.fit(X_test, y_binary_test)
        
        # Evaluate the model
        train_accuracy = self.pipeline.score(X_train, y_binary_train)
        test_accuracy = self.pipeline.score(X_test, y_binary_test)
        calibrated_accuracy = self.calibrated_classifier.score(X_test, y_binary_test)
        
        print(f"Model training accuracy: {train_accuracy:.4f}")
        print(f"Model testing accuracy: {test_accuracy:.4f}")
        print(f"Calibrated model accuracy: {calibrated_accuracy:.4f}")
        
        if save:
            # Save the trained models
            os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
            with open(MODEL_PATH, 'wb') as f:
                pickle.dump({
                    'pipeline': self.pipeline,
                    'calibrated': self.calibrated_classifier
                }, f)
            print(f"Model saved to {MODEL_PATH}")
        
        return self.pipeline
    
    def load_model(self):
        """Load the pretrained model if it exists"""
        if os.path.exists(MODEL_PATH):
            print(f"Loading model from {MODEL_PATH}")
            try:
                with open(MODEL_PATH, 'rb') as f:
                    models = pickle.load(f)
                    if isinstance(models, dict):
                        self.pipeline = models['pipeline']
                        self.calibrated_classifier = models.get('calibrated', None)
                    else:
                        # For backward compatibility with older saved models
                        self.pipeline = models
                return True
            except Exception as e:
                print(f"Error loading model: {e}")
                return False
        return False
    
    def classify(self, text):
        """Classify a news text as fake or real with enhanced insights"""
        if self.pipeline is None:
            if not self.load_model():
                self.train_model()
        
        # If text is too short, return uncertain result
        if len(text) < 20:
            return {
                "fakeProbability": 50.0,  # Neutral probability
                "isLikelyFake": None,     # Uncertain
                "confidence": 10.0,        # Very low confidence
                "contentType": "UNKNOWN",
                "keyFeatures": [],
                "readabilityMetrics": calculate_readability_metrics(text),
                "message": "Text is too short for reliable analysis"
            }
        
        # Preprocess the input text
        processed_text = preprocess_text(text)
        
        # Make prediction
        if self.calibrated_classifier:
            # Use the calibrated model for better probabilities
            prob = self.calibrated_classifier.predict_proba([processed_text])[0]
        else:
            # Fall back to the base model if calibrated isn't available
            prob = self.pipeline.predict_proba([processed_text])[0]
            
        fake_probability = prob[1]  # Probability of being fake news
        
        # Calculate confidence based on distance from 0.5 but with a curve
        # that reduces confidence for middling values
        raw_confidence = abs(fake_probability - 0.5) * 2  # 0-1 scale
        
        # Apply sigmoid curve to emphasize high and low values
        # This will make values near 0.5 have even lower confidence
        confidence = 100 * (1 / (1 + math.exp(-10 * (raw_confidence - 0.5))))
        
        # For mid-range probabilities (0.4-0.6), reduce confidence further
        if 0.4 <= fake_probability <= 0.6:
            confidence = confidence * 0.7
        
        # Extract top features that contributed to this classification
        feature_analysis = self._analyze_features(processed_text)
        
        # Enhance feature details with context
        enhanced_features = enhance_feature_details(feature_analysis, text)
        
        # Detect patterns in the text
        fake_patterns = detect_pattern_matches(text, fake_news_patterns)
        real_patterns = detect_pattern_matches(text, real_news_patterns)
        
        # Check for source citations which improve credibility
        has_source_citation = any(pattern in text.lower() for pattern in source_citation_patterns)
        
        # Determine content type
        content_type = detect_content_type(text)
        
        # Adjust probability and confidence based on content type and patterns
        if content_type == 'OPINION':
            if fake_probability > 0.6:  # If it was classified as likely fake
                fake_probability = max(0.55, fake_probability * 0.8)  # Reduce fakeness
                confidence = min(confidence, 70)  # Cap confidence
            message = "This appears to be an opinion piece rather than straight news reporting."
            
        elif content_type == 'SATIRE' or content_type == 'POTENTIAL_SATIRE':
            message = "This may be satirical or humorous content rather than meant to be taken as factual news."
            confidence = min(confidence, 75)  # Cap confidence for satire
            
        elif content_type == 'CLICKBAIT':
            # Increase fake probability for clickbait
            fake_probability = min(0.95, fake_probability * 1.3)
            message = "This displays characteristics of clickbait content designed to attract attention."
            
        elif len(fake_patterns) >= 3:
            # Lots of fake news patterns, increase probability
            fake_probability = min(0.95, fake_probability * 1.2)
            confidence = min(100, confidence * 1.1)
            message = "Contains multiple linguistic patterns commonly found in false or misleading content."
            
        elif len(real_patterns) >= 2 and has_source_citation:
            # Has real news patterns and citations, decrease fake probability
            fake_probability = max(0.05, fake_probability * 0.8)
            confidence = min(100, confidence * 1.1)
            message = "Contains attribution and language patterns consistent with credible reporting."
            
        else:
            message = "Analysis based on linguistic features and content patterns."
        
        # Readability metrics
        readability_metrics = calculate_readability_metrics(text)
        
        # Compile all pattern matches for the result
        pattern_analysis = {
            "fakeNewsPatterns": [{"category": k, "matches": v} for k, v in fake_patterns.items()] if fake_patterns else [],
            "credibleNewsPatterns": [{"category": k, "matches": v} for k, v in real_patterns.items()] if real_patterns else [],
            "hasSourceCitation": has_source_citation
        }
        
        return {
            "fakeProbability": float(fake_probability * 100),  # Convert to percentage
            "isLikelyFake": bool(fake_probability > 0.5),
            "confidence": float(min(100, max(0, confidence))),
            "contentType": content_type,
            "keyFeatures": enhanced_features,
            "readabilityMetrics": readability_metrics,
            "patternAnalysis": pattern_analysis,
            "message": message
        }
    
    def _analyze_features(self, text):
        """Extract top features that contributed to classification"""
        try:
            # Get the vectorizer and classifier from the pipeline
            vectorizer = self.pipeline.named_steps['vectorizer']
            
            # Transform text to feature vector
            feature_vector = vectorizer.transform([text])
            
            # Get feature names
            feature_names = vectorizer.get_feature_names_out()
            
            # Get non-zero features from the vector
            nonzero_features = feature_vector.nonzero()[1]
            
            # If there are features, get the top 5
            if len(nonzero_features) > 0:
                # Get feature values
                feature_values = feature_vector.data
                
                # Create list of (feature_name, value) tuples
                features = [(feature_names[i], feature_values[j]) 
                           for j, i in enumerate(nonzero_features)]
                
                # Sort by value (importance)
                features.sort(key=lambda x: x[1], reverse=True)
                
                # Return top 5 features
                return [{"term": f[0], "weight": float(f[1])} for f in features[:5]]
            
            return []
        except Exception as e:
            print(f"Error analyzing features: {e}")
            return []

def main():
    """Main function for running the script directly or from Node.js"""
    classifier = FakeNewsClassifier()
    
    # If no arguments, train the model and exit
    if len(sys.argv) == 1:
        classifier.train_model()
        print("Model training complete")
        return
    
    # If arguments provided, treat as text to classify
    text = " ".join(sys.argv[1:])
    result = classifier.classify(text)
    
    # Print JSON result for Node.js to parse
    print(json.dumps(result))

if __name__ == "__main__":
    main()