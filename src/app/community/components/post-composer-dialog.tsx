'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Send, Link2, Image as ImageIcon, Loader2 } from 'lucide-react'
type TFunction = (key: string) => string

interface PostComposerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onTitleChange: (v: string) => void
  content: string
  onContentChange: (v: string) => void
  imageUrl: string
  onImageUrlChange: (v: string) => void
  link: string
  onLinkChange: (v: string) => void
  submitting: boolean
  onSubmit: () => void
  t: (key: string) => string
}

export function PostComposerDialog({
  open, onOpenChange,
  title, onTitleChange,
  content, onContentChange,
  imageUrl, onImageUrlChange,
  link, onLinkChange,
  submitting, onSubmit, t,
}: PostComposerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            {t('community.createPost') || 'Create Post'}
          </DialogTitle>
          <DialogDescription>
            {t('community.createPostDesc') || 'Share your thoughts, discoveries, or questions with the AI community.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t('community.postTitle') || 'Title'}</label>
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={t('community.postTitlePlaceholder') || 'What\'s on your mind?'}
              maxLength={300}
              className="rounded-xl"
            />
            <span className="text-xs text-muted-foreground mt-1 block">{title.length}/300</span>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t('community.postContent') || 'Content'}</label>
            <Textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder={t('community.postContentPlaceholder') || 'Share details, links, insights...'}
              rows={5}
              maxLength={10000}
              className="rounded-xl resize-none"
            />
            <span className="text-xs text-muted-foreground mt-1 block">{content.length}/10,000</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="size-3.5" /> {t('community.imageUrl') || 'Image URL'}
              </label>
              <Input value={imageUrl} onChange={(e) => onImageUrlChange(e.target.value)} placeholder="https://..." className="rounded-xl text-xs" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Link2 className="size-3.5" /> {t('community.linkUrl') || 'Link URL'}
              </label>
              <Input value={link} onChange={(e) => onLinkChange(e.target.value)} placeholder="https://..." className="rounded-xl text-xs" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('community.cancel') || 'Cancel'}
          </Button>
          <Button onClick={onSubmit} disabled={submitting || !title.trim() || !content.trim()} className="gap-1.5">
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            {t('community.publish') || 'Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}