'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Trophy,
  Vote,
  History,
  BarChart3,
  ChevronRight,
  ChevronUp,
  Sparkles,
  Eye,
  EyeOff,
  ThumbsUp,
  Handshake,
  ThumbsDown,
  Clock,
  Zap,
  Users,
  TrendingUp,
  Crown,
  Medal,
  Flame,
  ChevronDown,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

interface ArenaBattle {
  id: string;
  modelAId: string;
  modelAName: string;
  modelBId: string;
  modelBName: string;
  category: string;
  prompt: string;
  responseA: string | null;
  responseB: string | null;
  votesA: number;
  votesB: number;
  votesTie: number;
  totalVotes: number;
  isRevealed: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ArenaStats {
  totalBattles: number;
  totalVotes: number;
  todayVotes: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  provider: string;
  elo: number;
  wins: number;
  losses: number;
  battles: number;
  winRate: number;
}

interface ArenaData {
  battles: ArenaBattle[];
  stats: ArenaStats;
  leaderboard: LeaderboardEntry[];
}

/* ═══════════════════════════════════════════
   Category config
   ═══════════════════════════════════════════ */

const CATEGORIES = [
  { key: 'all', label: 'All', icon: Zap },
  { key: 'reasoning', label: 'Reasoning', icon: BrainIcon },
  { key: 'coding', label: 'Coding', icon: CodeIcon },
  { key: 'creative', label: 'Creative', icon: Sparkles },
  { key: 'math', label: 'Math', icon: CalcIcon },
] as const;

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function CalcIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="16" y1="14" x2="16" y2="18" />
      <line x1="8" y1="10" x2="8" y2="10.01" />
      <line x1="12" y1="10" x2="12" y2="10.01" />
      <line x1="16" y1="10" x2="16" y2="10.01" />
      <line x1="8" y1="14" x2="8" y2="14.01" />
      <line x1="12" y1="14" x2="12" y2="14.01" />
      <line x1="8" y1="18" x2="8" y2="18.01" />
      <line x1="12" y1="18" x2="12" y2="18.01" />
    </svg>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  reasoning: 'bg-chart-1/15 text-chart-1 border-chart-1/20',
  coding: 'bg-chart-2/15 text-chart-2 border-chart-2/20',
  creative: 'bg-chart-3/15 text-chart-3 border-chart-3/20',
  math: 'bg-chart-4/15 text-chart-4 border-chart-4/20',
  general: 'bg-muted text-muted-foreground border-border',
};

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getRankIcon(index: number) {
  if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
  if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
  if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{index + 1}</span>;
}

function getProviderColor(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'openai': return 'text-green-400';
    case 'anthropic': return 'text-orange-400';
    case 'google': return 'text-blue-400';
    case 'deepseek': return 'text-cyan-400';
    case 'meta': return 'text-purple-400';
    default: return 'text-muted-foreground';
  }
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */

