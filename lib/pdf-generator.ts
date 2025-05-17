"use client"

import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

export async function generatePdfFromHtml(contentElement: HTMLElement): Promise<Blob> {
  try {
    // Create a temporary div to render the content
    const tempDiv = document.createElement("div")
    tempDiv.style.position = "absolute"
    tempDiv.style.left = "-9999px"
    tempDiv.style.top = "0"
    tempDiv.style.width = "800px" // Fixed width for consistent rendering
    tempDiv.style.fontFamily = contentElement.style.fontFamily || "Arial, sans-serif"
    tempDiv.style.color = contentElement.style.color || "#333333"
    tempDiv.style.backgroundColor = contentElement.style.backgroundColor || "#ffffff"
    tempDiv.style.padding = "20px"
    tempDiv.style.margin = "0"
    tempDiv.style.lineHeight = "1.6"

    // Clone the content
    tempDiv.innerHTML = contentElement.innerHTML

    // Add to document body
    document.body.appendChild(tempDiv)

    try {
      // Wait a moment for any fonts or resources to load
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Use html2canvas to render the HTML content to a canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: contentElement.style.backgroundColor || "#ffffff",
        allowTaint: true,
      })

      // Create a new jsPDF instance
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Get the dimensions
      const imgData = canvas.toDataURL("image/png")
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 295 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      // Add the first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Add footer to each page
      const pageCount = pdf.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        pdf.text(`Page ${i} of ${pageCount} - Generated with AI PDF Generator`, 105, 285, { align: "center" })
      }

      // Get the PDF as a blob
      const pdfBlob = pdf.output("blob")

      // Clean up - remove the temporary div
      document.body.removeChild(tempDiv)

      return pdfBlob
    } catch (error) {
      // Clean up - remove the temporary div if it exists
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv)
      }
      throw error
    }
  } catch (error) {
    console.error("Error generating PDF:", error)
    throw new Error("Failed to generate PDF: " + (error instanceof Error ? error.message : String(error)))
  }
}
