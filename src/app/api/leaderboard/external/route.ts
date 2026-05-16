import { NextResponse } from 'next/server';

// ── Simple in-memory cache (1-hour TTL) ─────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const externalCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCached<T>(key: string): T | null {
  const entry = externalCache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data as T;
  }
  if (entry) externalCache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  externalCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── HuggingFace ─────────────────────────────────────────────────────────────

interface HFModel {
  id: string;
  modelId: string;
  author: string;
  sha: string;
  lastModified: string;
  private: boolean;
  disabled: boolean;
  gated: string | false;
  pipeline_tag: string | null;
  tags: string[];
  downloads: number;
  likes: number;
  library_name: string | null;
  createdAt: string;
}

async function fetchHuggingFaceModels() {
  const cacheKey = 'huggingface:top-models';
  const cached = getCached<unknown[]>(cacheKey);
  if (cached) return { source: 'huggingface', status: 'cached', models: cached, count: cached.length, fetchedAt: new Date().toISOString() };

  const res = await fetch('https://huggingface.co/api/models?sort=downloads&direction=-1&limit=20', {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`HuggingFace API returned ${res.status}`);
  }

  const raw: HFModel[] = await res.json();
  const models = raw.map((m) => ({
    id: m.id,
    author: m.author,
    pipeline_tag: m.pipeline_tag || 'unknown',
    downloads: m.downloads,
    likes: m.likes,
    tags: m.tags.slice(0, 5),
    lastModified: m.lastModified,
    url: `https://huggingface.co/${m.id}`,
  }));

  setCache(cacheKey, models);
  return { source: 'huggingface', status: 'live', models, count: models.length, fetchedAt: new Date().toISOString() };
}

// ── GitHub ──────────────────────────────────────────────────────────────────

interface GHRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  created_at: string;
  updated_at: string;
  topics: string[];
  owner: { login: string; avatar_url: string };
}

async function fetchGitHubRepos() {
  const cacheKey = 'github:top-repos';
  const cached = getCached<unknown[]>(cacheKey);
  if (cached) return { source: 'github', status: 'cached', repos: cached, count: cached.length, fetchedAt: new Date().toISOString() };

  const res = await fetch('https://api.github.com/search/repositories?q=language+model&sort=stars&order=desc&per_page=10', {
    headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'TheOneWayGDA-Bot' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status}`);
  }

  const raw = await res.json();
  const items: GHRepo[] = raw.items ?? [];
  const repos = items.map((r) => ({
    id: r.id,
    name: r.full_name,
    description: r.description,
    stars: r.stargazers_count,
    forks: r.forks_count,
    language: r.language,
    topics: r.topics.slice(0, 5),
    url: r.html_url,
    owner: r.owner.login,
    avatar: r.owner.avatar_url,
    updatedAt: r.updated_at,
  }));

  setCache(cacheKey, repos);
  return { source: 'github', status: 'live', repos, count: repos.length, fetchedAt: new Date().toISOString() };
}

// ── Route Handler ───────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'huggingface';

    if (type === 'huggingface') {
      const data = await fetchHuggingFaceModels();
      return NextResponse.json(data);
    }

    if (type === 'github') {
      const data = await fetchGitHubRepos();
      return NextResponse.json(data);
    }

    // Fetch both when type=all
    if (type === 'all') {
      const [hf, gh] = await Promise.allSettled([fetchHuggingFaceModels(), fetchGitHubRepos()]);
      return NextResponse.json({
        huggingface: hf.status === 'fulfilled' ? hf.value : { source: 'huggingface', status: 'error', error: hf.reason instanceof Error ? hf.reason.message : 'Failed to fetch' },
        github: gh.status === 'fulfilled' ? gh.value : { source: 'github', status: 'error', error: gh.reason instanceof Error ? gh.reason.message : 'Failed to fetch' },
        fetchedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: 'Invalid type. Use huggingface, github, or all.' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
