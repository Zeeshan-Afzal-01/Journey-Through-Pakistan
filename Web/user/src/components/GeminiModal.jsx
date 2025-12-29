import React, { useState, useEffect } from 'react';
import { FiX, FiLoader, FiSend } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { generateGeminiContent } from '../api/geminiApi';
import '../assests/css/gemini-modal.css';

/**
 * Reusable Gemini Modal Component
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to call when modal is closed
 * @param {string} prompt - The prompt/question to send to Gemini (optional, for auto-fetch)
 * @param {string} title - Modal title (default: "AI Assistant")
 * @param {string} model - Gemini model to use (default: 'gemini-pro')
 * @param {number} temperature - Temperature for generation (default: 0.7)
 * @param {function} onResponse - Optional callback when response is received
 * @param {string} landmarkName - Name of the landmark for context (optional)
 * @param {boolean} autoFetch - Whether to automatically fetch response when modal opens (default: false)
 */
const GeminiModal = ({
  isOpen,
  onClose,
  prompt,
  title = "AI Assistant",
  model = 'gemini-2.5-flash-lite',
  temperature = 0.7,
  onResponse = null,
  landmarkName = null,
  autoFetch = false
}) => {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userQuestion, setUserQuestion] = useState('');

  useEffect(() => {
    if (isOpen && prompt && autoFetch) {
      fetchGeminiResponse(prompt);
    } else if (isOpen) {
      // Reset state when modal opens (but don't fetch)
      setResponse('');
      setError(null);
      setUserQuestion('');
    } else {
      // Reset state when modal closes
      setResponse('');
      setError(null);
      setUserQuestion('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prompt, autoFetch]);

  const fetchGeminiResponse = async (questionPrompt = null) => {
    const finalPrompt = questionPrompt || prompt;
    
    if (!finalPrompt || !finalPrompt.trim()) {
      setError('Please provide a question');
      return;
    }

    // Build the full prompt with landmark context if available
    let fullPrompt = finalPrompt;
    if (landmarkName && !finalPrompt.toLowerCase().includes(landmarkName.toLowerCase())) {
      fullPrompt = `About ${landmarkName}: ${finalPrompt}`;
    }

    setLoading(true);
    setError(null);
    setResponse('');

    try {
      const res = await generateGeminiContent(fullPrompt, model, temperature);
      
      if (res.data.success && res.data.content) {
        setResponse(res.data.content);
        
        // Call optional callback
        if (onResponse) {
          onResponse(res.data.content);
        }
      } else {
        setError('Failed to get response from AI');
      }
    } catch (err) {
      console.error('Error fetching Gemini response:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Failed to generate response. Please try again.'
      );
      toast.error('Failed to generate AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userQuestion.trim()) {
      fetchGeminiResponse(userQuestion);
    }
  };

  const formatResponse = (text) => {
    if (!text) return '';

    // Split by double newlines to create paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    return paragraphs.map((para, index) => {
      const trimmedPara = para.trim();
      if (!trimmedPara) return null;

      // Check if it's a heading (starts with # or is all caps short line)
      if (trimmedPara.startsWith('#')) {
        const level = trimmedPara.match(/^#+/)[0].length;
        const headingText = trimmedPara.replace(/^#+\s*/, '');
        const HeadingTag = `h${Math.min(level, 6)}`;
        return React.createElement(
          HeadingTag,
          { key: index, className: 'gemini-heading' },
          headingText
        );
      }

      // Check if it's a list item
      if (trimmedPara.match(/^[-*•]\s/)) {
        const items = trimmedPara.split(/\n/).filter(item => item.trim());
        return (
          <ul key={index} className="gemini-list">
            {items.map((item, itemIndex) => (
              <li key={itemIndex}>{item.replace(/^[-*•]\s/, '')}</li>
            ))}
          </ul>
        );
      }

      // Check if it's a numbered list
      if (trimmedPara.match(/^\d+\.\s/)) {
        const items = trimmedPara.split(/\n/).filter(item => item.trim());
        return (
          <ol key={index} className="gemini-list">
            {items.map((item, itemIndex) => (
              <li key={itemIndex}>{item.replace(/^\d+\.\s/, '')}</li>
            ))}
          </ol>
        );
      }

      // Regular paragraph
      return (
        <p key={index} className="gemini-paragraph">
          {trimmedPara.split('\n').map((line, lineIndex, array) => (
            <React.Fragment key={lineIndex}>
              {line}
              {lineIndex < array.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
    }).filter(Boolean);
  };

  if (!isOpen) return null;

  return (
    <div className="gemini-modal-overlay" onClick={onClose}>
      <div className="gemini-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="gemini-modal-header">
          <div className="d-flex align-items-center gap-2">
            
            <h5 className="mb-0">{title}</h5>
          </div>
          <button
            className="gemini-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FiX />
          </button>
        </div>

        {/* Content */}
        <div className="gemini-modal-body">
          {/* Input field for user questions */}
          {!loading && !response && (
            <form onSubmit={handleSubmit} className="mb-3">
              <div className="mb-3">
                <label htmlFor="gemini-question" className="form-label fw-semibold">
                  {landmarkName ? `Ask anything about ${landmarkName}` : 'Ask your question'}
                </label>
                <textarea
                  id="gemini-question"
                  className="form-control"
                  rows="3"
                  placeholder={landmarkName ? `e.g., What is the history of ${landmarkName}?` : "Type your question here..."}
                  value={userQuestion}
                  onChange={(e) => setUserQuestion(e.target.value)}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!userQuestion.trim() || loading}
              >
                <FiSend className="me-2" />
                Ask AI
              </button>
            </form>
          )}

          {loading && (
            <div className="gemini-loading">
              <FiLoader className="spinner" />
              <p>Generating response...</p>
            </div>
          )}

          {error && (
            <div className="gemini-error">
              <p className="text-danger">{error}</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => fetchGeminiResponse(userQuestion || prompt)}
              >
                <FiSend className="me-1" />
                Retry
              </button>
            </div>
          )}

          {!loading && !error && response && (
            <div className="gemini-response">
              {formatResponse(response)}
            </div>
          )}

          {response && !loading && (
            <div className="mt-3">
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => {
                  setResponse('');
                  setUserQuestion('');
                  setError(null);
                }}
              >
                Ask Another Question
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gemini-modal-footer">
          <button
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Close
          </button>
          {response && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                navigator.clipboard.writeText(response);
                toast.success('Response copied to clipboard!');
              }}
            >
              Copy Response
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeminiModal;

