import { useEffect } from 'react'
import { CheckIcon } from './icons'

const TOAST_MS = 3500

type Props = { message: string; onDone: () => void }

export function Toast({ message, onDone }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDone, TOAST_MS)
    return () => clearTimeout(timer)
  }, [message, onDone])

  return (
    <div className="toast" role="status">
      <CheckIcon />
      <span>{message}</span>
    </div>
  )
}
