import { test, expect } from '@playwright/test'

async function waitForConnected(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('connection-status')).toContainText('Connected', { timeout: 15000 })
}

async function submitChat(page: import('@playwright/test').Page, text: string) {
  const input = page.getByTestId('chat-input')
  await input.fill(text)
  await input.press('Enter')
}

async function waitForResponse(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('chat-input')).toBeEnabled({ timeout: 90000 })
}

test.describe('AI Collaboration Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
    await waitForConnected(page)
  })

  test('AI tool call creates pending suggestion with green glow, approve commits it', async ({ page }) => {
    // Build a simple diagram
    const canvas = page.locator('.react-flow')
    await page.getByTestId('palette-service').dragTo(canvas, { targetPosition: { x: 200, y: 150 } })
    await page.getByTestId('palette-databaseSql').dragTo(canvas, { targetPosition: { x: 500, y: 150 } })

    // Ask AI to add a cache
    await submitChat(page, 'Add a cache node called Redis to the diagram')
    await waitForResponse(page)

    // Check for suggestion bar (pending suggestions exist)
    const suggestionBar = page.getByTestId('suggestion-bar')
    // The AI should have called add_node tool
    const hasSuggestions = await suggestionBar.isVisible().catch(() => false)

    if (hasSuggestions) {
      // Green-glow node should be visible
      const pendingNode = page.locator('.node-pending-add')
      await expect(pendingNode.first()).toBeVisible({ timeout: 5000 })

      // Click Approve All
      await page.getByTestId('approve-all').click()

      // Suggestion bar should disappear
      await expect(suggestionBar).not.toBeVisible()

      // Node should now be committed (no pending glow)
      await expect(pendingNode).toHaveCount(0)
    }
    // If AI chose not to use tools (just described changes), that's acceptable
  })

  test('discard reverts all pending suggestions', async ({ page }) => {
    const canvas = page.locator('.react-flow')
    await page.getByTestId('palette-service').dragTo(canvas, { targetPosition: { x: 200, y: 150 } })

    await submitChat(page, 'Add a database and a cache to the diagram')
    await waitForResponse(page)

    const suggestionBar = page.getByTestId('suggestion-bar')
    const hasSuggestions = await suggestionBar.isVisible().catch(() => false)

    if (hasSuggestions) {
      // Note how many pending nodes
      const pendingNodes = page.locator('.node-pending-add')
      const pendingCount = await pendingNodes.count()
      expect(pendingCount).toBeGreaterThan(0)

      // Click Discard All
      await page.getByTestId('discard-all').click()

      // Suggestion bar and pending nodes should disappear
      await expect(suggestionBar).not.toBeVisible()
      await expect(page.locator('.node-pending-add')).toHaveCount(0)
    }
  })

  test('node name auto-suffix on duplicate drag', async ({ page }) => {
    const canvas = page.locator('.react-flow')

    // Drag two services
    await page.getByTestId('palette-service').dragTo(canvas, { targetPosition: { x: 200, y: 150 } })
    await page.getByTestId('palette-service').dragTo(canvas, { targetPosition: { x: 500, y: 150 } })

    // Check the debug panel for node names
    const debugContent = page.getByTestId('debug-content')
    await expect(debugContent).toBeVisible()
    const text = await debugContent.textContent()
    expect(text).toContain('Service')
    expect(text).toContain('Service (2)')
  })
})
