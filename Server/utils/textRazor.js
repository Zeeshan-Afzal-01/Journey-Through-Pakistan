import axios from 'axios';

/**
 * Extract topics from text using TextRazor API
 * @param {string} text - The text to analyze
 * @returns {Promise<Array>} Array of topic objects with label, wikiLink, score
 */
export const extractTopicsFromText = async (text) => {
  try {
    // Try to get API key from environment or settings
    let textRazorApiKey = 'aab544a7a3cb7522318014a7cc314048d0bc28ec394c707024f08583';
    
    // If not in env, try to get from settings
    if (!textRazorApiKey) {
      try {
        const Settings = (await import('../models/settings.models.js')).default;
        const settings = await Settings.findOne();
        if (settings && settings.textRazorApiKey) {
          textRazorApiKey = settings.textRazorApiKey;
        }
      } catch (e) {
        // Settings not available, continue with env check
      }
    }
    
    if (!textRazorApiKey) {
      console.warn('TextRazor API key not configured, skipping topic extraction');
      return [];
    }

    if (!text || text.trim().length === 0) {
      return [];
    }

    // Call TextRazor API
    const response = await axios.post(
      'https://api.textrazor.com/',
      new URLSearchParams({
        text: text,
        extractors: 'topics,entities'
      }),
      {
        headers: {
          'X-TextRazor-Key': textRazorApiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    // Check if response is valid
    if (!response.data || !response.data.response) {
      console.warn('Invalid TextRazor response');
      return [];
    }

    const { topics, languageIsReliable } = response.data.response;

    // Only proceed if language is reliable
    if (!languageIsReliable) {
      console.warn('Language not reliable, skipping topic extraction');
      return [];
    }

    // Filter topics with score 1 and take only 1-2 topics
    const validTopics = (topics || [])
      .filter(topic => topic.score === 1)
      .slice(0, 2) // Take only first 2 topics
      .map(topic => ({
        label: topic.label,
        wikiLink: topic.wikiLink,
        score: topic.score,
        wikidataId: topic.wikidataId
      }));

    console.log(`Extracted ${validTopics.length} topics from text:`, validTopics.map(t => t.label));
    
    return validTopics;
  } catch (error) {
    console.error('Error extracting topics from TextRazor:', error.response?.data || error.message);
    // Don't fail the post creation if TextRazor fails
    return [];
  }
};

