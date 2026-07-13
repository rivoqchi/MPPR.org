import { describe, expect, it } from 'vitest'
import {
  dataUrlToBlob,
  guessMimeType,
  isPreviewableDocument,
} from '@/features/structural-unit/lib/document-utils'

describe('guessMimeType', () => {
  it('detects office and image extensions', () => {
    expect(guessMimeType('report.pdf')).toBe('application/pdf')
    expect(guessMimeType('table.xlsx')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    expect(guessMimeType('letter.docx')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    expect(guessMimeType('photo.png')).toBe('image/png')
  })
})

describe('isPreviewableDocument', () => {
  it('returns true for images and pdf', () => {
    expect(isPreviewableDocument('image/png')).toBe(true)
    expect(isPreviewableDocument('application/pdf')).toBe(true)
  })

  it('returns false for missing mime type', () => {
    expect(isPreviewableDocument(undefined)).toBe(false)
  })

  it('returns false for office files', () => {
    expect(
      isPreviewableDocument(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
    ).toBe(false)
  })
})

describe('dataUrlToBlob', () => {
  it('converts base64 data url to blob', () => {
    const blob = dataUrlToBlob('data:text/plain;base64,dGVzdA==')

    expect(blob).not.toBeNull()
    expect(blob?.type).toBe('text/plain')
  })
})
