# Google API Keys Setup Guide

This guide shows you where to add your Google API keys for the Landmark Identifier feature.

## Option 1: Add to .env File (Recommended)

Add the following environment variables to your `.env` file in the `Server` directory:

```env
# Google API Keys for Landmark Identification
# You can use the same key for all three, or separate keys for better quota management

# General Google API Key (used as fallback if specific keys are not provided)
GOOGLE_API_KEY=your_general_google_api_key_here

# Google Cloud Vision API Key (for landmark detection from images)
GOOGLE_VISION_API_KEY=your_vision_api_key_here

# Google Places API Key (for verifying and finding nearby places)
GOOGLE_PLACES_API_KEY=your_places_api_key_here

# TextRazor API Key (for automatic topic/hashtag extraction from posts)
TEXTRAZOR_API_KEY=your_textrazor_api_key_here
```

## TextRazor API Setup

TextRazor is used to automatically extract topics from community posts and add them as hashtags.

### How to Get TextRazor API Key

1. Go to [TextRazor](https://www.textrazor.com/)
2. Sign up for a free account
3. Navigate to your dashboard
4. Copy your API key from the dashboard
5. Add it to your `.env` file as `TEXTRAZOR_API_KEY`

### How It Works

- When a user creates a post with text, the text is automatically sent to TextRazor API
- TextRazor extracts 1-2 topics with score 1 from the text
- These topics are automatically added as hashtags at the end of the post on a new line
- Example: If the post mentions "Minar-e-Pakistan", it will automatically add `#MinarePakistan` at the end

### Location of .env File
- **Path**: `Server/.env`
- If the file doesn't exist, create it in the `Server` directory

### Notes:
- If you only have one API key, you can set all three to the same value
- If `GOOGLE_VISION_API_KEY` is not set, it will fall back to `GOOGLE_API_KEY`
- If `GOOGLE_PLACES_API_KEY` is not set, it will fall back to `GOOGLE_API_KEY`
- Make sure your API keys have the following enabled:
  - **Vision API**: Cloud Vision API enabled
  - **Places API**: Places API (New) or Places API enabled

## Option 2: Add via Admin Settings Panel

You can also add the API keys through the admin settings panel:

1. Log in as admin
2. Go to Settings page
3. Find the "API Configuration" section
4. Enter your API keys in the respective fields:
   - Google API Key
   - Google Vision API Key (optional)
   - Google Places API Key (optional)

The admin panel will automatically sync these values to your `.env` file.

## How to Get API Keys

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the required APIs:
   - **Cloud Vision API** (for landmark detection)
   - **Places API** (for location verification)
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy your API key
6. (Optional) Restrict the API key to specific APIs for security

## Required API Permissions

Make sure your API keys have access to:
- ✅ Cloud Vision API
- ✅ Places API (New) or Places API

## Testing

After adding your API keys:

1. Restart your server
2. Try identifying a landmark through the `/landmark` page
3. Check server logs for any API key errors

## Security Notes

- ⚠️ Never commit your `.env` file to version control
- ⚠️ Keep your API keys secure and don't share them publicly
- ⚠️ Consider restricting your API keys to specific IPs or domains in production
- ⚠️ Monitor your API usage in Google Cloud Console

## Troubleshooting

If you get API key errors:

1. Verify the keys are correctly set in `.env` file (no extra spaces or quotes)
2. Check that the APIs are enabled in Google Cloud Console
3. Verify your API key restrictions allow the requests
4. Check server logs for detailed error messages

