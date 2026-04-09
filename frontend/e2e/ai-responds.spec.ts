import { test, expect } from '@playwright/test'

test.describe('AI Responds', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('shows connected status when backend is running', async ({ page }) => {
    const status = page.getByTestId('connection-status')
    await expect(status).toBeVisible()
    await expect(status).toContainText('Connected', { timeout: 15000 })
  })

  test('ask AI button is visible and enabled when connected', async ({ page }) => {
    const button = page.getByTestId('ask-ai-button')
    await expect(button).toBeVisible()
    // Wait for connection
    await expect(page.getByTestId('connection-status')).toContainText('Connected', { timeout: 15000 })
    await expect(button).toBeEnabled()
  })

  test('ask AI with a diagram produces a streaming response', async ({ page }) => {
    // Wait for connection
    await expect(page.getByTestId('connection-status')).toContainText('Connected', { timeout: 15000 })

    // Build a simple diagram
    const canvas = page.locator('.react-flow')
    await page.getByTestId('palette-service').dragTo(canvas, { targetPosition: { x: 200, y: 150 } })
    await page.getByTestId('palette-database').dragTo(canvas, { targetPosition: { x: 500, y: 150 } })

    // Click Ask AI
    await page.getByTestId('ask-ai-button').click()

    // Verify button disabled while streaming
    await expect(page.getByTestId('ask-ai-button')).toBeDisabled()

    // Chat panel should show a response (wait up to 30s for AI)
    const chatPanel = page.getByTestId('chat-panel')
    await expect(chatPanel).toBeVisible()

    // Wait for AI response to appear (may take a few seconds)
    const aiMessage = chatPanel.locator('.chat-message-assistant')
    await expect(aiMessage.first()).toBeVisible({ timeout: 30000 })

    // Wait for streaming to complete
    await expect(page.getByTestId('ask-ai-button')).toBeEnabled({ timeout: 60000 })

    // Verify the response has content
    const content = await aiMessage.first().locator('.chat-message-content').textContent()
    expect(content).toBeTruthy()
    expect(content!.length).toBeGreaterThan(10)
  })

  test('empty canvas ask AI still produces a response', async ({ page }) => {
    await expect(page.getByTestId('connection-status')).toContainText('Connected', { timeout: 15000 })

    // Click Ask AI with no components
    await page.getByTestId('ask-ai-button').click()

    // Should still get a response (suggesting where to start)
    const chatPanel = page.getByTestId('chat-panel')
    const aiMessage = chatPanel.locator('.chat-message-assistant')
    await expect(aiMessage.first()).toBeVisible({ timeout: 30000 })

    await expect(page.getByTestId('ask-ai-button')).toBeEnabled({ timeout: 60000 })
  })

  test('user action appears in chat before AI response', async ({ page }) => {
    await expect(page.getByTestId('connection-status')).toContainText('Connected', { timeout: 15000 })

    await page.getByTestId('ask-ai-button').click()

    // Verify user message appears
    const chatPanel = page.getByTestId('chat-panel')
    const userMessage = chatPanel.locator('.chat-message-user')
    await expect(userMessage.first()).toBeVisible()
    await expect(userMessage.first()).toContainText('Analyze my architecture')

    // Wait for completion
    await expect(page.getByTestId('ask-ai-button')).toBeEnabled({ timeout: 60000 })
  })
})
