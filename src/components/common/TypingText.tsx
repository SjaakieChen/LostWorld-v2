import { useState, useEffect } from 'react'
import { parseMarkdown } from '../../utils/markdown'

interface TypingTextProps {
  text: string
  speed?: number // Characters per second (default: 40)
  onComplete?: () => void
}

/**
 * TypingText component - displays text letter by letter with animation
 * Supports markdown parsing for the displayed portion
 */
export function TypingText({ text, speed = 200, onComplete }: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    if (!text) {
      onComplete?.()
      return
    }

    setDisplayedText('')

    const delay = 1000 / speed // Milliseconds per character
    let currentIndex = 0

    const timer = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.substring(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(timer)
        onComplete?.()
      }
    }, delay)

    return () => clearInterval(timer)
  }, [text, speed, onComplete])

  // Parse and render markdown for the displayed text
  return <>{parseMarkdown(displayedText)}</>
}

