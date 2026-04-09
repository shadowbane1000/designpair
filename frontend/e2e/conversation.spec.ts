import { test, expect } from '@playwright/test'

async function waitForConnected(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('connection-status')).toContainText('Connected', { timeout: 15000 })
}

async function submitChat(page: import('@playwright/test').Page, text = '') {
  const input = page.getByTestId('chat-input')
  if (text) {
    await input.fill(text)
  }
  await input.press('Enter')
}

async function waitForResponse(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('chat-input')).toBeEnabled({ timeout: 60000 })
}

test.describe('Multi-Turn Conversation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('multi-turn conversation maintains context', async ({ page }) => {
    await waitForConnected(page)

    // Build a diagram
    const canvas = page.locator('.react-flow')
    await page.getByTestId('palette-service').dragTo(canvas, { targetPosition: { x: 200, y: 150 } })
    await page.getByTestId('palette-databaseSql').dragTo(canvas, { targetPosition: { x: 500, y: 150 } })

    // First turn: default analysis
    await submitChat(page)
    await waitForResponse(page)

    // Second turn: follow-up question
    await submitChat(page, 'What if I added a cache?')
    await waitForResponse(page)

    // Verify both messages visible
    const chatPanel = page.getByTestId('chat-panel')
    const userMessages = chatPanel.locator('.chat-message-user')
    const aiMessages = chatPanel.locator('.chat-message-assistant')

    await expect(userMessages).toHaveCount(2)
    await expect(aiMessages).toHaveCount(2)

    // Second user message should show the typed text
    await expect(userMessages.last()).toContainText('What if I added a cache?')
  })

  test('input disabled while streaming', async ({ page }) => {
    await waitForConnected(page)

    await submitChat(page)

    // Should be disabled during streaming
    await expect(page.getByTestId('chat-input')).toBeDisabled()

    // Wait for completion — should re-enable
    await waitForResponse(page)
    await expect(page.getByTestId('chat-input')).toBeEnabled()
  })

  test('custom question text appears in user message', async ({ page }) => {
    await waitForConnected(page)

    await submitChat(page, 'Is this a good design?')

    const chatPanel = page.getByTestId('chat-panel')
    const userMessage = chatPanel.locator('.chat-message-user').first()
    await expect(userMessage).toContainText('Is this a good design?')

    await waitForResponse(page)
  })
})
