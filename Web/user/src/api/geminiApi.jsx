import api from "./api.jsx";

/**
 * Generate content using Google Gemini API
 * @param {string} prompt - The prompt/question to send to Gemini
 * @param {string} model - Gemini model to use (default: 'gemini-pro')
 * @param {number} temperature - Temperature for generation (default: 0.7)
 * @returns {Promise} API response
 */
export const generateGeminiContent = (prompt, model = 'gemini-2.5-flash-lite', temperature = 0.7) => {
  return api.post("/gemini/generate", {
    prompt,
    model,
    temperature
  });
};

