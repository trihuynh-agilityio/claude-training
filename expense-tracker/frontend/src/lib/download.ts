/** Save text as a file through a Blob and a temporary link. */
export function downloadTextFile(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Some browsers start the download after click() returns, so release the URL a tick later.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
