export function downloadBlob(blob: Blob, filename: string): void {
  try {
    // Create a URL for the blob
    const url = URL.createObjectURL(blob)

    // Create a temporary link element
    const link = document.createElement("a")
    link.href = url
    link.download = filename

    // Append to the document, click it, and remove it
    document.body.appendChild(link)
    link.click()

    // Clean up
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 100)
  } catch (error) {
    console.error("Error downloading file:", error)
    throw error
  }
}
