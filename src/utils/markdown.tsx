import React from 'react'

/**
 * Simple markdown parser for basic formatting
 * Supports: **bold**, *italic*, `code`, [links](url), and newlines
 * No dependencies needed - lightweight and safe
 */
export function parseMarkdown(text: string): React.ReactNode[] {
  if (!text) return ['']

  const parts: React.ReactNode[] = []
  let currentIndex = 0
  let key = 0

  // Pattern to match markdown: **bold**, *italic*, `code`, [link](url)
  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, type: 'bold' },
    { regex: /\*(.+?)\*/g, type: 'italic' },
    { regex: /`(.+?)`/g, type: 'code' },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' },
  ]

  // Find all matches
  const matches: Array<{ start: number; end: number; type: string; content: string; url?: string }> = []
  
  patterns.forEach(({ regex, type }) => {
    let match
    regex.lastIndex = 0 // Reset regex
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type,
        content: match[1] || match[2] || '',
        url: type === 'link' ? match[2] : undefined
      })
    }
  })

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start)

  // Remove overlapping matches (keep first match)
  const validMatches: typeof matches = []
  let lastEnd = 0
  for (const match of matches) {
    if (match.start >= lastEnd) {
      validMatches.push(match)
      lastEnd = match.end
    }
  }

  // Build React elements
  for (const match of validMatches) {
    // Add text before match
    if (match.start > currentIndex) {
      const beforeText = text.substring(currentIndex, match.start)
      if (beforeText) {
        parts.push(...splitNewlines(beforeText, key))
        key += beforeText.split('\n').length
      }
    }

    // Add formatted element
    switch (match.type) {
      case 'bold':
        parts.push(<strong key={key++}>{match.content}</strong>)
        break
      case 'italic':
        parts.push(<em key={key++}>{match.content}</em>)
        break
      case 'code':
        parts.push(<code key={key++} className="bg-gray-700 px-1 rounded">{match.content}</code>)
        break
      case 'link':
        parts.push(
          <a 
            key={key++} 
            href={match.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {match.content}
          </a>
        )
        break
    }

    currentIndex = match.end
  }

  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex)
    if (remainingText) {
      parts.push(...splitNewlines(remainingText, key))
    }
  }

  return parts.length > 0 ? parts : [text]
}

/**
 * Split text by newlines and wrap each line
 */
function splitNewlines(text: string, startKey: number): React.ReactNode[] {
  const lines = text.split('\n')
  const result: React.ReactNode[] = []
  
  lines.forEach((line, index) => {
    if (index > 0) {
      result.push(<br key={`br-${startKey + index}`} />)
    }
    if (line) {
      result.push(<span key={startKey + index}>{line}</span>)
    }
  })
  
  return result
}

