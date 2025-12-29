import axios from 'axios';
import { getGoogleGeminiAPIKey } from '../utils/settingsHelper.js';

/**
 * Generate content using Google Gemini API
 * @param {string} prompt - The prompt/question to send to Gemini
 * @param {object} options - Additional options (model, temperature, etc.)
 * @returns {Promise} Gemini API response
 */
export const generateGeminiContent = async (req, res) => {
  try {
    const { prompt, model = 'gemini-2.5-flash-lite', temperature = 0.7 } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: 'Prompt is required',
        message: 'Please provide a prompt/question'
      });
    }

    const geminiApiKey = await getGoogleGeminiAPIKey();

    if (!geminiApiKey) {
      return res.status(500).json({
        error: 'API key not configured',
        message: 'Google Gemini API key is required'
      });
    }

    // Use Gemini API v1beta
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    const response = await axios.post(geminiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      const candidate = response.data.candidates[0];
      const content = candidate.content.parts[0].text;

      res.json({
        success: true,
        content: content,
        model: model,
        finishReason: candidate.finishReason
      });
    } else {
      return res.status(500).json({
        error: 'No response from Gemini',
        message: 'Gemini API did not return a valid response'
      });
    }
  } catch (error) {
    console.error('Error generating Gemini content:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.response?.data?.error?.message || error.message
    });
  }
};

