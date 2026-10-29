import { useId, useState } from 'react'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { ForwardIcon, OfflineIcon, RetryIcon, SearchIcon } from '../../components/icons'
import { ListSkeleton } from '../../components/ListSkeleton'
import { PageHeading } from '../../components/PageHeading'
import { ProblemRow } from '../../components/ProblemRow'
import { StatePanel } from '../../components/StatePanel'
import { TextField } from '../../components/TextField'
import { content } from '../../content'
import { useCatalog } from '../../hooks/useCatalog'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { hrefs } from '../../routes/route'
import { useRouter } from '../../routes/router-context'
import { fill } from '../../utils/format'
import { searchProblems } from '../../utils/search'
import { MAX_QUERY_LENGTH, normalizeQuery } from '../../validators/text'
import './BrowsePanel.css'

type BrowsePanelProps = {
  query: string
  category: string | null
}

/** Find a known problem: type a few words, narrow by category, pick one. The search and category live in the address. */
export function BrowsePanel({ query, category }: BrowsePanelProps) {
  const { navigate } = useRouter()
  const { state, retry } = useCatalog()
  // What the driver has typed, so a trailing space survives. If Back or Forward changes the address, the address wins.
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft !== null && normalizeQuery(draft) === query ? draft : query
  const categoryId = useId()
  useDocumentTitle(content.browse.title)

  const go = (nextText: string, nextCategory: string | null) =>
    navigate(hrefs.home({ query: normalizeQuery(nextText), category: nextCategory }), { replace: true })

  if (state.status === 'loading') {
    return (
      <div className="browse">
        <PageHeading>{content.browse.heading}</PageHeading>
        <ListSkeleton />
      </div>
    )
  }

  if (state.status === 'error') {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    return (
      <div className="browse">
        <PageHeading>{content.browse.heading}</PageHeading>
        <StatePanel
          tone="error"
          icon={offline ? OfflineIcon : undefined}
          title={content.states.error.title}
          action={
            <Button tone="primary" icon={RetryIcon} onClick={retry}>
              {content.states.error.retry}
            </Button>
          }
        >
          {offline ? content.states.error.offlineBody : content.states.error.body}
        </StatePanel>
      </div>
    )
  }

  const { categories, problems } = state.catalog
  const activeCategory = categories.some((item) => item.id === category) ? category : null
  const results = searchProblems(problems, query, activeCategory)
  const groups = categories
    .map((item) => ({ category: item, problems: results.filter((problem) => problem.category === item.id) }))
    .filter((group) => group.problems.length > 0)
  const count = fill(results.length === 1 ? content.browse.count.one : content.browse.count.other, { count: results.length })

  return (
    <div className="browse">
      <PageHeading>{content.browse.heading}</PageHeading>
      <div className="browse__controls">
        <TextField
          type="search"
          label={content.browse.searchLabel}
          hideLabel
          icon={SearchIcon}
          value={text}
          placeholder={content.browse.searchPlaceholder}
          maxLength={MAX_QUERY_LENGTH}
          clearLabel={content.browse.clearSearch}
          onChange={(value) => {
            setDraft(value)
            go(value, activeCategory)
          }}
          onClear={() => {
            setDraft(null)
            go('', activeCategory)
          }}
        />
        <div className="field">
          <label htmlFor={categoryId} className="field__label">
            {content.browse.categoryLabel}
          </label>
          <div className="select">
            <select
              id={categoryId}
              className="select__input"
              value={activeCategory ?? ''}
              onChange={(event) => go(text, event.target.value === '' ? null : event.target.value)}
            >
              <option value="">{content.browse.allCategories}</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <span className="select__icon">
              <Icon as={ForwardIcon} size={18} />
            </span>
          </div>
        </div>
      </div>

      <output className="browse__count" aria-live="polite">
        {count}
      </output>

      {groups.length === 0 ? (
        <StatePanel
          tone="empty"
          icon={SearchIcon}
          title={content.browse.empty.title}
          action={<Button onClick={() => navigate(hrefs.home(), { replace: true })}>{content.browse.empty.action}</Button>}
        >
          {query ? fill(content.browse.empty.body, { query }) : content.browse.empty.bodyCategory}
        </StatePanel>
      ) : (
        groups.map((group) => (
          <section key={group.category.id} className="browse__group" aria-labelledby={`group-${group.category.id}`}>
            <h2 id={`group-${group.category.id}`} className="browse__group-title">
              {group.category.label}
            </h2>
            <ul className="browse__list">
              {group.problems.map((problem) => (
                <ProblemRow key={problem.id} problem={problem} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
