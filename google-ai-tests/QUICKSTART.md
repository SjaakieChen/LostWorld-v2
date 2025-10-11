# Quick Start Guide

## What's Been Implemented

✅ **Complete test environment** for Google's Gemini AI models in a separate folder
✅ **Browser-based interface** - no backend needed for testing
✅ **Three model tests:**
  - Gemini 2.0 Flash Thinking (for complex reasoning)
  - Gemini 2.0 Flash (for quick responses)  
  - Image generation capabilities

## How to Use Right Now

### Step 1: Open the Test Page
The test page should now be open in your browser. If not, double-click `index.html` in the `google-ai-tests` folder.

### Step 2: Enter Your API Key
1. Find the "API Configuration" section at the top
2. Paste your Google AI API key
3. Click "Save Key"

### Step 3: Test Text Generation

**Try these test prompts:**

**Simple Test (Fast):**
```
What is 2+2?
```

**Medium Test (Compare Speed):**
```
Explain quantum computing in simple terms
```

**Complex Test (See Thinking Model Shine):**
```
Analyze the philosophical implications of artificial consciousness and whether AI can truly be self-aware
```

**Comparison Test:**
- Click "Compare Both" to see both models respond to the same prompt
- Watch the response times - Flash should be faster
- Compare the depth of thinking - Thinking model may provide more detailed analysis

### Step 4: Test Image Generation

**Try these image prompts:**
```
A serene landscape with mountains, a lake, and sunset colors
```

```
A futuristic cyberpunk city with neon lights and flying cars
```

```
A photorealistic portrait of a craftsman inspecting pottery in warm light
```

**What to expect:**
- The model will generate an actual image (not just a description!)
- Images are returned as base64-encoded data
- The image displays directly in your browser
- You can download the generated image as a PNG file
- Response times typically 3-10 seconds depending on complexity

**How the image display works:**
1. API returns base64-encoded image data
2. Browser converts it to a data URI: `data:image/png;base64,{data}`
3. Image displays in an `<img>` tag
4. Download button lets you save it locally

## What Each File Does

- **index.html** - The main test interface you interact with
- **test-text.js** - Handles Gemini Pro and Flash text generation
- **test-image.js** - Handles image description generation
- **styles.css** - Makes everything look beautiful
- **README.md** - Detailed documentation
- **QUICKSTART.md** - This file!

## Expected Results

### Text Generation Performance:
- **Gemini Flash:** ~1000-3000ms for most prompts (very fast)
- **Gemini Thinking:** ~2000-5000ms for complex prompts (more thoughtful)

### Quality Differences:
- **Flash:** Quick, concise, accurate responses
- **Thinking:** More detailed analysis, considers multiple angles, better for complex tasks

## Troubleshooting

**"Please set your API key first"**
→ Enter and save your API key in the top section

**"API Error: ..."**
→ Check that your API key is valid
→ Make sure you have quota available
→ Verify you're online

**Nothing happens when clicking buttons**
→ Open browser console (F12) to see error messages
→ Check that JavaScript is enabled

## Next Steps After Testing

Once you've verified the models work:

1. **Decide which model to use** for different tasks in your main app:
   - Use Flash for quick responses (chat, simple queries)
   - Use Thinking for complex reasoning (analysis, planning)

2. **Plan integration** into your main Lost World game:
   - Consider using for NPC dialogue generation
   - Could power dynamic story/quest generation
   - Might enhance item descriptions

3. **Set up backend proxy** (for production):
   - Never expose API keys in frontend code
   - Create a backend endpoint that forwards requests
   - Implement rate limiting and caching

## Testing Checklist

- [ ] API key entered and saved
- [ ] Tested Gemini Flash with simple prompt
- [ ] Tested Gemini Thinking with complex prompt
- [ ] Compared both models side-by-side
- [ ] Tested image description generation
- [ ] Reviewed response times
- [ ] Checked quality differences
- [ ] Read browser console for any errors
- [ ] Ready to integrate into main project!

## Questions to Consider

After testing, think about:
- Which model feels right for your use case?
- Is the response time acceptable?
- Do you need streaming responses?
- How will you secure the API key in production?
- What rate limits do you need?

Happy testing! 🚀

