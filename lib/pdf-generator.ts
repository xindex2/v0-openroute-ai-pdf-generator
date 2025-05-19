"use client"

import { jsPDF } from "jspdf"

export async function generatePdfFromHtml(contentElement: HTMLElement): Promise<Blob> {
  try {
    // Create a new jsPDF instance
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    // Get the HTML content as a string
    const htmlContent = contentElement.innerHTML

    // Set up the options for html2pdf
    const options = {
      margin: [10, 10, 10, 10],
      filename: "document.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }

    // Use html2pdf to convert HTML to PDF
    return new Promise((resolve, reject) => {
      // First, we'll create a temporary container to properly format the content
      const container = document.createElement("div")
      container.style.width = "210mm" // A4 width
      container.style.margin = "0"
      container.style.padding = "0"
      container.style.boxSizing = "border-box"
      container.innerHTML = htmlContent

      // Add to document temporarily
      document.body.appendChild(container)

      // Function to add content to PDF
      const addContentToPdf = async () => {
        try {
          // Split content into pages if needed
          const contentHeight = container.offsetHeight
          const pageHeight = 297 // A4 height in mm
          const contentWidth = container.offsetWidth
          const pageWidth = 210 // A4 width in mm

          // Convert HTML to text for PDF
          let currentY = 10 // Starting Y position

          // Add title if available
          const title = container.querySelector("h1")
          if (title && title.textContent) {
            pdf.setFontSize(18)
            pdf.setTextColor(39, 174, 96) // Todo.is green
            pdf.text(title.textContent, 10, currentY)
            currentY += 10
          }

          // Add content paragraphs
          const paragraphs = container.querySelectorAll("p, h2, h3, h4, h5, h5, ul, ol, table")
          pdf.setFontSize(12)
          pdf.setTextColor(0, 0, 0)

          for (const paragraph of paragraphs) {
            if (paragraph.tagName === "H2") {
              pdf.setFontSize(16)
              pdf.setTextColor(39, 174, 96) // Todo.is green
              pdf.text(paragraph.textContent || "", 10, currentY)
              pdf.setFontSize(12)
              pdf.setTextColor(0, 0, 0)
              currentY += 8
            } else if (paragraph.tagName === "H3") {
              pdf.setFontSize(14)
              pdf.setTextColor(39, 174, 96) // Todo.is green
              pdf.text(paragraph.textContent || "", 10, currentY)
              pdf.setFontSize(12)
              pdf.setTextColor(0, 0, 0)
              currentY += 7
            } else if (paragraph.tagName === "TABLE") {
              // Handle tables
              const rows = paragraph.querySelectorAll("tr")
              const headerRow = rows[0]
              if (headerRow) {
                const headers = headerRow.querySelectorAll("th")
                const headerTexts = Array.from(headers).map((h) => h.textContent || "")

                // Draw header row with green background
                pdf.setFillColor(46, 204, 113) // Todo.is green
                pdf.setTextColor(255, 255, 255)
                pdf.rect(10, currentY - 5, 190, 10, "F")
                pdf.text(headerTexts.join("   "), 15, currentY)
                currentY += 10

                // Draw data rows
                pdf.setTextColor(0, 0, 0)
                for (let i = 1; i < rows.length; i++) {
                  const cells = rows[i].querySelectorAll("td")
                  const cellTexts = Array.from(cells).map((c) => c.textContent || "")
                  pdf.text(cellTexts.join("   "), 15, currentY)
                  currentY += 7

                  // Add a new page if needed
                  if (currentY > 280) {
                    pdf.addPage()
                    currentY = 10
                  }
                }
              }
            } else {
              // Regular paragraph
              const text = paragraph.textContent || ""
              const lines = pdf.splitTextToSize(text, 190) // Split text to fit page width

              // Check if we need a new page
              if (currentY + lines.length * 7 > 280) {
                pdf.addPage()
                currentY = 10
              }

              pdf.text(lines, 10, currentY)
              currentY += lines.length * 7
            }

            // Add spacing between elements
            currentY += 3

            // Add a new page if needed
            if (currentY > 280) {
              pdf.addPage()
              currentY = 10
            }
          }

          // Add footer to each page
          const pageCount = pdf.getNumberOfPages()
          for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i)
            pdf.setFontSize(8)
            pdf.setTextColor(100, 100, 100)
            pdf.text(`Page ${i} of ${pageCount} - Generated with WriteDoc.ai`, 105, 290, { align: "center" })
          }

          // Get the PDF as a blob
          const pdfBlob = pdf.output("blob")
          resolve(pdfBlob)
        } catch (error) {
          reject(error)
        } finally {
          // Clean up - remove the temporary container
          document.body.removeChild(container)
        }
      }

      // Execute the content addition
      addContentToPdf()
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    throw new Error("Failed to generate PDF: " + (error instanceof Error ? error.message : String(error)))
  }
}
