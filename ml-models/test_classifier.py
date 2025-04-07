#!/usr/bin/env python3
# Test script for evaluating the fake news classifier

import json
from fake_news_classifier import FakeNewsClassifier

# Initialize classifier
classifier = FakeNewsClassifier()

# Test cases - real news examples with varying complexity and topics
real_news_test_cases = [
    # Legitimate news with factual reporting
    "Senate passes bipartisan infrastructure bill with 69 votes, sending package to House for consideration",
    
    # Scientific reporting
    "Study published in Nature finds correlation between diet and longevity based on data from 50,000 participants over 20 years",
    
    # Business news
    "Apple reports quarterly revenue of $81.4 billion, up 36 percent year over year due to strong iPhone sales",
    
    # Political reporting without sensationalism
    "President meets with foreign leaders to discuss climate change initiatives and economic partnerships",
    
    # Local news
    "City council approves new zoning regulations for downtown area after six months of public hearings"
]

# Test cases - fake news examples with typical characteristics
fake_news_test_cases = [
    # Conspiracy theory
    "BOMBSHELL: Government scientists admit vaccines contain mind-control microchips linked to 5G towers",
    
    # Health misinformation
    "Doctor reveals miracle cure for cancer that pharmaceutical companies have been hiding for decades",
    
    # Political conspiracy
    "LEAKED documents prove election was manipulated by secret international organization",
    
    # Sensationalist headline
    "You won't BELIEVE what this celebrity did to stay young - doctors are SHOCKED",
    
    # Fear-mongering
    "WARNING: Everyday household item found in 90% of homes linked to deadly disease outbreak"
]

# Mixed/ambiguous cases to test edge cases
ambiguous_test_cases = [
    # Opinion piece
    "Why the current economic policy might lead to problems in the future",
    
    # Satire
    "Local man declares himself ruler of backyard, establishes new constitutional monarchy",
    
    # Clickbait but possibly true
    "This surprising food may help reduce inflammation, according to new research",
    
    # Exaggerated but with some truth
    "Experts warn housing market could see dramatic shifts as interest rates change",
    
    # Political opinion with charged language
    "The administration's policies are destroying our economy and threatening our security"
]

def test_and_print_results(category, test_cases):
    print(f"\n=== Testing {category} cases ===\n")
    
    for i, test_case in enumerate(test_cases, 1):
        result = classifier.classify(test_case)
        
        # Enhanced output for better analysis
        print(f"Test #{i}: {'FAKE' if result['isLikelyFake'] else 'REAL'} ({result['fakeProbability']:.1f}%)")
        print(f"Text: {test_case[:100]}...")
        print(f"Confidence: {result['confidence']:.1f}%")
        print("Key features:")
        for feature in result['keyFeatures']:
            print(f"  - {feature['term']}: {feature['weight']:.4f}")
        print("-" * 80)
    
    print("\n")

# Run tests
print("Evaluating fake news classifier performance...\n")
test_and_print_results("REAL NEWS", real_news_test_cases)
test_and_print_results("FAKE NEWS", fake_news_test_cases)
test_and_print_results("AMBIGUOUS", ambiguous_test_cases)

print("Test complete.")