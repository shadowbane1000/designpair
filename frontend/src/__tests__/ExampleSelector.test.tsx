import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExampleSelector } from '../components/ExampleSelector/ExampleSelector'
import { exampleDiagrams } from '../data/examples'

const baseProps = {
  onSelect: vi.fn(),
  onClose: vi.fn(),
}

describe('ExampleSelector', () => {
  it('renders all example diagrams', () => {
    render(<ExampleSelector {...baseProps} />)

    for (const example of exampleDiagrams) {
      expect(screen.getByText(example.name)).toBeInTheDocument()
      expect(screen.getByText(example.description)).toBeInTheDocument()
    }
  })

  it('renders the correct node and edge counts for each example', () => {
    render(<ExampleSelector {...baseProps} />)

    for (const example of exampleDiagrams) {
      const card = screen.getByTestId(`example-card-${example.id}`)
      expect(card).toHaveTextContent(
        `${String(example.nodes.length)} nodes`,
      )
      expect(card).toHaveTextContent(
        `${String(example.edges.length)} connections`,
      )
    }
  })

  it('fires onSelect with the correct example when a card is clicked', () => {
    const onSelect = vi.fn()
    render(<ExampleSelector {...baseProps} onSelect={onSelect} />)

    const firstExample = exampleDiagrams[0]
    if (!firstExample) throw new Error('No examples found')

    const card = screen.getByTestId(`example-card-${firstExample.id}`)
    fireEvent.click(card)

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(firstExample)
  })

  it('fires onClose when overlay background is clicked', () => {
    const onClose = vi.fn()
    render(<ExampleSelector {...baseProps} onClose={onClose} />)

    const overlay = screen.getByTestId('example-selector-overlay')
    fireEvent.click(overlay)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not fire onClose when selector content is clicked', () => {
    const onClose = vi.fn()
    render(<ExampleSelector {...baseProps} onClose={onClose} />)

    const selector = screen.getByTestId('example-selector')
    fireEvent.click(selector)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('fires onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<ExampleSelector {...baseProps} onClose={onClose} />)

    const closeBtn = screen.getByTestId('example-close')
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders at least one example diagram', () => {
    render(<ExampleSelector {...baseProps} />)
    expect(exampleDiagrams.length).toBeGreaterThan(0)
    // Each example should have a card button
    const cards = screen.getAllByRole('button', { name: /.*nodes.*connections.*/ })
    expect(cards.length).toBe(exampleDiagrams.length)
  })
})
