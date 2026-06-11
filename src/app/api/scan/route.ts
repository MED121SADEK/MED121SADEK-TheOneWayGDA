import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    let imageData: string = ''
    let templateHint: string | undefined
    let retryMode = false

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided. Please upload a PDF, PNG, or JPG file.' },
          { status: 400 }
        )
      }

      const allowedTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/bmp',
        'image/tiff',
      ]
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.type}. Supported: PDF, PNG, JPG, JPEG, WEBP, BMP, TIFF` },
          { status: 400 }
        )
      }

      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 20MB.' },
          { status: 400 }
        )
      }

      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const mimeType = file.type === 'image/jpg' ? 'image/jpeg' : file.type
      imageData = `data:${mimeType};base64,${base64}`
      templateHint = formData.get('templateHint') as string | undefined
    } else {
      const body = await request.json()
      imageData = body.imageData
      templateHint = body.templateHint
      retryMode = body.retryMode === true

      if (!imageData) {
        return NextResponse.json(
          { error: 'No image data provided. Send imageData as base64 string.' },
          { status: 400 }
        )
      }
    }

    const zai = await ZAI.create()

    // Enhanced system prompt with better handling for unclear/fuzzy documents
    const systemPrompt = `You are an expert OCR and document analysis AI for "TheOneWayGDA" statistical analysis platform. Your job is to analyze document images and extract structured data.

IMPORTANT RULES:
1. **Be thorough**: Even if the image is slightly blurry or unclear, do your best to extract every visible piece of text and data.
2. **Never give up**: If you cannot read something clearly, mark it with lower confidence but still include it. Use context clues to guess unclear values.
3. **Preserve structure**: Maintain table layouts, headers, and row/column relationships.
4. **Handle fuzzy text**: For handwritten or printed text that is hard to read, provide your best interpretation with confidence < 0.7.

Analyze the document and extract:

1. **fields**: Individual labeled data fields. For each:
   - label: The field name/label from the document
   - value: The extracted value (your best interpretation even if uncertain)
   - confidence: 0.0-1.0 (be honest about uncertainty)
   - type: One of: "string", "numeric", "date", "currency", "percentage", "boolean", "id", "email", "phone"

2. **tables**: Tabular data. For each:
   - headers: Array of column header strings
   - rows: Array of arrays with cell values

3. **rawText**: ALL text extracted from the document, even if unstructured

4. **summary**: Brief description of what the document contains${retryMode ? '\n\nRETRY MODE: This document was not successfully parsed on the first attempt. Be EXTRA thorough this time. Look harder for any text, numbers, fields, tables, or data patterns. Extract EVERYTHING you can see.' : ''}

RESPOND ONLY WITH VALID JSON (no markdown fences):
{
  "fields": [{"label": "Name", "value": "extracted", "confidence": 0.9, "type": "string"}],
  "tables": [{"headers": ["Col1"], "rows": [["val1"]]}],
  "rawText": "All extracted text...",
  "summary": "Brief summary"
}`

    // First attempt
    let parsed = await attemptExtraction(zai, systemPrompt, imageData, templateHint)

    // If first attempt yields very few fields and rawText is available, try a second pass
    if (!retryMode && parsed && parsed.fields.length <= 1 && parsed.rawText && parsed.rawText.length > 20) {
      // Use the rawText as a fallback context for a second AI call to structure the data
      const structuringPrompt = `The following raw text was extracted from a document image. The OCR was unable to identify structured fields. Please analyze this raw text and extract any structured data you can find (fields, numbers, names, dates, tables, etc.).

Raw text:
"""
${parsed.rawText}
"""

Based on this text, extract structured fields and any tabular data you can identify. Be generous in your extraction - include anything that looks like data.

Respond ONLY with valid JSON:
{
  "fields": [{"label": "Field Name", "value": "value", "confidence": 0.7, "type": "string"}],
  "tables": [],
  "rawText": "${parsed.rawText.replace(/"/g, '\\"').slice(0, 3000)}",
  "summary": "Structured data extracted from document text"
}`

      const retryCompletion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a data structuring AI. Convert raw text into structured JSON fields. Be thorough and extract every piece of identifiable data.' },
          { role: 'user', content: structuringPrompt },
        ],
        max_tokens: 2048,
        temperature: 0.3,
      })

      const retryContent = retryCompletion.choices?.[0]?.message?.content
      if (retryContent) {
        try {
          const jsonStr = retryContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          const retryParsed = JSON.parse(jsonStr)
          if (retryParsed.fields && retryParsed.fields.length > parsed.fields.length) {
            parsed = {
              fields: retryParsed.fields.map((f: any) => ({
                label: String(f.label || ''),
                value: f.value ?? '',
                confidence: typeof f.confidence === 'number' ? Math.min(f.confidence, 0.8) : 0.6,
                type: f.type || 'string',
              })),
              tables: Array.isArray(retryParsed.tables)
                ? retryParsed.tables.map((t: any) => ({
                    headers: Array.isArray(t.headers) ? t.headers.map(String) : [],
                    rows: Array.isArray(t.rows) ? t.rows : [],
                  }))
                : parsed.tables || [],
              rawText: String(retryParsed.rawText || parsed.rawText),
              summary: String(retryParsed.summary || 'Data extracted via text analysis'),
            }
          }
        } catch {
          // Keep original parsed result if retry parsing fails
        }
      }
    }

    return NextResponse.json({
      fields: parsed?.fields || [],
      tables: parsed?.tables || [],
      rawText: parsed?.rawText || '',
      summary: parsed?.summary || '',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Scan API error:', message)
    return NextResponse.json(
      { error: 'Document scanning failed. Please try again with a clearer image or different format.' },
      { status: 500 }
    )
  }
}

async function attemptExtraction(
  zai: any,
  systemPrompt: string,
  imageData: string,
  templateHint?: string
): Promise<any> {
  const hintSection = templateHint
    ? `\n\nTemplate Hint: The document appears to be a ${templateHint}. Use this context to better understand the form structure and expected fields.`
    : ''

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt + hintSection },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Please analyze this document image thoroughly. Extract ALL structured data fields, tables, and text content. Even if the image quality is poor, extract everything you can identify. Return results as JSON.',
          },
          {
            type: 'image_url',
            image_url: { url: imageData },
          },
        ],
      },
    ] as any,
    max_tokens: 4096,
    temperature: 0.3,
  })

  const content = completion.choices?.[0]?.message?.content
  if (!content) {
    return { fields: [], tables: [], rawText: '', summary: 'AI returned no content' }
  }

  try {
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(jsonStr)

    return {
      fields: Array.isArray(parsed.fields)
        ? parsed.fields.map((f: any) => ({
            label: String(f.label || ''),
            value: f.value ?? '',
            confidence: typeof f.confidence === 'number' ? f.confidence : 0.8,
            type: f.type || 'string',
          }))
        : [],
      tables: Array.isArray(parsed.tables)
        ? parsed.tables.map((t: any) => ({
            headers: Array.isArray(t.headers) ? t.headers.map(String) : [],
            rows: Array.isArray(t.rows) ? t.rows : [],
          }))
        : [],
      rawText: String(parsed.rawText || ''),
      summary: String(parsed.summary || ''),
    }
  } catch {
    // JSON parse failed - return raw text as best effort
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return {
      fields: [{ label: 'Raw Extracted Text', value: cleaned.slice(0, 1000), confidence: 0.4, type: 'string' }],
      tables: [],
      rawText: cleaned,
      summary: 'Could not parse structured fields. Raw text was extracted instead.',
    }
  }
}
