"use server"

// Server action to generate a PDF from HTML content
export async function generatePdfOnServer(htmlContent: string): Promise<{ url: string }> {
  try {
    console.log("Server received HTML content for PDF generation")

    // Generate a unique filename for the PDF
    const pdfFilename = `document-${Date.now()}.pdf`

    // In a real implementation, you would use a library like Puppeteer or wkhtmltopdf
    // to convert the HTML to PDF here

    // For now, we'll just return a mock URL
    return {
      url: `/api/download?filename=${pdfFilename}&type=pdf&t=${Date.now()}`,
    }
  } catch (error) {
    console.error("Error generating PDF on server:", error)
    throw new Error("Failed to generate PDF")
  }
}

// Server action to generate a DOCX from HTML content
export async function generateDocxOnServer(htmlContent: string): Promise<{ url: string }> {
  try {
    console.log("Server received HTML content for DOCX generation")

    // Generate a unique filename for the DOCX
    const docxFilename = `document-${Date.now()}.docx`

    // In a real implementation, you would use a library like mammoth or html-to-docx
    // to convert the HTML to DOCX here

    // For now, we'll just return a mock URL
    return {
      url: `/api/download?filename=${docxFilename}&type=docx&t=${Date.now()}`,
    }
  } catch (error) {
    console.error("Error generating DOCX on server:", error)
    throw new Error("Failed to generate DOCX")
  }
}
