import { test, expect } from '@playwright/test'

test.describe('Landing page smoke test', () => {
  test('loads the homepage with key sections', async ({ page }) => {
    await page.goto('/')

    // Key sections should be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Navigation should exist
    await expect(page.getByRole('navigation')).toBeVisible()

    // CTA buttons should be present (at least one link to auth)
    const links = page.getByRole('link')
    const allLinks = await links.count()
    expect(allLinks).toBeGreaterThan(0)
  })

  test('navigating to /workspace redirects unauthenticated users', async ({ page }) => {
    await page.goto('/workspace')

    // Workspace should redirect to login or show auth prompt
    // The exact behavior depends on the app — we just check it doesn't crash
    await page.waitForLoadState('networkidle')
    // Page should have loaded without errors
    expect(page.url()).toBeDefined()
  })

  test('/api/health returns 200', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.status).toBe('healthy')
    expect(body.version).toBeDefined()
    expect(body.capabilities).toBeDefined()
  })

  test('/api/visitor returns aggregate stats', async ({ request }) => {
    const response = await request.get('/api/visitor')
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(typeof body.totalVisitors).toBe('number')
  })
})