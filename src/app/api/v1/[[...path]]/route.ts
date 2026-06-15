import { NextRequest, NextResponse } from 'next/server'

/**
 * API v1 — proxies all /api/v1/* requests to /api/*
 *
 * This provides versioning without moving any existing routes.
 * Clients can use /api/v1/copilot as a stable endpoint.
 * When v2 is needed, create /api/v2/* with the new behavior.
 */

type Ctx = { params: Promise<{ path?: string[] }> }

async function proxyToUnversioned(request: NextRequest, ctx: Ctx) {
  const { path = [] } = await ctx.params
  const pathStr = path.join('/')
  if (!pathStr) return NextResponse.json({ error: 'Specify a v1 endpoint, e.g. /api/v1/copilot' }, { status: 400 })

  const url = new URL(`/api/${pathStr}`, request.url)
  url.search = request.nextUrl.search

  const init: RequestInit = {
    method: request.method,
    headers: Object.fromEntries(request.headers),
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer()
  }

  const response = await fetch(url, init)
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

export async function GET(request: NextRequest, ctx: Ctx) { return proxyToUnversioned(request, ctx) }
export async function POST(request: NextRequest, ctx: Ctx) { return proxyToUnversioned(request, ctx) }
export async function PUT(request: NextRequest, ctx: Ctx) { return proxyToUnversioned(request, ctx) }
export async function DELETE(request: NextRequest, ctx: Ctx) { return proxyToUnversioned(request, ctx) }
export async function PATCH(request: NextRequest, ctx: Ctx) { return proxyToUnversioned(request, ctx) }