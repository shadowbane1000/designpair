import { test, expect } from '@playwright/test'

interface GraphNode {
  type: string
  name: string
}

interface GraphState {
  nodes: GraphNode[]
  edges: { source: string; target: string; label: string }[]
}

async function getGraphState(page: import('@playwright/test').Page): Promise<GraphState> {
  // Ensure debug panel is open
  const panel = page.getByTestId('debug-panel-json')
  if (!(await panel.isVisible())) {
    await page.getByTestId('debug-toggle').click()
  }
  const text = await panel.textContent()
  return JSON.parse(text!) as GraphState
}

test.describe('Drag and Connect', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('palette displays all 5 component types', async ({ page }) => {
    await expect(page.getByTestId('palette-service')).toBeVisible()
    await expect(page.getByTestId('palette-databaseSql')).toBeVisible()
    await expect(page.getByTestId('palette-cache')).toBeVisible()
    await expect(page.getByTestId('palette-messageQueue')).toBeVisible()
    await expect(page.getByTestId('palette-loadBalancer')).toBeVisible()
  })

  test('drag service from palette onto canvas', async ({ page }) => {
    const canvas = page.locator('.react-flow')
    await page.getByTestId('palette-service').dragTo(canvas)

    const state = await getGraphState(page)
    expect(state.nodes).toHaveLength(1)
    expect(state.nodes[0]?.type).toBe('service')
    expect(state.nodes[0]?.name).toBe('Service')
  })

  test('drag multiple component types onto canvas', async ({ page }) => {
    const canvas = page.locator('.react-flow')

    await page.getByTestId('palette-service').dragTo(canvas, { targetPosition: { x: 200, y: 100 } })
    await page.getByTestId('palette-databaseSql').dragTo(canvas, { targetPosition: { x: 400, y: 100 } })

    const state = await getGraphState(page)
    expect(state.nodes.length).toBeGreaterThanOrEqual(2)

    const types = state.nodes.map((n) => n.type)
    expect(types).toContain('service')
    expect(types).toContain('databaseSql')
  })

  test('debug panel toggles and shows graph state JSON', async ({ page }) => {
    const canvas = page.locator('.react-flow')
    await page.getByTestId('palette-service').dragTo(canvas)

    // Panel should be hidden by default
    await expect(page.getByTestId('debug-panel-json')).not.toBeVisible()

    // Toggle open
    await page.getByTestId('debug-toggle').click()
    await expect(page.getByTestId('debug-panel-json')).toBeVisible()

    const state = await getGraphState(page)
    expect(state.nodes).toHaveLength(1)
    expect(state.edges).toHaveLength(0)

    // Toggle closed
    await page.getByTestId('debug-toggle').click()
    await expect(page.getByTestId('debug-panel-json')).not.toBeVisible()
  })

  test('full flow: drag, verify types in JSON', async ({ page }) => {
    const canvas = page.locator('.react-flow')

    await page.getByTestId('palette-service').dragTo(canvas, { targetPosition: { x: 200, y: 150 } })
    await page.getByTestId('palette-databaseSql').dragTo(canvas, { targetPosition: { x: 500, y: 150 } })

    const state = await getGraphState(page)
    expect(state.nodes.length).toBeGreaterThanOrEqual(2)

    const types = state.nodes.map((n) => n.type)
    expect(types).toContain('service')
    expect(types).toContain('databaseSql')
  })

  test('delete node with Delete key removes it from graph state', async ({ page }) => {
    const canvas = page.locator('.react-flow')
    await page.getByTestId('palette-service').dragTo(canvas)

    // Verify node exists
    let state = await getGraphState(page)
    expect(state.nodes).toHaveLength(1)

    // Click the canvas background first to deselect anything, then click the node
    await canvas.click({ position: { x: 10, y: 10 } })
    const node = page.locator('.react-flow__node').first()
    await node.click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('Backspace')

    // Wait and verify node removed
    await page.waitForTimeout(300)
    state = await getGraphState(page)
    expect(state.nodes).toHaveLength(0)
  })
})
