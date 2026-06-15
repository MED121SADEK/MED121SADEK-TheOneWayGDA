/* ─── Community Types ─── */

export interface Post {
  id: string
  type: string
  title: string
  content: string
  author: string
  authorName?: string | null
  imageUrl?: string | null
  sourceUrl?: string | null
  sourceName?: string | null
  tags?: string | null
  likes: number
  comments: number
  reposts: number
  saves: number
  featured: boolean
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  postId: string
  author: string
  authorName?: string | null
  content: string
  createdAt: string
}

export interface VerifiedInfo {
  email: string
  displayName: string
  institution?: string | null
  role?: string | null
  badgeType: string
  bio?: string | null
  websiteUrl?: string | null
}