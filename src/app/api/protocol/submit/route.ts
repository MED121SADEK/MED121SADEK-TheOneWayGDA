import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { modelName, provider, benchmark, score, methodology, submitterId, submitterName } = body;

    // Validate required fields
    if (!modelName || !provider || !benchmark || score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: modelName, provider, benchmark, score' },
        { status: 400 },
      );
    }

    // Validate score range
    const parsedScore = parseFloat(score);
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      return NextResponse.json(
        { error: 'Score must be a number between 0 and 100' },
        { status: 400 },
      );
    }

    // Validate benchmark exists in protocol
    const activeProtocol = await db.protocolVersion.findFirst({
      where: { isActive: true },
    });

    if (activeProtocol) {
      const benchmarks: { id: string; name: string }[] = JSON.parse(activeProtocol.benchmarks);
      const validBenchmark = benchmarks.find(
        b => b.id === benchmark || b.name === benchmark,
      );
      if (!validBenchmark) {
        return NextResponse.json(
          { error: `Unknown benchmark: ${benchmark}. Supported benchmarks: ${benchmarks.map(b => b.name).join(', ')}` },
          { status: 400 },
        );
      }
    }

    // Create submission
    const submission = await db.benchmarkSubmission.create({
      data: {
        modelName,
        provider,
        benchmark,
        score: parsedScore,
        methodology: methodology || null,
        submitterId: submitterId || 'anonymous',
        submitterName: submitterName || null,
        status: 'pending',
        protocolVersion: '1.0',
      },
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        modelName: submission.modelName,
        provider: submission.provider,
        benchmark: submission.benchmark,
        score: submission.score,
        status: submission.status,
        createdAt: submission.createdAt,
      },
      message: 'Benchmark submission received. It will be reviewed by our verification team.',
    });
  } catch (error) {
    console.error('[Protocol Submit API]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
