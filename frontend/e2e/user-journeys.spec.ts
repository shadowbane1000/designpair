import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

// ─── Helpers ────────────────────────────────────────────────────────────────

interface GraphNode {
  type: string
  name: string
}

interface GraphState {
  nodes: GraphNode[]
  edges: { source: string; target: string; label: string; protocol?: string }[]
}

async function getGraphState(page: import('@playwright/test').Page): Promise<GraphState> {
  const panel = page.getByTestId('debug-panel-json')
  if (!(await panel.isVisible())) {
    await page.getByTestId('debug-toggle').click()
  }
  const text = await panel.textContent()
  return JSON.parse(text!) as GraphState
}

async function dragNodeToCanvas(
  page: import('@playwright/test').Page,
  paletteTestId: string,
  position: { x: number; y: number } = { x: 300, y: 200 },
) {
  const canvas = page.locator('.react-flow')
  await page.getByTestId(paletteTestId).dragTo(canvas, { targetPosition: position })
}

// ─── 1. Example Diagram Flow ────────────────────────────────────────────────

test.describe('Example Diagram Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?debug')
    await page.waitForSelector('.react-flow')
  })

  test('load an example diagram and verify nodes appear with suggested question', async ({ page }) => {
    // Click the Examples button
    await page.getByTestId('examples-button').click()

    // Verify the example selector overlay appears
    await expect(page.getByTestId('example-selector-overlay')).toBeVisible()

    // Click the first example card (E-commerce Microservices)
    await page.getByTestId('example-card-ecommerce-microservices').click()

    // Selector should close
    await expect(page.getByTestId('example-selector-overlay')).not.toBeVisible()

    // Verify nodes appear on canvas
    const state = await getGraphState(page)
    expect(state.nodes.length).toBeGreaterThanOrEqual(5)

    // Verify the suggested question is populated in the chat input
    const chatInput = page.getByTestId('chat-input')
    await expect(chatInput).toHaveValue('How would you improve the scalability of this system?')
  })

  test('loading example on non-empty canvas shows confirmation dialog', async ({ page }) => {
    // First, add a node to make the canvas non-empty
    await dragNodeToCanvas(page, 'palette-service')

    // Click Examples
    await page.getByTestId('examples-button').click()
    await page.getByTestId('example-card-realtime-chat').click()

    // Confirmation dialog should appear
    await expect(page.getByTestId('confirm-overlay')).toBeVisible()

    // Click Replace
    await page.getByTestId('confirm-replace').click()

    // Confirmation should close and new diagram should load
    await expect(page.getByTestId('confirm-overlay')).not.toBeVisible()

    const state = await getGraphState(page)
    // Real-time Chat has 6 nodes
    expect(state.nodes.length).toBeGreaterThanOrEqual(4)
  })

  test('cancelling confirmation keeps original diagram', async ({ page }) => {
    await dragNodeToCanvas(page, 'palette-service')

    const stateBefore = await getGraphState(page)
    expect(stateBefore.nodes).toHaveLength(1)

    await page.getByTestId('examples-button').click()
    await page.getByTestId('example-card-realtime-chat').click()

    await expect(page.getByTestId('confirm-overlay')).toBeVisible()
    await page.getByTestId('confirm-cancel').click()

    await expect(page.getByTestId('confirm-overlay')).not.toBeVisible()

    const stateAfter = await getGraphState(page)
    expect(stateAfter.nodes).toHaveLength(1)
  })
})

// ─── 2. Export/Import Round-Trip ────────────────────────────────────────────

