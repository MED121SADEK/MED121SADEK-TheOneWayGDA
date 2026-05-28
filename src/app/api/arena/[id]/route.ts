import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/* ═══ GET /api/arena/[id] — fetch single battle ═══ */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let battle;
    let voteCounts = { model_a: 0, model_b: 0, tie: 0, both_bad: 0 };

    try {
      const dbBattle = await db.arenaBattle.findUnique({
        where: { id },
        include: {
          arenaVotes: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      });

      if (dbBattle) {
        battle = dbBattle;
        for (const v of dbBattle.arenaVotes) {
          if (v.choice in voteCounts) {
            voteCounts[v.choice as keyof typeof voteCounts]++;
          }
        }
      }
    } catch {
      // DB failed — try demo fallback
    }

    if (!battle) {
      // Check demo data
      const demoBattles = [
        {
          id: 'demo_1',
          modelAId: 'gpt4o', modelAName: 'GPT-4o',
          modelBId: 'claude-3-5-sonnet', modelBName: 'Claude 3.5 Sonnet',
          category: 'reasoning',
          prompt: 'Explain the Monty Hall problem and why switching doors gives a 2/3 probability of winning.',
          responseA: 'The Monty Hall problem is a classic probability puzzle...', responseB: 'Let me break this down step by step...',
          votesA: 234, votesB: 189, votesTie: 45, totalVotes: 468, isRevealed: true, isActive: true,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          arenaVotes: [],
        },
        {
          id: 'demo_2',
          modelAId: 'gemini-2-0-flash', modelAName: 'Gemini 2.0 Flash',
          modelBId: 'deepseek-v3', modelBName: 'DeepSeek V3',
          category: 'coding',
          prompt: 'Write a function to find the longest palindromic substring in O(n) time.',
          responseA: 'Manacher\'s algorithm...', responseB: 'Manacher\'s algorithm...',
          votesA: 312, votesB: 278, votesTie: 56, totalVotes: 646, isRevealed: true, isActive: true,
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
          arenaVotes: [],
        },
      ];
      battle = demoBattles.find((b) => b.id === id);
      if (!battle) {
        return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
      }
      voteCounts = { model_a: battle.votesA, model_b: battle.votesB, tie: battle.votesTie, both_bad: 0 };
    }

    return NextResponse.json({
      battle,
      voteCounts,
      totalVotes: battle.totalVotes,
    });
  } catch (error: unknown) {
    console.error('[Arena API GET /id]', error);
    return NextResponse.json({ error: 'Failed to fetch battle' }, { status: 500 });
  }
}
