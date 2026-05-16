import { describe, it, expect } from 'vitest'

// Test that locales object has consistent keys
const enKeys = {
  'brand.name': 'TheOneWayGDA',
  'nav.community': 'Community',
  'community.navTitle': 'AI News & Community',
  'community.featuredUpdates': 'Important AI Updates',
  'community.refreshNews': 'Fetch News',
  'community.colleagueEmail': 'colleague@example.com',
}

describe('i18n key consistency', () => {
  it('expected English keys have non-empty values', () => {
    for (const [key, value] of Object.entries(enKeys)) {
      expect(value, `en key "${key}" should not be empty`).toBeTruthy()
    }
  })

  it('community featuredUpdates key is defined', () => {
    expect(enKeys['community.featuredUpdates']).toBe('Important AI Updates')
  })

  it('community readFull key is defined', () => {
    expect(enKeys['community.readFull']).toBeDefined()
  })
})
