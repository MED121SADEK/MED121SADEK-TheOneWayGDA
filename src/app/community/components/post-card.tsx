'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Heart, MessageCircle, Bookmark, Repeat2, Share2, ExternalLink,
  Trash2, Send, Tag, Pin, Brain, Beaker, Lightbulb, BadgeCheck,
  Loader2,
} from 'lucide-react'
import type { Post, Comment, VerifiedInfo } from './types'
import { timeAgo, parseTags, truncate, getPostTypeInfo, getCategoryFromTags, getCardClass } from './utils'

export interface PostCardProps {
  post: Post
  session: { email: string; name: string } | null
  isLiked: boolean
  isSaved: boolean
  commentsOpen: boolean
  comments: Comment[]
  commentsLoading: boolean
  commentText: string
  onLike: () => void
  onSave: () => void
  onRepost: () => void
  onDelete: () => void
  onToggleComments: () => void
  onCommentTextChange: (v: string) => void
  onSubmitComment: () => void
  onShare: () => void
  verifiedInfo: VerifiedInfo | null
}

export function PostCard({
  post, session, isLiked, isSaved,
  commentsOpen, comments, commentsLoading, commentText,
  onLike, onSave, onRepost, onDelete, onToggleComments,
  onCommentTextChange, onSubmitComment, onShare, verifiedInfo,
}: PostCardProps) {
  const tags = parseTags(post.tags)
  const isOwnPost = session && session.email === post.author
  const displayName = post.authorName || post.author.split('@')[0]
  const postTypeInfo = getPostTypeInfo(post.type)
  const PostTypeIcon = postTypeInfo.icon
  const category = getCategoryFromTags(tags)

  return (
    <div className={`rounded-xl border bg-card/80 backdrop-blur-sm overflow-hidden transition-all hover:border-border/80 ${getCardClass(post)}`}>
      {/* Header */}
      <div className="px-4 sm:px-5 pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={`size-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${postTypeInfo.bg}`}>
              {(post.type === 'auto' || post.type === 'news') ? (
                <PostTypeIcon className="size-4" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/profile/${encodeURIComponent(post.author)}`} className="hover:underline">
                  <span className="text-sm font-semibold">{verifiedInfo ? verifiedInfo.displayName : displayName}</span>
                </Link>
                {/* Verified Badge */}
                {verifiedInfo && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[10px] font-medium border"
                    title={verifiedInfo.institution
                      ? `${verifiedInfo.badgeType === 'bot' ? 'Official Bot' : verifiedInfo.badgeType === 'institution' ? 'Verified Institution' : verifiedInfo.badgeType === 'official' ? 'Official Account' : 'Verified Researcher'} — ${verifiedInfo.institution}${verifiedInfo.role ? ` · ${verifiedInfo.role}` : ''}`
                      : verifiedInfo.badgeType === 'bot' ? 'Official Bot' : 'Verified'}
                    style={{
                      borderColor: verifiedInfo.badgeType === 'bot' ? 'rgba(99,102,241,0.4)'
                        : verifiedInfo.badgeType === 'institution' ? 'rgba(168,85,247,0.4)'
                        : verifiedInfo.badgeType === 'official' ? 'rgba(59,130,246,0.4)'
                        : 'rgba(16,185,129,0.4)',
                      backgroundColor: verifiedInfo.badgeType === 'bot' ? 'rgba(99,102,241,0.1)'
                        : verifiedInfo.badgeType === 'institution' ? 'rgba(168,85,247,0.1)'
                        : verifiedInfo.badgeType === 'official' ? 'rgba(59,130,246,0.1)'
                        : 'rgba(16,185,129,0.1)',
                      color: verifiedInfo.badgeType === 'bot' ? '#818cf8'
                        : verifiedInfo.badgeType === 'institution' ? '#c084fc'
                        : verifiedInfo.badgeType === 'official' ? '#60a5fa'
                        : '#34d399',
                    }}
                  >
                    <BadgeCheck className="size-3" />
                    {verifiedInfo.badgeType === 'bot' ? 'Bot'
                      : verifiedInfo.badgeType === 'institution' ? 'Institution'
                      : verifiedInfo.badgeType === 'official' ? 'Official'
                      : 'Verified'}
                  </span>
                )}
                {/* Post type badge */}
                <Badge variant="outline" className={`gap-0.5 px-1.5 py-0 text-[10px] ${postTypeInfo.bg} ${postTypeInfo.border} ${postTypeInfo.text}`}>
                  <PostTypeIcon className="size-2.5" /> {postTypeInfo.label}
                </Badge>
                {post.featured && post.type !== 'digest' && (
                  <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] border-primary/30 text-primary bg-primary/5">
                    <Pin className="size-2.5" /> Featured
                  </Badge>
                )}
                {/* Category Badge */}
                <Badge variant="outline" className={`gap-0.5 px-1.5 py-0 text-[9px] ${
                  category === 'Research' ? 'border-purple-500/20 text-purple-300 bg-purple-500/5'
                  : category === 'Innovation' ? 'border-amber-500/20 text-amber-300 bg-amber-500/5'
                  : 'border-blue-500/20 text-blue-300 bg-blue-500/5'
                }`}>
                  {category === 'Research' ? <Beaker className="size-2" /> : category === 'Innovation' ? <Lightbulb className="size-2" /> : <Brain className="size-2" />}
                  {category}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{timeAgo(post.createdAt)}</span>
                {post.sourceName && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <ExternalLink className="size-2.5" />
                      {post.sourceName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {isOwnPost && (
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>

        {/* Title & Content */}
        <div className="mt-3">
          <Link href={`/community/${post.id}`} className="group/title">
            <h3 className="text-base font-semibold leading-snug group-hover/title:text-primary transition-colors">{post.title}</h3>
          </Link>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            {post.content.length > 300 ? (
              <>
                {truncate(post.content, 300)}
                {post.sourceUrl && (
                  <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1 inline-flex items-center gap-0.5">
                    Read more <ExternalLink className="size-3" />
                  </a>
                )}
              </>
            ) : (
              post.content
            )}
          </p>
        </div>

        {/* Image */}
        {post.imageUrl && (
          <div className="mt-3 rounded-lg overflow-hidden border border-border/30">
            <img src={post.imageUrl} alt="" className="w-full h-48 object-cover" loading="lazy" />
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0 rounded-full">
                <Tag className="size-2.5 mr-0.5" />{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="px-4 sm:px-5 py-2 text-xs text-muted-foreground flex items-center gap-4">
        {post.likes > 0 && <span>{post.likes} {post.likes === 1 ? 'like' : 'likes'}</span>}
        {post.comments > 0 && <span>{post.comments} {post.comments === 1 ? 'comment' : 'comments'}</span>}
        {post.reposts > 0 && <span>{post.reposts} {post.reposts === 1 ? 'repost' : 'reposts'}</span>}
      </div>

      <Separator className="opacity-50" />

      {/* Action buttons */}
      <div className="px-2 sm:px-3 py-1 flex items-center">
        <button onClick={onLike} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${isLiked ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/15' : 'text-muted-foreground hover:text-rose-500 hover:bg-muted/50'}`}>
          <Heart className={`size-4 ${isLiked ? 'fill-current' : ''}`} />
          <span className="hidden sm:inline">{isLiked ? 'Liked' : 'Like'}</span>
        </button>
        <button onClick={onToggleComments} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${commentsOpen ? 'text-primary bg-primary/10 hover:bg-primary/15' : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}>
          <MessageCircle className="size-4" />
          <span className="hidden sm:inline">{commentsOpen ? 'Hide' : 'Comment'}</span>
        </button>
        <button onClick={onRepost} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/5 transition-all">
          <Repeat2 className="size-4" />
          <span className="hidden sm:inline">Repost</span>
        </button>
        <button onClick={onSave} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${isSaved ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/15' : 'text-muted-foreground hover:text-amber-500 hover:bg-muted/50'}`}>
          <Bookmark className={`size-4 ${isSaved ? 'fill-current' : ''}`} />
          <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
        </button>
        <button onClick={onShare} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-blue-500 hover:bg-blue-500/5 transition-all">
          <Share2 className="size-4" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {commentsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Separator className="opacity-50" />
            <div className="px-4 sm:px-5 py-3 space-y-3">
              {commentsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No comments yet. Be the first to comment!</p>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-2.5">
                      <div className="size-7 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-accent">
                        {(comment.authorName || comment.author.split('@')[0]).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{comment.authorName || comment.author.split('@')[0]}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-foreground/90 mt-0.5 leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment input */}
              {session ? (
                <div className="flex gap-2 pt-2 border-t border-border/30">
                  <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-primary">
                    {session.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={commentText}
                      onChange={(e) => onCommentTextChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && onSubmitComment()}
                      placeholder="Write a comment..."
                      className="h-8 text-xs rounded-lg"
                      maxLength={2000}
                    />
                    <Button size="icon" className="size-8 rounded-lg flex-shrink-0" onClick={onSubmitComment} disabled={!commentText.trim()}>
                      <Send className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
                  Please enter the platform to comment.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}