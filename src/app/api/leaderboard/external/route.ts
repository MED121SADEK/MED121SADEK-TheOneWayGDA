import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'huggingface';
    const query = searchParams.get('q') || '';

    if (type === 'huggingface') {
      // Integration point: fetch from https://huggingface.co/api/models
      // For now, return structured mock data showing what the integration would provide
      return NextResponse.json({
        source: 'huggingface',
        status: 'mock',
        message: 'HuggingFace API integration point. Configure HF_API_TOKEN in .env to enable live data.',
        models: [],
        available: true,
      });
    }

    if (type === 'github') {
      return NextResponse.json({
        source: 'github',
        status: 'mock',
        message: 'GitHub API integration point. Configure GITHUB_TOKEN in .env to enable live data.',
        repos: [],
        available: true,
      });
    }

    return NextResponse.json({ error: 'Invalid type. Use huggingface or github.' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
