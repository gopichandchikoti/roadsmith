import { Component, type ReactNode } from 'react'
import { content } from '../content'
import { Button } from './Button'
import { RetryIcon } from './icons'
import { StatePanel } from './StatePanel'

type ChunkBoundaryProps = { children: ReactNode }
type ChunkBoundaryState = { failed: boolean }

/**
 * Catches a screen whose code failed to download, which on a weak signal is the likeliest thing to go wrong, and says so in
 * plain words with a way to try again. A failed download is remembered by the browser's module cache, so trying again
 * reloads the page rather than rendering the same failure.
 *
 * This is a class because React has no hook for catching a render error from a child.
 */
export class ChunkBoundary extends Component<ChunkBoundaryProps, ChunkBoundaryState> {
  state: ChunkBoundaryState = { failed: false }

  static getDerivedStateFromError(): ChunkBoundaryState {
    return { failed: true }
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    return (
      <StatePanel
        tone="error"
        title={content.states.error.title}
        action={
          <Button tone="primary" icon={RetryIcon} onClick={() => window.location.reload()}>
            {content.states.error.retry}
          </Button>
        }
      >
        {offline ? content.states.error.offlineBody : content.states.error.body}
      </StatePanel>
    )
  }
}
