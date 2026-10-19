import { useEffect, useRef, type RefObject } from 'react'

/**
 * Open a <dialog> as a modal while the component is mounted. The browser
 * keeps focus inside it. On unmount, focus goes back to the element that
 * opened it (React removes the node before this cleanup runs, so the
 * browser's own focus restore doesn't happen).
 *
 * Handle Esc with the dialog's onCancel, not onClose: the cleanup here calls
 * close(), which fires "close" on every unmount (and twice in StrictMode), so
 * an onClose handler would dismiss the dialog as it opens.
 */
export function useModalDialog(initialFocus?: RefObject<HTMLElement | null>) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!dialog.open) dialog.showModal()
    initialFocus?.current?.focus()
    return () => {
      dialog.close()
      if (opener?.isConnected) opener.focus()
    }
  }, [initialFocus])

  return dialogRef
}