function getVoterId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  let voterId = localStorage.getItem('arena-voter-id');
  if (!voterId) {
    voterId = `voter_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('arena-voter-id', voterId);
  }
  return voterId;
}

export default function ArenaPage() {
  const [data, setData] = useState<ArenaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('battles');
  const [votedBattles, setVotedBattles] = useState<Set<string>>(new Set());
  const [voting, setVoting] = useState<string | null>(null);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/arena${activeCategory !== 'all' ? `?category=${activeCategory}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVote = async (battleId: string, choice: string) => {
    setVoting(battleId);
    const voterId = getVoterId();
    try {
      const res = await fetch(`/api/arena/${battleId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice, voterId }),
      });
      const json = await res.json();
      if (res.ok) {
        setVotedBattles((prev) => new Set([...prev, battleId]));
        // Refresh data to get updated leaderboard
        await fetchData();
      } else {
        alert(json.error || 'Failed to vote');
      }
    } catch {
      alert('Network error');
    } finally {
      setVoting(null);
    }
  };

  const handleCreateBattle = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelAId: 'gpt4o',
          modelAName: 'GPT-4o',
          modelBId: 'claude-4-opus',
          modelBName: 'Claude 4 Opus',
          category: 'general',
          prompt: 'Explain quantum entanglement to a curious 12-year-old. Make it fun and use an everyday analogy.',
          responseA: "Imagine you have two magical dice. When you roll them, no matter how far apart they are — even if one is on Earth and the other is on Mars — they ALWAYS show the same number! That's kind of what quantum entanglement is like.\n\nIn the real quantum world, scientists can create pairs of tiny particles (like photons, which are particles of light) that become 'entangled.' Once entangled, measuring something about one particle instantly tells you about the other one, no matter the distance.\n\nHere's the really cool part: it's NOT like putting a left glove in one box and a right glove in another. With quantum entanglement, the result is genuinely random — it's not determined until you look. But somehow, looking at one instantly 'knows' what the other will show.\n\nThink of it like this: imagine two magic coins. When you flip them simultaneously while standing on opposite sides of the universe, they'll always land on matching sides — heads-heads or tails-tails. Even though each individual flip was 50/50 random!\n\nEinstein called this 'spooky action at a distance' because it seemed too weird to be real. But experiments have proven it works! Scientists are now using this quantum magic to build super-secure communication systems and quantum computers.",
          responseB: "You know how twins sometimes finish each other's sentences? Quantum entanglement is like the ultimate version of that — but for particles!\n\nHere's the basic idea: In the quantum world (the world of things SUPER tiny, like atoms), scientists can link two particles together. Once linked, these particles share a connection that's almost like telepathy. If something happens to one particle, the other particle instantly 'knows,' even if they're billions of miles apart!\n\n**The Shoe Analogy:** Imagine you have a pair of shoes. You put one shoe in a box and mail it to your friend across the country, and keep the other box. When you open your box and see a left shoe, you INSTANTLY know your friend has the right shoe. That's entanglement in a nutshell — but with a quantum twist.\n\nThe twist? In the quantum version, each shoe isn't a left or right shoe UNTIL you open the box. It's both at the same time (quantum weirdness!). But the moment you peek and see 'left,' your friend's box across the country instantly becomes 'right.'\n\n**Why does this matter?**\n- Scientists use it to build super-secure codes that are impossible to hack\n- It helps make quantum computers work way faster than normal computers\n- It helps us understand the deep nature of reality itself\n\nIt's one of the strangest and most amazing things we've discovered about the universe!",
        }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch {
      // Silent fail for auto-generation
    } finally {
      setCreating(false);
    }
  };

  const filteredBattles = data?.battles.filter((b) => {
    if (activeCategory !== 'all' && b.category !== activeCategory) return false;
    return true;
  }) || [];

  const activeBattles = filteredBattles.filter((b) => b.isActive);
  const completedBattles = filteredBattles.filter((b) => !b.isActive);

  /* ─── Loading skeleton ─── */
  if (loading && !data) {
    return <ArenaSkeleton />;
  }

  /* ─── Error state ─── */
  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-center text-muted-foreground">Failed to load arena data.</p>
            <Button onClick={fetchData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* ─── Hero Section ─── */}
        <section className="relative overflow-hidden hero-gradient">
          <div className="absolute inset-0 dot-pattern opacity-30" />
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="inline-flex items-center gap-2 mb-6"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Swords className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="secondary" className="text-xs font-medium px-3 py-1">
                  <Flame className="h-3 w-3 mr-1 text-orange-400" />
                  Live Battles
                </Badge>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
                <span className="gradient-text">AI Arena</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Vote on anonymous AI model battles. Your votes shape the leaderboard.
              </p>
              <div className="mt-5">
                <Button
                  onClick={handleCreateBattle}
                  disabled={creating}
                  className="gap-2 font-medium"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  New Battle
                </Button>
              </div>
            </motion.div>

            {/* Stats Bar */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto"
            >
              {[
                { icon: Swords, label: 'Total Battles', value: data?.stats.totalBattles || 0, color: 'text-primary' },
                { icon: Vote, label: 'Total Votes', value: data?.stats.totalVotes || 0, color: 'text-accent' },
                { icon: Zap, label: 'Today Votes', value: data?.stats.todayVotes || 0, color: 'text-yellow-400' },
                { icon: Users, label: 'Models', value: data?.leaderboard.length || 0, color: 'text-chart-3' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
                >
                  <Card className="glass-card hover:border-primary/20 transition-colors">
                    <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0`}>
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                        <p className="text-lg font-bold">{stat.value.toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── Category Filter ─── */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.key}
                  variant={activeCategory === cat.key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveCategory(cat.key)}
                  className="flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                  {activeCategory === cat.key && (
                    <motion.div
                      layoutId="category-indicator"
                      className="absolute inset-0 rounded-md bg-primary/10 -z-10"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Main Content ─── */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 bg-muted/50 p-1 h-auto">
              <TabsTrigger value="battles" className="gap-2 data-[state=active]:bg-card">
                <Swords className="h-4 w-4" />
                Active Battles
                {activeBattles.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs px-1">
                    {activeBattles.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-card">
                <History className="h-4 w-4" />
                Battle History
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-2 data-[state=active]:bg-card">
                <Trophy className="h-4 w-4" />
                Leaderboard
              </TabsTrigger>
            </TabsList>

            {/* ─── Active Battles Tab ─── */}
            <TabsContent value="battles">
              {activeBattles.length === 0 ? (
                <EmptyState
                  icon={Swords}
                  title="No active battles"
                  description="Check back soon for new AI model battles to vote on!"
                />
              ) : (
                <div className="space-y-6">
                  {activeBattles.map((battle, index) => (
                    <BattleCard
                      key={battle.id}
                      battle={battle}
                      index={index}
                      hasVoted={votedBattles.has(battle.id)}
                      isVoting={voting === battle.id}
                      onVote={(choice) => handleVote(battle.id, choice)}
                      expandedPrompt={expandedPrompt === battle.id}
                      onTogglePrompt={() => setExpandedPrompt(expandedPrompt === battle.id ? null : battle.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ─── Battle History Tab ─── */}
            <TabsContent value="history">
              {completedBattles.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No battle history yet"
                  description="Completed battles will appear here with results and vote counts."
                />
              ) : (
                <div className="space-y-4">
                  {completedBattles.map((battle, index) => (
                    <HistoryCard key={battle.id} battle={battle} index={index} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ─── Leaderboard Tab ─── */}
            <TabsContent value="leaderboard">
              <LeaderboardSection entries={data?.leaderboard || []} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </TooltipProvider>
  );
}

/* ═══════════════════════════════════════════
   Battle Card Component
   ═══════════════════════════════════════════ */

function BattleCard({
  battle,
  index,
  hasVoted,
  isVoting,
  onVote,
  expandedPrompt,
  onTogglePrompt,
}: {
  battle: ArenaBattle;
  index: number;
  hasVoted: boolean;
  isVoting: boolean;
  onVote: (choice: string) => void;
  expandedPrompt: boolean;
  onTogglePrompt: () => void;
}) {
  const totalA = battle.votesA;
  const totalB = battle.votesB;
  const total = battle.totalVotes || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
    >
      <Card className="glass-card overflow-hidden hover:border-primary/20 transition-all duration-300 group">
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className={CATEGORY_COLORS[battle.category] || CATEGORY_COLORS.general}>
              {battle.category.charAt(0).toUpperCase() + battle.category.slice(1)}
            </Badge>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
              <Clock className="h-3.5 w-3.5" />
              {timeAgo(battle.createdAt)}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <CardTitle className="text-base font-semibold leading-snug">Prompt</CardTitle>
            <CardDescription className="mt-1.5 text-sm leading-relaxed">
              <AnimatePresence mode="wait">
                {expandedPrompt ? (
                  <motion.div
                    key="full"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {battle.prompt}
                  </motion.div>
                ) : (
                  <motion.div
                    key="truncated"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {battle.prompt.length > 200 ? battle.prompt.slice(0, 200) + '...' : battle.prompt}
                  </motion.div>
                )}
              </AnimatePresence>
              {battle.prompt.length > 200 && (
                <button
                  onClick={onTogglePrompt}
                  className="text-primary text-xs font-medium mt-1 hover:underline inline-flex items-center gap-1"
                >
                  {expandedPrompt ? (
                    <>Show less <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>Read full prompt <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>
              )}
            </CardDescription>
          </div>
        </CardHeader>

        <Separator />

        {/* Model Responses */}
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Model A */}
            <ModelResponse
              label="Model A"
              response={battle.responseA}
              revealed={battle.isRevealed || hasVoted}
              revealedName={battle.modelAName}
              votes={totalA}
              totalVotes={total}
              colorA={true}
            />
            {/* Model B */}
            <ModelResponse
              label="Model B"
              response={battle.responseB}
              revealed={battle.isRevealed || hasVoted}
              revealedName={battle.modelBName}
              votes={totalB}
              totalVotes={total}
              colorA={false}
            />
          </div>
        </CardContent>

        <Separator />

        {/* Vote Section */}
        <CardFooter className="p-4 sm:p-6">
          {hasVoted || battle.isRevealed ? (
            /* Results after voting */
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  {battle.totalVotes} votes cast
                </span>
                <span className="text-xs text-muted-foreground">
                  {battle.isRevealed ? 'Models revealed' : 'Your vote recorded'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium w-16 text-right">
                    {battle.isRevealed ? battle.modelAName : 'Model A'}
                  </span>
                  <div className="flex-1 h-2.5 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(totalA / total) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                  <span className="text-xs font-mono w-10">{Math.round((totalA / total) * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium w-16 text-right">
                    {battle.isRevealed ? battle.modelBName : 'Model B'}
                  </span>
                  <div className="flex-1 h-2.5 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(totalB / total) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="h-full rounded-full bg-accent"
                    />
                  </div>
                  <span className="text-xs font-mono w-10">{Math.round((totalB / total) * 100)}%</span>
                </div>
                {battle.votesTie > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium w-16 text-right">Ties</span>
                    <div className="flex-1 h-2.5 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(battle.votesTie / total) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="h-full rounded-full bg-muted-foreground/50"
                      />
                    </div>
                    <span className="text-xs font-mono w-10">{Math.round((battle.votesTie / total) * 100)}%</span>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* Vote Buttons */
            <div className="w-full">
              <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1.5">
                <Vote className="h-4 w-4" />
                Which response is better?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { choice: 'model_a', label: 'A Wins', icon: ThumbsUp, className: 'border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-primary' },
                  { choice: 'model_b', label: 'B Wins', icon: ThumbsUp, className: 'border-accent/30 hover:bg-accent/10 hover:border-accent/50 text-accent' },
                  { choice: 'tie', label: "Tie", icon: Handshake, className: 'border-chart-3/30 hover:bg-chart-3/10 hover:border-chart-3/50 text-chart-3' },
                  { choice: 'both_bad', label: 'Both Bad', icon: ThumbsDown, className: 'border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 text-destructive' },
                ].map((btn) => (
                  <Button
                    key={btn.choice}
                    variant="outline"
                    size="sm"
                    disabled={isVoting}
                    onClick={() => onVote(btn.choice)}
                    className={`font-medium ${btn.className} transition-all duration-200 ${isVoting ? 'opacity-50' : ''}`}
                  >
                    {isVoting ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <btn.icon className="h-4 w-4 mr-1.5" />
                    )}
                    {btn.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Model Response Component
   ═══════════════════════════════════════════ */

function ModelResponse({
  label,
  response,
  revealed,
  revealedName,
  votes,
  totalVotes,
  colorA,
}: {
  label: string;
  response: string | null;
  revealed: boolean;
  revealedName: string;
  votes: number;
  totalVotes: number;
  colorA: boolean;
}) {
  const borderColor = colorA ? 'border-primary/20' : 'border-accent/20';
  const headerBg = colorA ? 'bg-primary/5' : 'bg-accent/5';
  const headerTextColor = colorA ? 'text-primary' : 'text-accent';

  return (
    <div className={`rounded-lg border ${borderColor} overflow-hidden`}>
      <div className={`px-3 py-2 ${headerBg} flex items-center justify-between`}>
        <span className={`text-xs font-bold uppercase tracking-wider ${headerTextColor}`}>
          {label}
          {revealed && (
            <span className="ml-2 font-normal normal-case text-foreground/70">
              — {revealedName}
            </span>
          )}
        </span>
        {votes > 0 && (
          <Badge variant="secondary" className="text-xs h-5">
            {votes} vote{votes !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>
      <ScrollArea className="max-h-64">
        <div className="p-3 text-sm leading-relaxed whitespace-pre-wrap font-mono text-xs sm:text-sm bg-card">
          {response || 'Waiting for response...'}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ═══════════════════════════════════════════
   History Card Component
   ═══════════════════════════════════════════ */

function HistoryCard({ battle, index }: { battle: ArenaBattle; index: number }) {
  const total = battle.totalVotes || 1;
  const winner = battle.votesA > battle.votesB ? 'A' : battle.votesB > battle.votesA ? 'B' : 'Tie';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
    >
      <Card className="glass-card hover:border-border/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Winner Badge */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {winner === 'Tie' ? (
                <Badge variant="secondary" className="bg-chart-3/15 text-chart-3 border-chart-3/20">
                  <Handshake className="h-3 w-3 mr-1" /> Tie
                </Badge>
              ) : (
                <Badge className="bg-primary/15 text-primary border-primary/20">
                  <Crown className="h-3 w-3 mr-1" />
                  {winner} Wins
                </Badge>
              )}
              <Badge variant="outline" className={CATEGORY_COLORS[battle.category] || CATEGORY_COLORS.general}>
                {battle.category}
              </Badge>
            </div>

            {/* Models */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className={`font-medium truncate ${winner === 'A' ? 'text-primary' : ''}`}>
                  {battle.modelAName}
                </span>
                <span className="text-muted-foreground">vs</span>
                <span className={`font-medium truncate ${winner === 'B' ? 'text-accent' : ''}`}>
                  {battle.modelBName}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {battle.prompt.slice(0, 80)}...
              </p>
            </div>

            {/* Vote counts */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
              <span className="flex items-center gap-1">
                <Vote className="h-3 w-3" />
                {battle.totalVotes}
              </span>
              <span>{timeAgo(battle.createdAt)}</span>
            </div>
          </div>

          {/* Progress bars */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-mono w-8 text-right">{Math.round((battle.votesA / total) * 100)}%</span>
            <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-muted/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(battle.votesA / total) * 100}%` }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="bg-primary"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(battle.votesTie / total) * 100}%` }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="bg-muted-foreground/40"
              />
              <div className="flex-1 bg-accent" style={{ width: `${(battle.votesB / total) * 100}%` }} />
            </div>
            <span className="text-xs font-mono w-8">{Math.round((battle.votesB / total) * 100)}%</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Leaderboard Section
   ═══════════════════════════════════════════ */

function LeaderboardSection({ entries }: { entries: LeaderboardEntry[] }) {
  const topEntry = entries[0];
  const eloMax = topEntry ? topEntry.elo : 1;

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No leaderboard data"
        description="Vote on battles to help build the model rankings!"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Model Spotlight */}
      {topEntry && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden glow-border">
            <div className="bg-gradient-to-r from-primary/10 via-transparent to-accent/10 p-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                  <Crown className="h-8 w-8 text-yellow-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold truncate">{topEntry.name}</h3>
                    <span className={`text-sm font-medium ${getProviderColor(topEntry.provider)}`}>
                      {topEntry.provider}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-xl font-bold text-primary">{topEntry.elo}</span>
                      <span className="text-xs">ELO</span>
                    </span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>{topEntry.battles} battles</span>
                    <span>{topEntry.winRate}% win rate</span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1">
                  <span className="text-4xl font-black gradient-text">#{1}</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Rankings Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[480px]">
            <div className="divide-y divide-border/50">
              {entries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className={`flex items-center gap-3 sm:gap-4 px-4 py-3 hover:bg-muted/30 transition-colors ${
                    i === 0 ? 'bg-primary/5' : ''
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 flex-shrink-0 flex justify-center">{getRankIcon(i)}</div>

                  {/* Model Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{entry.name}</span>
                      <span className={`text-xs ${getProviderColor(entry.provider)} hidden sm:inline`}>
                        {entry.provider}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {entry.battles} battles
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {entry.wins}W / {entry.losses}L
                      </span>
                    </div>
                  </div>

                  {/* Win Rate */}
                  <div className="hidden sm:flex items-center gap-2 w-24">
                    <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${entry.winRate}%` }}
                        transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                        className={`h-full rounded-full ${
                          i === 0 ? 'bg-primary' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-muted-foreground/40'
                        }`}
                      />
                    </div>
                    <span className="text-xs font-mono w-8 text-right">{entry.winRate}%</span>
                  </div>

                  {/* ELO Score */}
                  <div className="flex-shrink-0 text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`text-lg font-bold font-mono ${i === 0 ? 'gradient-text' : ''}`}>
                          {entry.elo}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>ELO Rating — higher is better</p>
                      </TooltipContent>
                    </Tooltip>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ELO</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Empty State Component
   ═══════════════════════════════════════════ */

function EmptyState({ icon: Icon, title, description }: { icon: typeof Swords; title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Skeleton Loading
   ═══════════════════════════════════════════ */

function ArenaSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12">
          <div className="text-center">
            <Skeleton className="h-16 w-64 mx-auto mb-4 rounded-xl" />
            <Skeleton className="h-6 w-96 mx-auto mb-10 rounded-lg" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Skeleton className="h-10 w-80 mb-6 rounded-lg" />
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex gap-2 mb-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full ml-auto" />
                </div>
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-48 rounded-lg" />
                  <Skeleton className="h-48 rounded-lg" />
                </div>
              </CardContent>
              <CardFooter className="p-6">
                <div className="grid grid-cols-4 gap-2 w-full">
                  {[...Array(4)].map((_, j) => (
                    <Skeleton key={j} className="h-9 rounded-md" />
                  ))}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
