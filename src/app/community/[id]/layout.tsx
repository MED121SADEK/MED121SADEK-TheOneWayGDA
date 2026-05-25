import type { Metadata } from "next"
import { db as prisma } from "@/lib/db"

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const post = await prisma.communityPost.findUnique({
      where: { id },
      select: { title: true, content: true, type: true, tags: true, createdAt: true },
    })

    if (!post) {
      return { title: "Post Not Found | TheOneWayGDA" }
    }

    const description = post.content
      ? post.content.slice(0, 160).replace(/\n/g, " ")
      : "Read this post on TheOneWayGDA AI community."

    return {
      title: post.title.slice(0, 70),
      description,
      keywords: post.tags ? JSON.parse(post.tags) : ["AI", "community"],
      alternates: {
        canonical: `https://theonewaygda.com/community/${id}`,
      },
      openGraph: {
        title: post.title.slice(0, 70),
        description,
        url: `https://theonewaygda.com/community/${id}`,
        type: "article",
        publishedTime: post.createdAt.toISOString(),
        authors: ["TheOneWayGDA Community"],
        tags: post.tags ? JSON.parse(post.tags) : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: post.title.slice(0, 70),
        description,
      },
    }
  } catch {
    return { title: "Community Post | TheOneWayGDA" }
  }
}

export default function CommunityPostLayout({ children }: { children: React.ReactNode }) {
  return children
}
