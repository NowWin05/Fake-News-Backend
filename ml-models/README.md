# Python Machine Learning Model for Fake News Detection

This directory contains a pretrained machine learning model for fake news detection built with Python and scikit-learn.

## Requirements

- Python 3.6 or higher
- scikit-learn
- numpy

## How It Works

The model uses a simple yet effective approach to classify news articles as potentially fake or real:

1. A Naive Bayes classifier trained on word frequency features
2. Text is processed into a bag-of-words representation using CountVectorizer
3. The model returns probability scores and confidence levels

## Setup Instructions

1. Make sure Python 3 is installed on your system:

   ```
   python --version
   ```

2. Install required Python packages:

   ```
   pip install scikit-learn numpy
   ```

3. The model will be automatically trained on first use or you can manually train it:
   ```
   python fake_news_classifier.py
   ```

## Integration with Node.js

The model is called from the Node.js backend using child processes. The JavaScript code handles:

- Checking if Python is properly installed
- Training the model if needed
- Sending text to be classified
- Parsing the results returned by the Python script

## Model Details

- Algorithm: Multinomial Naive Bayes
- Features: Bag-of-words with English stop-word removal
- Training set: Small sample dataset included in the Python script
- Output: JSON object containing fake probability score and confidence level

## Extending the Model

To improve the model:

1. Replace the sample training data in `fake_news_classifier.py` with a larger dataset
2. Add more features like TF-IDF, n-grams, or named entity recognition
3. Experiment with different algorithms like Random Forest or neural networks
4. Use pre-trained language models for advanced text understanding

## Troubleshooting

If you encounter issues:

- Verify Python is correctly installed and in your PATH
- Check that scikit-learn and numpy are installed
- Ensure the model file is writable by the application
- Check Node.js logs for Python process errors
