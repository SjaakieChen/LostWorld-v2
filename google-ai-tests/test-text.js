// Google Gemini API Text Generation Testing

const GEMINI_PRO_MODEL = 'gemini-2.5-pro';
const GEMINI_FLASH_MODEL = 'gemini-2.5-flash';
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Generate text using a specific Gemini model
 * @param {string} prompt - The text prompt
 * @param {string} model - The model name (gemini-pro or gemini-flash)
 * @returns {Promise<Object>} Response object with text and timing
 */
async function generateText(prompt, model) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${API_BASE_URL}/${model}:generateContent?key=${API_KEY}`;
    
    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
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
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        // Extract text from response
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
        
        return {
            text,
            responseTime: responseTime.toFixed(2),
            model
        };
    } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        return {
            text: `Error: ${error.message}`,
            responseTime: responseTime.toFixed(2),
            model,
            error: true
        };
    }
}

/**
 * Test Gemini Pro model
 */
async function testGeminiPro() {
    const prompt = document.getElementById('textPrompt').value;
    if (!prompt) {
        alert('Please enter a prompt');
        return;
    }

    showLoading();
    document.getElementById('proContent').textContent = 'Generating response...';
    document.getElementById('proTime').textContent = 'Response Time: Processing...';

    const result = await generateText(prompt, GEMINI_PRO_MODEL);
    
    document.getElementById('proContent').textContent = result.text;
    document.getElementById('proTime').textContent = `Response Time: ${result.responseTime}ms`;
    
    if (result.error) {
        document.getElementById('proResult').classList.add('error');
    } else {
        document.getElementById('proResult').classList.remove('error');
    }
    
    hideLoading();
}

/**
 * Test Gemini Flash model
 */
async function testGeminiFlash() {
    const prompt = document.getElementById('textPrompt').value;
    if (!prompt) {
        alert('Please enter a prompt');
        return;
    }

    showLoading();
    document.getElementById('flashContent').textContent = 'Generating response...';
    document.getElementById('flashTime').textContent = 'Response Time: Processing...';

    const result = await generateText(prompt, GEMINI_FLASH_MODEL);
    
    document.getElementById('flashContent').textContent = result.text;
    document.getElementById('flashTime').textContent = `Response Time: ${result.responseTime}ms`;
    
    if (result.error) {
        document.getElementById('flashResult').classList.add('error');
    } else {
        document.getElementById('flashResult').classList.remove('error');
    }
    
    hideLoading();
}

/**
 * Test both models simultaneously and compare
 */
async function testBothModels() {
    const prompt = document.getElementById('textPrompt').value;
    if (!prompt) {
        alert('Please enter a prompt');
        return;
    }

    showLoading();
    
    // Reset displays
    document.getElementById('proContent').textContent = 'Generating response...';
    document.getElementById('proTime').textContent = 'Response Time: Processing...';
    document.getElementById('flashContent').textContent = 'Generating response...';
    document.getElementById('flashTime').textContent = 'Response Time: Processing...';

    // Run both requests in parallel
    const [proResult, flashResult] = await Promise.all([
        generateText(prompt, GEMINI_PRO_MODEL),
        generateText(prompt, GEMINI_FLASH_MODEL)
    ]);

    // Display Pro results
    document.getElementById('proContent').textContent = proResult.text;
    document.getElementById('proTime').textContent = `Response Time: ${proResult.responseTime}ms`;
    if (proResult.error) {
        document.getElementById('proResult').classList.add('error');
    } else {
        document.getElementById('proResult').classList.remove('error');
    }

    // Display Flash results
    document.getElementById('flashContent').textContent = flashResult.text;
    document.getElementById('flashTime').textContent = `Response Time: ${flashResult.responseTime}ms`;
    if (flashResult.error) {
        document.getElementById('flashResult').classList.add('error');
    } else {
        document.getElementById('flashResult').classList.remove('error');
    }

    hideLoading();

    // Log comparison
    if (!proResult.error && !flashResult.error) {
        console.log('=== Model Comparison ===');
        console.log(`Gemini Pro: ${proResult.responseTime}ms`);
        console.log(`Gemini Flash: ${flashResult.responseTime}ms`);
        const speedDiff = ((parseFloat(proResult.responseTime) - parseFloat(flashResult.responseTime)) / parseFloat(proResult.responseTime) * 100).toFixed(1);
        console.log(`Speed difference: ${speedDiff}%`);
    }
}

