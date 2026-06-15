'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Share2, Copy, Check, Mail, Send, ExternalLink } from 'lucide-react'
import type { Post } from './types'
import { truncate } from './utils'
type TFunction = (key: string) => string

interface ShareDialogProps {
  post: Post | null
  onClose: () => void
  copiedLink: boolean
  email: string
  onEmailChange: (v: string) => void
  onCopyLink: () => void
  onShareEmail: () => void
  t: (key: string) => string
}

export function ShareDialog({
  post, onClose, copiedLink, email, onEmailChange, onCopyLink, onShareEmail, t,
}: ShareDialogProps) {
  return (
    <Dialog open={!!post} onOpenChange={() => { onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-5 text-primary" />
            {t('community.sharePost') || 'Share Post'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {post && truncate(post.title, 80)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 rounded-xl h-12"
            onClick={onCopyLink}
          >
            {copiedLink ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
            {copiedLink ? (t('community.linkCopied') || 'Link copied!') : (t('community.copyLink') || 'Copy link to clipboard')}
          </Button>
          <Separator />
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Mail className="size-3.5" /> {t('community.shareViaEmail') || 'Share via email'}
            </label>
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder={t('community.colleagueEmail') || 'colleague@example.com'}
                type="email"
                className="flex-1 rounded-xl"
                onKeyDown={(e) => e.key === 'Enter' && onShareEmail()}
              />
              <Button onClick={onShareEmail} disabled={!email.trim()} size="sm" className="rounded-xl gap-1.5">
                <Send className="size-3.5" />
              </Button>
            </div>
          </div>
          {post?.sourceUrl && (
            <>
              <Separator />
              <a
                href={post.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <ExternalLink className="size-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{post.sourceName || 'Source'}</p>
                  <p className="text-xs text-muted-foreground truncate">{post.sourceUrl}</p>
                </div>
              </a>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}