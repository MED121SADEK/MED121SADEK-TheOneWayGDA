---
Task ID: 3a+3b
Agent: Main Agent
Task: Dark/Light Theme Toggle (3a) + User Onboarding Tour (3b)

Work Log:
- Created `/src/components/theme-toggle.tsx`:
  - Premium animated theme toggle button with Sun/Moon icons from lucide-react
  - Framer Motion rotate + scale animation on icon transition
  - Tooltip showing "Light mode" / "Dark mode" on hover using shadcn/ui Tooltip
  - Uses `next-themes` `useTheme()` hook for theme state management
  - Supports system preference detection via ThemeProvider config
  - Handles hydration mismatch by using `requestAnimationFrame` for mounted state
  - Returns placeholder button during SSR to avoid flicker

- Updated `/src/components/providers.tsx`:
  - Added `ThemeProvider` from `next-themes` wrapping the ErrorBoundary
  - Config: `attribute="class"`, `defaultTheme="dark"`, `enableSystem={true}`, `disableTransitionOnChange={false}`
  - Preserves existing ErrorBoundary error handling

- Updated `/src/app/layout.tsx`:
  - Removed hardcoded `className="dark"` from `<html>` tag
  - Added `OnboardingTour` import and component after `<AiCopilot />`
  - ThemeProvider now controls the dark class dynamically

- Updated `/src/components/landing/Navbar.tsx`:
  - Added `ThemeToggle` import
  - Desktop nav: Added `<ThemeToggle />` between language selector and workspace button
  - Mobile menu: Added `<ThemeToggle />` next to language selector in a flex row

- Created `/src/components/onboarding-tour.tsx`:
  - 'use client' component with 5-step interactive tour
  - Step 1: Welcome — Logo, tagline, animated gradient ring
  - Step 2: AI Leaderboard — Top 3 model cards with scores, "+47 more" indicator
  - Step 3: Workspace — 6 specialist assistant cards in grid layout
  - Step 4: Community — Avatar group, workflow stats
  - Step 5: Get Started — Animated rocket, feature pills
  - Uses shadcn/ui Dialog component for modal
  - localStorage key `oneway-tour-completed` for persistence
  - Auto-shows on first visit (1.2s delay)
  - Progress dots (clickable to jump to any step)
  - Next/Prev/Skip navigation buttons
  - Framer Motion slide animations between steps (directional based on nav direction)
  - Gradient CTA button on final step
  - `__oneway_replay_tour` global function exposed for settings replay
  - Escape key and outside click prevented (must use buttons)
  - Accessible: sr-only title/description, aria-labels on buttons

- Updated `/src/app/globals.css`:
  - Added light mode overrides for `.nav-premium`, `.footer-premium`, and `.glass-card`
  - Uses `:root:not(.dark)` selector for light-mode-specific styling
  - Prevents dark nav/footer when user switches to light mode

Stage Summary:
- Files Created: 2 (theme-toggle.tsx, onboarding-tour.tsx)
- Files Modified: 4 (providers.tsx, layout.tsx, Navbar.tsx, globals.css)
- Lint Status: 0 new errors in modified files (53 pre-existing errors in other files)
- Build Status: Compiled successfully, no module errors
- Theme: Dark (default) → Light toggle works, system preference supported
- Onboarding: 5-step tour with animations, localStorage persistence, replay support
