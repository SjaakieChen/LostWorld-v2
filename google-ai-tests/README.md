# Google AI Models Testing Suite

This is a browser-based testing environment for Google's Gemini AI models.

## Models Tested

1. **Gemini 2.5 Pro** - Advanced model with extended thinking capabilities for complex reasoning
2. **Gemini 2.5 Flash** - Fast model optimized for quick responses
3. **Gemini 2.5 Flash Image** - Image generation model (aka "Nano Banana") for creating and editing images

## Setup Instructions

### 1. Get Your API Key

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click on "Get API Key" to generate a new key
4. Copy your API key

### 2. Run the Test Suite

1. Open `index.html` in your web browser
2. Paste your API key in the "API Configuration" section
3. Click "Save Key"

### 3. Test Text Generation

**Test Individual Models:**
- Enter a prompt in the text area
- Click "Test Gemini Pro" to test the thinking model
- Click "Test Gemini Flash" to test the quick response model

**Compare Both Models:**
- Click "Compare Both" to run both models simultaneously
- Response times and outputs will be displayed side-by-side

**Suggested Test Prompts:**
- Simple: "What is 2+2?"
- Medium: "Explain quantum computing in simple terms"
- Complex: "Write a detailed analysis of the ethical implications of AI in healthcare"

### 4. Test Image Generation

**Generate Actual Images:**
- Enter an image description in the prompt field (e.g., "A serene landscape with mountains")
- Click "Generate Image" to create an actual image
- The model returns images as base64-encoded data
- Generated images are displayed directly in the browser
- Click "Download Image" to save the generated image

**How It Works:**
- The API returns the image as base64-encoded data in the response
- The image is extracted from `response.candidates[0].content.parts[].inline_data.data`
- The base64 data is displayed using a data URI: `data:image/png;base64,{base64Data}`
- Images can be downloaded as PNG files

**Tips for Better Results:**
- Be specific with your prompts
- Describe style, colors, composition, and mood
- Example: "A photorealistic portrait of an elderly craftsman in warm golden hour light"

## Features

- ✅ Side-by-side comparison of Gemini Pro vs Flash
- ✅ Response time measurements
- ✅ Clean, modern UI with real-time feedback
- ✅ Error handling and status indicators
- ✅ Mobile responsive design
- ✅ Loading indicators during API calls

## API Endpoint Information

The test suite uses Google's official Generative Language API:
- Base URL: `https://generativelanguage.googleapis.com/v1beta/models`
- Authentication: API key passed as query parameter
- Models:
  - `gemini-2.5-pro-thinking` (Pro/Thinking)
  - `gemini-2.5-flash` (Flash/Quick)
  - `gemini-2.5-flash-image` (Image Generation/Nano Banana)

## Security Notice

⚠️ **Important:** This test suite includes the API key directly in the browser code, which is **ONLY suitable for local testing**. 

**For production applications:**
- Never expose API keys in client-side code
- Set up a backend proxy server to handle API requests
- Use environment variables to store sensitive credentials
- Implement rate limiting and usage monitoring

## Troubleshooting

**"Please set your API key first" error:**
- Make sure you've entered and saved your API key in the configuration section

**API Error messages:**
- Check that your API key is valid
- Verify you have quota remaining on your Google AI account
- Ensure you're connected to the internet

**No response or slow responses:**
- Complex prompts take longer to process
- Check your network connection
- Verify the Google AI API is operational

## File Structure

```
google-ai-tests/
├── index.html          # Main test interface
├── test-text.js        # Text generation logic
├── test-image.js       # Image generation logic
├── styles.css          # Styling
└── README.md          # This file
```

## Next Steps

After testing the models here, you can:
1. Integrate the API calls into your main application
2. Set up a backend service to secure your API key
3. Implement more advanced features like streaming responses
4. Add conversation history and context management
5. Explore multimodal capabilities (text + images input)

## Resources

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [API Reference](https://ai.google.dev/api)
- [Model Comparison](https://ai.google.dev/models/gemini)

## Support

For issues with the Google AI API, visit:
- [Google AI Forum](https://discuss.ai.google.dev/)
- [Stack Overflow - Gemini Tag](https://stackoverflow.com/questions/tagged/gemini-api)

