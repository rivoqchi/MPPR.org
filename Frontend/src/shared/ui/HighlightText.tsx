import type { CSSProperties, ReactNode } from 'react'

const HIGHLIGHT_STYLE: CSSProperties = {
  backgroundColor: '#ffe58f',
  padding: '0 2px',
  borderRadius: 2,
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getSearchWords(query: string) {
  return query.trim().split(/\s+/).filter(Boolean)
}

interface HighlightTextProps {
  text: string
  query: string
}

export function HighlightText({ text, query }: HighlightTextProps): ReactNode {
  const words = getSearchWords(query)

  if (words.length === 0) {
    return text
  }

  const loweredWords = new Set(words.map((word) => word.toLowerCase()))
  const pattern = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi')
  const parts = text.split(pattern)

  return parts.map((part, index) =>
    loweredWords.has(part.toLowerCase()) ? (
      <mark key={index} style={HIGHLIGHT_STYLE}>
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    ),
  )
}
