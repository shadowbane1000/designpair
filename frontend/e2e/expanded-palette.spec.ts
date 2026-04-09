import { test, expect } from '@playwright/test'

interface GraphState {
  nodes: { type: string; name: string; replicaCount?: number }[]
  edges: unknown[]
}

async function getGraphState(page: import('@playwright/test').Page): Promise<GraphState> {
  const panel = page.getByTestId('debug-panel-json')
  if (!(await panel.isVisible())) {
    await page.getByTestId('debug-toggle').click()
  }
  const text = await panel.textContent()
  return JSON.parse(text!) as GraphState
}

test.describe('Expanded Palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('all 5 category headings are visible', async ({ page }) => {
    await expect(page.getByTestId('category-compute')).toBeVisible()
    await expect(page.getByTestId('category-data')).toBeVisible()
    await expect(page.getByTestId('category-messaging')).toBeVisible()
    await expect(page.getByTestId('category-network')).toBeVisible()
    await expect(page.getByTestId('category-clients')).toBeVisible()
  })

  test('drag new component type (apiGateway) onto canvas', async ({ page }) => {
    const canvas = page.locator('.react-flow')
    await page.getByTestId('palette-apiGateway').dragTo(canvas)

    const state = await getGraphState(page)
    expect(state.nodes).toHaveLength(1)
    expect(state.nodes[0]?.type).toBe('apiGateway')
    expect(state.nodes[0]?.name).toBe('API Gateway')
  })

  test('set replica count on a service node', async ({ page }) => {
    const canvas = page.locator('.react-flow')
    await page.getByTestId('palette-service').dragTo(canvas)

    // Get the node ID from graph state
    const state = await getGraphState(page)
    const nodeId = state.nodes[0]?.type === 'service' ? state.nodes[0] : undefined
    expect(nodeId).toBeTruthy()

    // Find the replica input and set to 3
    const replicaInput = page.locator('[data-testid^="replica-input-"]').first()
    await replicaInput.fill('3')

    // Verify in graph state
    const updated = await getGraphState(page)
    expect(updated.nodes[0]?.replicaCount).toBe(3)
  })

  test('serverless function does not show replica control', async ({ page }) => {
    const canvas = page.locator('.react-flow')
    await page.getByTestId('palette-serverlessFunction').dragTo(canvas)

    // Should not have a replica input
    const replicaInputs = page.locator('[data-testid^="replica-input-"]')
    await expect(replicaInputs).toHaveCount(0)
  })

  test('collapsing a category hides its components', async ({ page }) => {
    // Verify a component is visible
    await expect(page.getByTestId('palette-service')).toBeVisible()

    // Collapse compute category
    await page.getByTestId('category-compute').click()

    // Component should be hidden
    await expect(page.getByTestId('palette-service')).not.toBeVisible()

    // Expand again
    await page.getByTestId('category-compute').click()
    await expect(page.getByTestId('palette-service')).toBeVisible()
  })
})
