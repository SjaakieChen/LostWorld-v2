# Gemini 2.5 Flash Image API Reference

## How Image Output Works

The Gemini 2.5 Flash Image model (aka "Nano Banana") returns generated images as **base64-encoded data** embedded directly in the API response.

## Response Structure

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "inline_data": {
              "mime_type": "image/png",
              "data": "iVBORw0KGgoAAAANSUhEUgAA..."
            }
          }
        ]
      }
    }
  ]
}
```

## Extracting the Image

### JavaScript Example

```javascript
const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
});

const data = await response.json();
const parts = data.candidates[0].content.parts;

// Find the image data
let imageBase64 = null;
for (const part of parts) {
    if (part.inline_data?.data || part.inlineData?.data) {
        imageBase64 = part.inline_data?.data || part.inlineData?.data;
    }
}
```

## Displaying the Image

### In HTML

```html
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." alt="Generated image">
```

### Dynamically in JavaScript

```javascript
const imgElement = document.createElement('img');
imgElement.src = `data:image/png;base64,${imageBase64}`;
document.body.appendChild(imgElement);
```

## Downloading the Image

```javascript
function downloadImage(base64Data) {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64Data}`;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
```

## Request Format

### Basic Image Generation

```javascript
{
  "contents": [{
    "parts": [{
      "text": "A serene landscape with mountains and a lake"
    }]
  }],
  "generationConfig": {
    "temperature": 1.0,
    "topK": 40,
    "topP": 0.95
  }
}
```

## Response Types

The model can return:
1. **Image only** - Just the inline_data with base64 image
2. **Image + text** - Both inline_data (image) and text (description)
3. **Text only** - Just text (if image generation fails or isn't appropriate)

Always check all `parts` in the response to handle all cases.

## Important Notes

### Base64 Format
- Images are typically PNG format
- Data is base64-encoded binary
- No external URLs are provided
- Images are embedded directly in response

### MIME Types
- Usually `image/png`
- Could also be `image/jpeg`
- Check `mime_type` in response if needed

### Response Size
- Base64-encoded images can be large (500KB - 2MB+)
- Factor this into response time expectations
- Consider network bandwidth

### API Key Naming Variations
The API might use either:
- `inline_data` (snake_case)
- `inlineData` (camelCase)

Always check both formats:
```javascript
const imageData = part.inline_data?.data || part.inlineData?.data;
```

## Error Handling

```javascript
if (!imageBase64 && !textContent) {
    // No image or text was generated
    console.error('Empty response from API');
}

if (textContent && !imageBase64) {
    // Model returned text instead of image
    // Might need to refine prompt
    console.log('Text response:', textContent);
}
```

## Best Practices

### 1. Prompt Engineering
Be specific with prompts:
- ✅ "A photorealistic portrait of an elderly craftsman"
- ❌ "A person"

### 2. Handle Both Response Types
Always check for both image and text in the response.

### 3. Validate Base64 Data
```javascript
if (imageBase64 && imageBase64.length > 0) {
    // Valid image data
}
```

### 4. Add Loading States
Image generation takes 3-10 seconds:
```javascript
showLoadingIndicator();
const result = await generateImage(prompt);
hideLoadingIndicator();
```

### 5. Console Logging
Log the full response during testing:
```javascript
console.log('API Response:', data);
```

## Complete Working Example

```javascript
async function generateAndDisplayImage(prompt) {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        }
    );
    
    const data = await response.json();
    const parts = data.candidates[0].content.parts;
    
    for (const part of parts) {
        if (part.inline_data?.data) {
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${part.inline_data.data}`;
            document.body.appendChild(img);
            return;
        }
    }
    
    console.error('No image generated');
}
```

## Troubleshooting

### Image Won't Display
1. Check browser console for errors
2. Verify base64 data is not empty
3. Check MIME type is correct
4. Ensure data URI format is correct

### Getting Text Instead of Images
1. Make prompt more explicit: "Generate an image of..."
2. Be more descriptive with visual details
3. Specify artistic style and composition

### Response Too Slow
1. Image generation takes time (3-10s is normal)
2. Check network connection
3. Consider caching frequently generated images

## References

- [Google AI Gemini API Docs](https://ai.google.dev/gemini-api/docs/image-generation)
- [Base64 Image Format](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs)
- [HTML Image Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img)

