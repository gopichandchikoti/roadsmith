import type { ReactNode } from 'react'
import { PageHeading } from './PageHeading'
import './Hero.css'

type HeroProps = {
  heading: string
  lede?: string
  /** Which of a fixed number of questions this screen is: filled segments beside the words, so progress never rests on colour. */
  step?: { current: number; total: number; label: string }
  /** The control the screen is for, such as the search box. */
  children?: ReactNode
}

/** The head of a screen: its one h1, one sentence of help and, where it applies, the control the screen is for. */
export function Hero({ heading, lede, step, children }: HeroProps) {
  const segments = step ? Array.from({ length: step.total }, (_, index) => index + 1) : []
  return (
    <header className="hero">
      <PageHeading>{heading}</PageHeading>
      {lede ? <p className="hero__lede">{lede}</p> : null}
      {step ? (
        <div className="hero__step">
          <span className="hero__meter" aria-hidden="true">
            {segments.map((segment) => (
              <span key={segment} className="hero__segment" data-filled={segment <= step.current} />
            ))}
          </span>
          <p>{step.label}</p>
        </div>
      ) : null}
      {children}
    </header>
  )
}
