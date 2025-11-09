# Google AI Models Testing Suite

This is a browser-based testing environment for Google's Gemini AI models.

## Models Tested

1. **Gemini 2.5 Pro** - Advanced model with extended thinking capabilities for complex reasoning
2. **Gemini 2.5 Flash Lite** - Fast, lightweight model optimized for quick responses
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

### 5. Edit Generated Images

**After generating an image, you can edit it:**
- Enter editing instructions in the "Edit This Image" section
- Click "Edit Image" to apply your changes
- View original and edited images side-by-side
- Download both versions

**Example Editing Instructions:**
- Color/Style: "Make it black and white", "Add warm sunset tones", "Convert to watercolor style"
- Objects: "Add a rainbow in the sky", "Remove the background", "Add people walking"
- Atmosphere: "Make it nighttime", "Add fog", "Make it sunny and bright"

**How Editing Works:**
- The API receives both the original image (base64) and your text instructions
- Multimodal request: `{ parts: [{ inline_data: {...} }, { text: "..." }] }`
- Returns the edited image as base64 data
- You can edit the original multiple times or edit the edited result

### 6. Test Structured Output (Game Entities)

**Generate complete game entities with JSON + images:**
- Create Items, NPCs, and Locations for the Lost World RPG
- Uses JSON schemas to ensure type-safe output
- Two-model approach: Flash Lite for JSON, Flash Image for visuals
- Automatic validation of required fields
- Side-by-side display: JSON on left, image on right
- Download both JSON and image files

**How It Works:**
1. Enter a simple prompt (e.g., "create a legendary fire sword")
2. Flash Lite generates structured JSON matching TypeScript types
3. Flash Image creates visual from the description field
4. Base64 image injected into `image_url` field
5. Complete entity ready for game use

**Example Prompts:**
- Items: "Create a legendary fire sword", "Generate a rare healing potion"
- NPCs: "Create a wise old merchant", "Generate a hostile orc warrior"
- Locations: "Create a mystical forest", "Generate a dark dungeon entrance"

**See:** [STRUCTURED-OUTPUT-GUIDE.md](STRUCTURED-OUTPUT-GUIDE.md) for comprehensive documentation

## Features

- ✅ Side-by-side comparison of Gemini Pro vs Flash Lite
- ✅ Response time measurements
- ✅ Actual image generation (not just descriptions!)
- ✅ Image editing with natural language instructions
- ✅ Side-by-side comparison of original vs edited images
- ✅ Multiple editing iterations on same image
- ✅ **Structured JSON output with type schemas** ⭐ NEW
- ✅ **Game entity generation (Items, NPCs, Locations)** ⭐ NEW
- ✅ **Two-model workflow (JSON + Image)** ⭐ NEW
- ✅ **Automatic validation and type checking** ⭐ NEW
- ✅ Download generated and edited images
- ✅ Download generated JSON files
- ✅ Clean, modern UI with real-time feedback
- ✅ Error handling and status indicators
- ✅ Mobile responsive design
- ✅ Loading indicators during API calls

## API Endpoint Information

The test suite uses Google's official Generative Language API:
- Base URL: `https://generativelanguage.googleapis.com/v1beta/models`
- Authentication: API key passed as query parameter
- Models:
  - `gemini-2.5-pro` (Pro/Complex Reasoning)
  - `gemini-2.5-flash-lite` (Flash Lite/Quick & Lightweight)
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
├── index.html                    # Main test interface
├── test-text.js                  # Text generation logic
├── test-image.js                 # Image generation logic
├── test-structured.js            # Structured output & entity generation ⭐ NEW
├── styles.css                    # Styling
├── README.md                     # This file
├── QUICKSTART.md                 # Quick start guide
├── STRUCTURED-OUTPUT-GUIDE.md    # Comprehensive structured output docs ⭐ NEW
├── IMAGE-EDITING-GUIDE.md        # Image editing documentation
├── IMAGE-API-REFERENCE.md        # API reference for images
└── IMPLEMENTATION-SUMMARY.md     # Implementation overview
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

