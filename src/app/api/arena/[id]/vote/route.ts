import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuthOrRespond } from '@/lib/require-auth';

// In-memory vote cache for when DB is unavailable (last-resort fallback)
const voteCache = new Map<string, Array<{ voterId: string; choice: string; comment: string | null; createdAt: Date }>>();

/* ═══ POST /api/arena/[id]/vote — submit a vote (auth required) ═══ */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Require authentication ──
  const { user, response: authResponse } = await requireAuthOrRespond(request);
  if (authResponse || !user) return authResponse!;

  try {
    const { id } = await params;
    const body = await request.json();
    const { choice, comment } = body;

    // Derive voterId from the authenticated session (not from request body)
    const voterId = user.userId;

    // Validate choice
    const validChoices = ['model_a', 'model_b', 'tie', 'both_bad'];
    if (!choice || !validChoices.includes(choice)) {
      return NextResponse.json({ error: 'Invalid choice. Must be: model_a, model_b, tie, or both_bad' }, { status: 400 });
    }

    try {
      // Check battle exists and is active
      const battle = await db.arenaBattle.findUnique({ where: { id } });
      if (!battle) {
        return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
      }

      if (!battle.isActive) {
        return NextResponse.json({ error: 'This battle is no longer active' }, { status: 400 });
      }

      // Check for duplicate vote
      const existingVote = await db.arenaVote.findUnique({
        where: { battleId_voterId: { battleId: id, voterId } },
      });
      if (existingVote) {
        return NextResponse.json({ error: 'You have already voted on this battle' }, { status: 409 });
      }

      // Create vote and update battle counts in a transaction
      const vote = await db.$transaction(async (tx) => {
        const newVote = await tx.arenaVote.create({
          data: {
            battleId: id,
            voterId,
            choice,
            comment: comment || null,
          },
        });

        const updateData: Record<string, { increment: number }> = { totalVotes: { increment: 1 } };
        if (choice === 'model_a') updateData.votesA = { increment: 1 };
        else if (choice === 'model_b') updateData.votesB = { increment: 1 };
        else if (choice === 'tie') updateData.votesTie = { increment: 1 };

        await tx.arenaBattle.update({
          where: { id },
          data: updateData,
        });

        return newVote;
      });

      return NextResponse.json({
        vote,
        message: 'Vote submitted successfully!',
        battleId: id,
        choice,
      });
    } catch (dbError) {
      // DB failed — use in-memory cache (last resort)
      console.warn('[Arena Vote] DB unavailable, using memory cache:', dbError);

      const battleVotes = voteCache.get(id) || [];
      
      // Check for duplicate in cache
      if (battleVotes.some(v => v.voterId === voterId)) {
        return NextResponse.json({ error: 'You have already voted on this battle' }, { status: 409 });
      }

      const newVote = { voterId, choice, comment: comment || null, createdAt: new Date() };
      battleVotes.push(newVote);
      voteCache.set(id, battleVotes);

      return NextResponse.json({
        vote: { id: `mem_${Date.now()}`, battleId: id, ...newVote },
        message: 'Vote submitted successfully! (cached)',
        battleId: id,
        choice,
      });
    }
  } catch (error: unknown) {
    console.error('[Arena Vote API POST]', error);
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 });
  }
}