import { digitsOnly, groupDigits } from '../lib/money'

type Props = {
  id: string
  /** Digits only, as typed. */
  value: string
  onChange: (digits: string) => void
  label: string
  invalid?: boolean
  describedBy?: string
  large?: boolean
}

/** Keeps digits only, shows them grouped while typing and adds a ₫ suffix. */
export function MoneyInput({ id, value, onChange, label, invalid, describedBy, large }: Props) {
  const classes = ['input', large && 'input-money', invalid && 'invalid'].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      <input
        id={id}
        aria-label={label}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        value={groupDigits(value)}
        onChange={(event) => onChange(digitsOnly(event.target.value))}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
      />
      <span className="currency" aria-hidden="true">
        ₫
      </span>
    </div>
  )
}
