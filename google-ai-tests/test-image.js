// Google Gemini 2.5 Flash Image (Nano Banana) Testing

const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
const IMAGE_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Generate an image using Gemini 2.5 Flash Image model
 * @param {string} prompt - The image description prompt
 * @returns {Promise<Object>} Response object with image data and timing
 */
async function generateImage(prompt) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${IMAGE_API_BASE_URL}/${GEMINI_IMAGE_MODEL}:generateContent?key=${API_KEY}`;
    
    // Request body for image generation
    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: 1.0,
            topK: 40,
            topP: 0.95,
        }
    };

    const startTime = performance.now();
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('API Response:', data); // Debug log
        
        // Extract image data from response
        // The response can contain multiple parts - text and/or images
        const parts = data.candidates?.[0]?.content?.parts || [];
        
        let imageBase64 = null;
        let textContent = null;
        
        // Look through all parts for image data
        for (const part of parts) {
            // Check for inline_data or inlineData (API might use either format)
            if (part.inline_data?.data || part.inlineData?.data) {
                imageBase64 = part.inline_data?.data || part.inlineData?.data;
                console.log('Found image data in response');
            } else if (part.text) {
                textContent = part.text;
            }
        }
        
        return {
            imageBase64,
            textContent,
            responseTime: responseTime.toFixed(2),
            error: false
        };
    } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        return {
            imageBase64: null,
            textContent: `Error: ${error.message}`,
            responseTime: responseTime.toFixed(2),
            error: true
        };
    }
}

/**
 * Test image generation with Gemini
 */
async function testImageGeneration() {
    const prompt = document.getElementById('imagePrompt').value;
    if (!prompt) {
        alert('Please enter an image prompt');
        return;
    }

    showLoading();
    
    const imageContainer = document.getElementById('imageContainer');
    imageContainer.innerHTML = '<p class="placeholder">Generating image...</p>';
    document.getElementById('imageTime').textContent = 'Response Time: Processing...';

    const result = await generateImage(prompt);
    
    document.getElementById('imageTime').textContent = `Response Time: ${result.responseTime}ms`;
    
    if (result.error) {
        imageContainer.innerHTML = `<p class="error-text">${result.textContent}</p>`;
        document.getElementById('imageResult').classList.add('error');
    } else {
        document.getElementById('imageResult').classList.remove('error');
        
        // Display the generated image if we have base64 data
        if (result.imageBase64) {
            imageContainer.innerHTML = `
                <div class="generated-image-wrapper">
                    <img src="data:image/png;base64,${result.imageBase64}" 
                         alt="Generated image" 
                         class="generated-image"
                         onload="console.log('Image loaded successfully')"
                         onerror="console.error('Failed to load image')">
                    ${result.textContent ? `<p class="image-caption">${result.textContent}</p>` : ''}
                    <button onclick="downloadImage('${result.imageBase64}')" class="download-btn">
                        Download Image
                    </button>
                </div>
            `;
        } else if (result.textContent) {
            // If no image was generated, show the text response
            imageContainer.innerHTML = `
                <div class="text-response">
                    <h4>Response:</h4>
                    <p>${result.textContent}</p>
                    <div class="note">
                        <strong>Note:</strong> The model returned text instead of an image. 
                        Try being more specific with your prompt, like "Generate an image of..." or 
                        "Create a picture showing..."
                    </div>
                </div>
            `;
        } else {
            imageContainer.innerHTML = `
                <p class="error-text">No image or text was generated. Please try a different prompt.</p>
            `;
        }
    }
    
    hideLoading();
}

/**
 * Alternative: Generate image using DALL-E style prompt enhancement
 * This function creates an enhanced prompt that could be used with actual image generation APIs
 */
async function enhanceImagePrompt() {
    const prompt = document.getElementById('imagePrompt').value;
    if (!prompt) {
        alert('Please enter an image prompt');
        return;
    }

    showLoading();
    
    const endpoint = `${IMAGE_API_BASE_URL}/${GEMINI_IMAGE_MODEL}:generateContent?key=${API_KEY}`;
    
    const requestBody = {
        contents: [{
            parts: [{
                text: `You are an expert at writing detailed image generation prompts. 
                
Given this simple prompt: "${prompt}"

Create an enhanced, detailed prompt suitable for an AI image generator. Include:
- Specific visual details
- Artistic style
- Lighting and atmosphere
- Color palette
- Composition details

Enhanced prompt:`
            }]
        }]
    };

    const startTime = performance.now();
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        const enhancedPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        const imageContainer = document.getElementById('imageContainer');
        imageContainer.innerHTML = `
            <div class="enhanced-prompt">
                <h4>Enhanced Image Prompt:</h4>
                <p>${enhancedPrompt}</p>
                <button onclick="copyToClipboard(\`${enhancedPrompt.replace(/`/g, '\\`')}\`)">
                    Copy Enhanced Prompt
                </button>
            </div>
        `;
        
        document.getElementById('imageTime').textContent = `Response Time: ${responseTime.toFixed(2)}ms`;
        
    } catch (error) {
        const imageContainer = document.getElementById('imageContainer');
        imageContainer.innerHTML = `<p class="error-text">Error: ${error.message}</p>`;
    }
    
    hideLoading();
}

/**
 * Download the generated image
 * @param {string} base64Data - The base64 encoded image data
 */
function downloadImage(base64Data) {
    try {
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${base64Data}`;
        link.download = `gemini-generated-${Date.now()}.png`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Image download initiated');
    } catch (error) {
        console.error('Failed to download image:', error);
        alert('Failed to download image. Please try again.');
    }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Enhanced prompt copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