test.describe('Export/Import Round-Trip', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?debug')
    await page.waitForSelector('.react-flow')
  })

  test('export a diagram then import it and verify restoration', async ({ page }) => {
    // Build a diagram with two nodes
    await dragNodeToCanvas(page, 'palette-service', { x: 200, y: 150 })
    await dragNodeToCanvas(page, 'palette-databaseSql', { x: 500, y: 150 })

    const originalState = await getGraphState(page)
    expect(originalState.nodes.length).toBeGreaterThanOrEqual(2)

    const originalNodeNames = originalState.nodes.map((n) => n.name).sort()
    const originalNodeTypes = originalState.nodes.map((n) => n.type).sort()

    // Set up download listener and trigger export
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('export-button').click()
    const download = await downloadPromise

    // Save the downloaded file to a temp location
    const tmpDir = path.join(__dirname, '..', 'test-results', 'tmp')
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true })
    }
    const downloadPath = path.join(tmpDir, 'exported-diagram.json')
    await download.saveAs(downloadPath)

    // Verify the downloaded file is valid JSON with nodes and edges
    const fileContent = fs.readFileSync(downloadPath, 'utf-8')
    const parsed = JSON.parse(fileContent) as { version: number; nodes: unknown[]; edges: unknown[] }
    expect(parsed.version).toBe(1)
    expect(parsed.nodes.length).toBeGreaterThanOrEqual(2)

    // Clear the canvas by selecting all nodes and deleting them
    await page.locator('.react-flow').click()
    await page.keyboard.press('Control+a')
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(300)

    const clearedState = await getGraphState(page)
    expect(clearedState.nodes).toHaveLength(0)

    // Import the diagram back via the file input
    const fileInput = page.getByTestId('import-file-input')
    await fileInput.setInputFiles(downloadPath)

    // Wait for nodes to reappear
    await page.waitForTimeout(500)
    const restoredState = await getGraphState(page)
    expect(restoredState.nodes.length).toBeGreaterThanOrEqual(2)

    // Verify the same node types are present
    const restoredTypes = restoredState.nodes.map((n) => n.type).sort()
    expect(restoredTypes).toEqual(originalNodeTypes)

    // Verify node names match
    const restoredNames = restoredState.nodes.map((n) => n.name).sort()
    expect(restoredNames).toEqual(originalNodeNames)

    // Cleanup
    if (fs.existsSync(downloadPath)) {
      fs.unlinkSync(downloadPath)
    }
  })
})

// ─── 3. Node Interaction ────────────────────────────────────────────────────

test.describe('Node Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?debug')
    await page.waitForSelector('.react-flow')
  })

  test('drag a node from palette and verify it appears with default name', async ({ page }) => {
    await dragNodeToCanvas(page, 'palette-service')

    const state = await getGraphState(page)
    expect(state.nodes).toHaveLength(1)
    expect(state.nodes[0]?.type).toBe('service')
    expect(state.nodes[0]?.name).toBe('Service')
  })

  test('auto-suffix on duplicate: second Service becomes "Service (2)"', async ({ page }) => {
    await dragNodeToCanvas(page, 'palette-service', { x: 200, y: 150 })
    await dragNodeToCanvas(page, 'palette-service', { x: 500, y: 150 })

    const state = await getGraphState(page)
    expect(state.nodes).toHaveLength(2)

    const names = state.nodes.map((n) => n.name).sort()
    expect(names).toContain('Service')
    expect(names).toContain('Service (2)')
  })

  test('third duplicate gets suffix (3)', async ({ page }) => {
    await dragNodeToCanvas(page, 'palette-service', { x: 150, y: 150 })
    await dragNodeToCanvas(page, 'palette-service', { x: 350, y: 150 })
    await dragNodeToCanvas(page, 'palette-service', { x: 550, y: 150 })

    const state = await getGraphState(page)
    expect(state.nodes).toHaveLength(3)

    const names = state.nodes.map((n) => n.name).sort()
    expect(names).toContain('Service')
    expect(names).toContain('Service (2)')
    expect(names).toContain('Service (3)')
  })

  test('different component types get their own default names', async ({ page }) => {
    await dragNodeToCanvas(page, 'palette-service', { x: 200, y: 150 })
    await dragNodeToCanvas(page, 'palette-cache', { x: 450, y: 150 })

    const state = await getGraphState(page)
    expect(state.nodes).toHaveLength(2)

    const names = state.nodes.map((n) => n.name)
    expect(names).toContain('Service')
    expect(names).toContain('Cache')
  })
})

// ─── 4. Edge Context Menu ───────────────────────────────────────────────────

test.describe('Edge Context Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?debug')
    await page.waitForSelector('.react-flow')
  })

  test('create edge, click it, verify context menu, select protocol, dismiss', async ({ page }) => {
    // Load an example that has edges pre-connected
    await page.getByTestId('examples-button').click()
    await page.getByTestId('example-card-url-shortener').click()

    // Wait for the diagram to load
    await page.waitForTimeout(500)

    const state = await getGraphState(page)
    expect(state.edges.length).toBeGreaterThan(0)

    // Click an edge element to open context menu
    const edgeInteraction = page.locator('.react-flow__edge').first()
    await edgeInteraction.click({ force: true })

    // Verify context menu appears
    await expect(page.getByTestId('edge-context-menu')).toBeVisible({ timeout: 3000 })

    // Select a protocol from the menu
    const protocolButtons = page.getByTestId('protocol-select').locator('button')
    const buttonCount = await protocolButtons.count()
    expect(buttonCount).toBeGreaterThan(0)

    // Click the first non-active protocol button
    for (let i = 0; i < buttonCount; i++) {
      const btn = protocolButtons.nth(i)
      const isActive = await btn.evaluate((el) => el.classList.contains('active'))
      if (!isActive) {
        await btn.click()
        break
      }
    }

    // Dismiss by clicking outside (press Escape)
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('edge-context-menu')).not.toBeVisible()
  })
})

