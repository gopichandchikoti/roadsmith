import { useId } from 'react'
import { cx } from '../utils/format'
import { Icon } from './Icon'
import { CloseIcon, type TablerIcon } from './icons'
import './Controls.css'

type TextFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  onClear: () => void
  clearLabel: string
  placeholder: string
  maxLength: number
  hint?: string
  icon?: TablerIcon
  type?: 'text' | 'search'
  /** Keeps the label for assistive technology but does not draw it, for a field whose placeholder and icon already say what it is. */
  hideLabel?: boolean
}

/** A labelled text box with an optional hint and a clear button that appears once there is something to clear. */
export function TextField({
  label,
  value,
  onChange,
  onClear,
  clearLabel,
  placeholder,
  maxLength,
  hint,
  icon,
  type = 'text',
  hideLabel = false,
}: TextFieldProps) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={`${id}-input`} className={cx('field__label', hideLabel && 'visually-hidden')}>
        {label}
      </label>
      <div className="field__control">
        {icon ? (
          <span className="field__icon">
            <Icon as={icon} />
          </span>
        ) : null}
        <input
          id={`${id}-input`}
          className={cx('field__input', icon && 'field__input--with-icon')}
          type={type}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-describedby={hint ? `${id}-hint` : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
        />
        {value !== '' ? (
          <button type="button" className="field__clear" aria-label={clearLabel} onClick={onClear}>
            <Icon as={CloseIcon} />
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
