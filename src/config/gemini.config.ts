// Google Gemini API Configuration
export const GEMINI_CONFIG = {
  models: {
    flashLite: 'gemini-2.5-flash-lite',
    flashImage: 'gemini-2.5-flash-image',
  },
  apiBase: 'https://generativelanguage.googleapis.com/v1beta/models',
} as const

// Get API key from environment
export const getApiKey = (): string => {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) {
    throw new Error('VITE_GEMINI_API_KEY not found in environment variables')
  }
  return key
}

