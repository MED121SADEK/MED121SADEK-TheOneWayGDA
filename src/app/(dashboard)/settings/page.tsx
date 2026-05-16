'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTranslation, localeNames, type Locale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft, Globe, User, Building2, MapPin, Link2, Save,
  Loader2, Shield, Clock, Trash2, X, Plus, Lock, Key,
  Activity, Settings, CheckCircle2, AlertTriangle,
} from 'lucide-react'

/* ─── Types ─── */
interface UserData {
  id: string
  email: string
  name: string | null
  role: string
  bio: string | null
  company: string | null
  location: string | null
  website: string | null
  skills: string | null
  preferences: string | null
  createdAt: string
  lastSeen: string
}

interface ActivityItem {
  id: string
  type: string
  details: string | null
  createdAt: string
}

/* ─── Helpers ─── */
function getSession(): { token: string; user: UserData } | null {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem('oneway-auth-token')
    const userStr = localStorage.getItem('oneway-user')
    if (!token || !userStr) return null
    return { token, user: JSON.parse(userStr) }
  } catch { return null }
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function getActivityLabel(type: string): string {
  const labels: Record<string, string> = {
    login: 'Login', project_created: 'Project Created', analysis_run: 'Analysis Run',
    report_generated: 'Report Generated', workflow_executed: 'Workflow Executed',
    automation_triggered: 'Automation Triggered', profile_updated: 'Profile Updated',
  }
  return labels[type] || type
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

/* ─── MAIN ─── */
export default function SettingsPage() {
  const router = useRouter()
  const { t, locale, setLocale, dir } = useTranslation()
  const session = getSession()

  const [user, setUser] = useState<UserData | null>(session?.user || null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [company, setCompany] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [notifications, setNotifications] = useState(true)

  useEffect(() => {
    if (!session) return
    if (session.user) {
      const u = session.user
      setUser(u)
      setName(u.name || '')
      setBio(u.bio || '')
      setCompany(u.company || '')
      setLocation(u.location || '')
      setWebsite(u.website || '')
      try { setSkills(u.skills ? JSON.parse(String(u.skills)) : []) } catch { setSkills([]) }
      try {
        const prefs = u.preferences ? JSON.parse(String(u.preferences)) : {}
        setNotifications(prefs.notifications !== false)
      } catch { /* use defaults */ }
      fetchActivities(session.token)
    }
    setLoading(false)
  }, [router])

  const fetchActivities = useCallback(async (token: string) => {
    try {
      const res = await fetch(`/api/auth/activity?token=${token}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
      }
    } catch { /* silent */ }
  }, [])

  const handleSave = async () => {
    if (!session?.user) return
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch(`/api/auth/${session.user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          name, bio, company, location, website,
          skills: JSON.stringify(skills),
          preferences: JSON.stringify({ theme: 'dark', language: locale, notifications }),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('oneway-user', JSON.stringify(data.user))
        setUser(data.user)
        setSaveMsg('Profile saved successfully')
        setTimeout(() => setSaveMsg(''), 3000)
      }
    } catch { setSaveMsg('') }
    setSaving(false)
  }

  const addSkill = () => {
    const trimmed = skillInput.trim()
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed])
      setSkillInput('')
    }
  }

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s: string) => s !== skill))
  }

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n.charAt(0).toUpperCase()).join('').slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U'

  if (!user) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6" dir={dir}>
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="size-8 text-primary animate-spin" /></div>
        ) : (
          <>
            {/* ── Profile Header ── */}
            <motion.div {...fadeUp} className="flex items-center gap-4">
              <div className="size-16 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold">{String(user.name || 'User')}</h1>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <Badge variant="outline" className="mt-1 text-[10px] border-primary/20 text-primary">
                  {String(user.role).charAt(0).toUpperCase() + String(user.role).slice(1)}
                </Badge>
              </div>
            </motion.div>

            {/* ── Tabs ── */}
            <Tabs defaultValue="profile">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="profile" className="gap-1.5 text-xs"><User className="size-3.5" />Profile</TabsTrigger>
                <TabsTrigger value="preferences" className="gap-1.5 text-xs"><Settings className="size-3.5" />Preferences</TabsTrigger>
                <TabsTrigger value="history" className="gap-1.5 text-xs"><Clock className="size-3.5" />History</TabsTrigger>
              </TabsList>

              {/* ── Profile Tab ── */}
              <TabsContent value="profile" className="mt-4 space-y-4">
                <motion.div {...fadeUp}>
                  <Card className="card-premium">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="size-4 text-primary" />Personal Information
                      </CardTitle>
                      <CardDescription className="text-xs">Update your profile details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-xs">Full Name</Label>
                          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company" className="text-xs">Company</Label>
                          <div className="relative">
                            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc." className="pl-9 text-sm" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location" className="text-xs">Location</Label>
                          <div className="relative">
                            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="New York, US" className="pl-9 text-sm" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website" className="text-xs">Website</Label>
                          <div className="relative">
                            <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="pl-9 text-sm" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio" className="text-xs">Bio</Label>
                        <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} className="text-sm resize-none" />
                      </div>

                      {/* Skills */}
                      <div className="space-y-2">
                        <Label className="text-xs">Skills</Label>
                        <div className="flex gap-2">
                          <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} placeholder="Add a skill..." className="flex-1 text-sm" />
                          <Button size="sm" variant="outline" onClick={addSkill} disabled={!skillInput.trim()} className="gap-1">
                            <Plus className="size-3" />Add
                          </Button>
                        </div>
                        {skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {skills.map((skill: string) => (
                              <Badge key={skill} variant="secondary" className="text-xs gap-1 pr-1">
                                {skill}
                                <button onClick={() => removeSkill(skill)} className="hover:text-rose-400 transition-colors">
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        {saveMsg && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> {saveMsg}
                          </span>
                        )}
                        <Button onClick={handleSave} disabled={saving} className="ml-auto gap-2">
                          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                          Save Changes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* ── Preferences Tab ── */}
              <TabsContent value="preferences" className="mt-4 space-y-4">
                <motion.div {...fadeUp}>
                  <Card className="card-premium">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Settings className="size-4 text-primary" />Preferences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium">Email Notifications</p>
                          <p className="text-xs text-muted-foreground">Receive updates about your workflows and reports</p>
                        </div>
                        <Switch checked={notifications} onCheckedChange={setNotifications} />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium">Language</p>
                          <p className="text-xs text-muted-foreground">Interface language preference</p>
                        </div>
                        <Badge variant="outline" className="text-xs">{locale.toUpperCase()}</Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium">Theme</p>
                          <p className="text-xs text-muted-foreground">Dark mode is enabled by default</p>
                        </div>
                        <Badge variant="outline" className="text-xs">Dark</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: 0.1 }}>
                  <Card className="card-premium border-rose-500/20 hover:border-rose-500/30">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2 text-rose-400">
                        <AlertTriangle className="size-4" />Danger Zone
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {!deleteConfirmOpen ? (
                        <Button variant="outline" className="text-rose-400 border-rose-500/20 hover:bg-rose-500/10 gap-2" onClick={() => setDeleteConfirmOpen(true)}>
                          <Trash2 className="size-3.5" />Delete Account
                        </Button>
                      ) : (
                        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 space-y-3">
                          <p className="text-sm text-rose-300">
                            This action is permanent and cannot be undone. All your data, projects, and workflows will be deleted.
                          </p>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                            <Button size="sm" className="bg-rose-500 hover:bg-rose-600 text-white gap-1">
                              <Trash2 className="size-3" />Delete Forever
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* ── History Tab ── */}
              <TabsContent value="history" className="mt-4">
                <motion.div {...fadeUp}>
                  <Card className="card-premium">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="size-4 text-primary" />Activity History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activities.length === 0 ? (
                        <div className="text-center py-10">
                          <Clock className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {activities.map((activity: ActivityItem, i: number) => (
                            <div key={activity.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                              <div className="size-7 rounded-lg bg-muted/50 flex items-center justify-center text-[10px] text-muted-foreground font-mono flex-shrink-0">
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm">{getActivityLabel(activity.type)}</p>
                                {activity.details && (
                                  <p className="text-[10px] text-muted-foreground truncate">{String(activity.details).slice(0, 100)}</p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(String(activity.createdAt))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          </>
        )}
    </div>
  )
}