// ─── 5. Clear Canvas ────────────────────────────────────────────────────────

test.describe('Clear Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?debug')
    await page.waitForSelector('.react-flow')
  })

  test('select all nodes and delete to clear the canvas', async ({ page }) => {
    // Build a diagram with multiple nodes
    await dragNodeToCanvas(page, 'palette-service', { x: 200, y: 150 })
    await dragNodeToCanvas(page, 'palette-databaseSql', { x: 450, y: 150 })
    await dragNodeToCanvas(page, 'palette-cache', { x: 300, y: 350 })

    const stateBefore = await getGraphState(page)
    expect(stateBefore.nodes.length).toBeGreaterThanOrEqual(3)

    // Select all with Ctrl+A, then delete
    await page.locator('.react-flow').click()
    await page.keyboard.press('Control+a')
    await page.keyboard.press('Backspace')

    await page.waitForTimeout(300)

    const stateAfter = await getGraphState(page)
    expect(stateAfter.nodes).toHaveLength(0)
    expect(stateAfter.edges).toHaveLength(0)
  })

  test('loading an example replaces existing diagram (acts as clear + load)', async ({ page }) => {
    // Build initial diagram
    await dragNodeToCanvas(page, 'palette-service', { x: 200, y: 150 })
    await dragNodeToCanvas(page, 'palette-cache', { x: 450, y: 150 })

    const stateBefore = await getGraphState(page)
    expect(stateBefore.nodes).toHaveLength(2)

    // Load an example (will show confirmation since canvas is non-empty)
    await page.getByTestId('examples-button').click()
    await page.getByTestId('example-card-url-shortener').click()
    await page.getByTestId('confirm-replace').click()

    await page.waitForTimeout(500)

    const stateAfter = await getGraphState(page)
    // URL Shortener has 5 nodes -- completely replaced old diagram
    expect(stateAfter.nodes.length).toBeGreaterThanOrEqual(4)
  })
})

// ─── 6. Responsive Layout ──────────────────────────────────────────────────

test.describe('Responsive Layout', () => {
  test('palette toggle button is visible on mobile viewport', async ({ page }) => {
    // Start at desktop width where toggle is hidden
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await page.waitForSelector('.react-flow')

    // On desktop, the palette toggle should be hidden (display: none)
    const toggleBtn = page.getByTestId('palette-toggle')
    await expect(toggleBtn).toBeHidden()

    // Resize to mobile width
    await page.setViewportSize({ width: 500, height: 720 })

    // On mobile, the palette toggle should be visible
    await expect(toggleBtn).toBeVisible()
  })

  test('palette toggle hides and shows the palette on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 720 })
    await page.goto('/')
    await page.waitForSelector('.react-flow')

    // Palette should be visible initially (paletteOpen defaults to true)
    await expect(page.locator('.palette')).toBeVisible()

    // Click the toggle to hide palette
    await page.getByTestId('palette-toggle').click()
    await expect(page.locator('.palette')).not.toBeVisible()

    // Click toggle again to show palette
    await page.getByTestId('palette-toggle').click()
    await expect(page.locator('.palette')).toBeVisible()
  })
})

// ─── AI Tests (require ANTHROPIC_API_KEY) ───────────────────────────────────

test.describe('AI-powered features', () => {
  const hasApiKey = !!process.env['ANTHROPIC_API_KEY']

  test.skip(!hasApiKey, 'Skipped: ANTHROPIC_API_KEY not set')

  test.beforeEach(async ({ page }) => {
    await page.goto('/?debug')
    await page.waitForSelector('.react-flow')
    await expect(page.getByTestId('connection-status')).toContainText('Connected', { timeout: 15000 })
  })

  test('load example and ask suggested question', async ({ page }) => {
    await page.getByTestId('examples-button').click()
    await page.getByTestId('example-card-ecommerce-microservices').click()

    // Verify suggested question is in input
    const chatInput = page.getByTestId('chat-input')
    await expect(chatInput).toHaveValue('How would you improve the scalability of this system?')

    // Submit the suggested question
    await chatInput.press('Enter')

    // Wait for AI response
    await expect(chatInput).toBeDisabled()
    await expect(chatInput).toBeEnabled({ timeout: 90000 })

    // Verify a response appeared
    const chatPanel = page.getByTestId('chat-panel')
    const aiMessage = chatPanel.locator('.chat-message-assistant')
    await expect(aiMessage.first()).toBeVisible()

    const content = await aiMessage.first().locator('.chat-message-content').textContent()
    expect(content).toBeTruthy()
    expect(content!.length).toBeGreaterThan(10)
  })
})
