import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/community/reputation/compute
 *
 * Compute and update reputation scores for all verified researchers.
 *
 * Algorithm for each verified researcher:
 * - totalPosts = count of CommunityPost where author=researcher.email
 * - totalAnswers = count of PostComment where author=researcher.email AND isAnswer=true
 * - totalCitations = count of PostInteraction where type='save' AND postId IN [researcher's post IDs]
 * - reputationScore = totalAnswers * 5 + totalCitations * 2 + totalPosts
 * - Update the VerifiedResearcher record
 *
 * Return { updated: count, researchers: [...] }
 */
export async function POST() {
  try {
    // Fetch all verified researchers
    const researchers = await db.verifiedResearcher.findMany({
      where: { isActive: true },
    })

    const results: Array<{
      email: string
      displayName: string
      totalPosts: number
      totalAnswers: number
      totalCitations: number
      reputationScore: number
    }> = []

    for (const researcher of researchers) {
      // totalPosts = count of CommunityPost where author=researcher.email
      const totalPosts = await db.communityPost.count({
        where: { author: researcher.email },
      })

      // totalAnswers = count of PostComment where author=researcher.email AND isAnswer=true
      const totalAnswers = await db.postComment.count({
        where: {
          author: researcher.email,
          isAnswer: true,
        },
      })

      // totalCitations = count of PostInteraction where type='save' AND postId IN [researcher's post IDs]
      const researcherPosts = await db.communityPost.findMany({
        where: { author: researcher.email },
        select: { id: true },
      })

      const researcherPostIds = researcherPosts.map((p) => p.id)

      let totalCitations = 0
      if (researcherPostIds.length > 0) {
        totalCitations = await db.postInteraction.count({
          where: {
            type: 'save',
            postId: { in: researcherPostIds },
          },
        })
      }

      // reputationScore = totalAnswers * 5 + totalCitations * 2 + totalPosts
      const reputationScore = totalAnswers * 5 + totalCitations * 2 + totalPosts

      // Update the VerifiedResearcher record
      await db.verifiedResearcher.update({
        where: { id: researcher.id },
        data: {
          totalPosts,
          totalAnswers,
          totalCitations,
          reputationScore,
        },
      })

      results.push({
        email: researcher.email,
        displayName: researcher.displayName,
        totalPosts,
        totalAnswers,
        totalCitations,
        reputationScore,
      })
    }

    // Sort by reputation score descending
    results.sort((a, b) => b.reputationScore - a.reputationScore)

    return NextResponse.json({
      updated: results.length,
      researchers: results,
      computedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Reputation compute error:', error)
    return NextResponse.json({ error: 'Failed to compute reputation scores' }, { status: 500 })
  }
}
