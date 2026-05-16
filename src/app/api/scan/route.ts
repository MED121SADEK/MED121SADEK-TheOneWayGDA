import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    let imageData: string = ''
    let templateHint: string | undefined

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

      if (!imageData) {
        return NextResponse.json(
          { error: 'No image data provided. Send imageData as base64 string.' },
          { status: 400 }
        )
      }
    }

    const zai = await ZAI.create()

    const hintSection = templateHint
      ? `\n\nTemplate Hint: The document appears to be a ${templateHint}. Use this context to better understand the form structure and expected fields.`
      : ''

    const systemPrompt = `You are an expert OCR and document analysis AI for "The One-Way" statistical analysis platform. Your job is to analyze document images (scanned forms, surveys, questionnaires, data tables) and extract structured data.

Analyze the document image thoroughly and extract:

1. **Fields**: Individual labeled data fields (e.g., names, IDs, dates, values, scores, responses). For each field provide:
   - label: The field name/label from the document
   - value: The extracted value
   - confidence: Your confidence level (0.0 to 1.0)
   - type: One of: "string", "numeric", "date", "currency", "percentage", "boolean", "id", "email", "phone"

2. **Tables**: Any tabular data found in the document. For each table provide:
   - headers: Array of column header strings
   - rows: Array of arrays, where each inner array contains cell values for that row

3. **rawText**: The complete text extracted from the document (preserving structure where possible)

4. **summary**: A brief 1-2 sentence summary of what the document contains${hintSection}

IMPORTANT: 
- Be precise with numeric values — preserve decimal places as written
- For dates, normalize to ISO format (YYYY-MM-DD) when possible
- If a field value is ambiguous, note it with lower confidence
- Empty/blank fields should still be included with empty string values
- Handle handwriting recognition best-effort with appropriate confidence scores

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{
  "fields": [
    {"label": "Field Name", "value": "extracted value", "confidence": 0.95, "type": "string"}
  ],
  "tables": [
    {"headers": ["Col1", "Col2"], "rows": [["val1", "val2"], ["val3", "val4"]]}
  ],
  "rawText": "Full extracted text...",
  "summary": "Brief document summary"
}`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this document image and extract all structured data fields, tables, and text content. Return the results in the specified JSON format.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData,
              },
            },
          ],
        },
      ],
    })

    const content = completion.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'AI returned no content' },
        { status: 500 }
      )
    }

    let parsed: any
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON', rawContent: content },
        { status: 500 }
      )
    }

    return NextResponse.json({
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
    })
  } catch (error: any) {
    console.error('Scan API error:', error.message)
    return NextResponse.json(
      { error: 'Document scanning failed. Please try again.' },
      { status: 500 }
    )
  }
}
