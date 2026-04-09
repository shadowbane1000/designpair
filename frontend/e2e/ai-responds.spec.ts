import { test, expect } from '@playwright/test'

async function submitChat(page: import('@playwright/test').Page, text = '') {
  const input = page.getByTestId('chat-input')
  if (text) {
    await input.fill(text)
  }
  await input.press('Enter')
}

async function waitForConnected(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('connection-status')).toContainText('Connected', { timeout: 15000 })
}

async function waitForResponse(page: import('@playwright/test').Page) {
  // Wait for input to re-enable (streaming complete)
  await expect(page.getByTestId('chat-input')).toBeEnabled({ timeout: 60000 })
}

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

  test('chat input is visible and enabled when connected', async ({ page }) => {
    const input = page.getByTestId('chat-input')
    await expect(input).toBeVisible()
    await waitForConnected(page)
    await expect(input).toBeEnabled()
  })

  test('submit with diagram produces a streaming response', async ({ page }) => {
    await waitForConnected(page)

    const canvas = page.locator('.react-flow')
    await page.getByTestId('palette-service').dragTo(canvas, { targetPosition: { x: 200, y: 150 } })
    await page.getByTestId('palette-database').dragTo(canvas, { targetPosition: { x: 500, y: 150 } })

    await submitChat(page)

    // Input disabled while streaming
    await expect(page.getByTestId('chat-input')).toBeDisabled()

    const chatPanel = page.getByTestId('chat-panel')
    const aiMessage = chatPanel.locator('.chat-message-assistant')
    await expect(aiMessage.first()).toBeVisible({ timeout: 30000 })

    await waitForResponse(page)

    const content = await aiMessage.first().locator('.chat-message-content').textContent()
    expect(content).toBeTruthy()
    expect(content!.length).toBeGreaterThan(10)
  })

  test('empty canvas submit still produces a response', async ({ page }) => {
    await waitForConnected(page)

    await submitChat(page)

    const chatPanel = page.getByTestId('chat-panel')
    const aiMessage = chatPanel.locator('.chat-message-assistant')
    await expect(aiMessage.first()).toBeVisible({ timeout: 30000 })

    await waitForResponse(page)
  })

  test('user message appears in chat with default text for empty submit', async ({ page }) => {
    await waitForConnected(page)

    await submitChat(page)

    const chatPanel = page.getByTestId('chat-panel')
    const userMessage = chatPanel.locator('.chat-message-user')
    await expect(userMessage.first()).toBeVisible()
    await expect(userMessage.first()).toContainText('Analyze my architecture')

    await waitForResponse(page)
  })
})
