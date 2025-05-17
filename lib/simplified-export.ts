"use client"

// Import html2canvas directly
import html2canvas from "html2canvas"
// Import jsPDF directly
import { jsPDF } from "jspdf"

// Helper function to create a simple print window
function openPrintWindow(content: string, title = "Document"): void {
  const printWindow = window.open("", "_blank", "width=800,height=600")
  if (!printWindow) {
    alert("Please allow pop-ups to print the document")
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1, h2, h3, h4, h5, h6 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        p {
          margin-bottom: 1em;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1em;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
        }
        th {
          background-color: #f2f2f2;
        }
        @media print {
          body {
            padding: 0;
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      ${content}
      <script>
        // Auto-print when loaded
        window.onload = function() {
          setTimeout(() => {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `)

  printWindow.document.close()
}

// Simplified PDF export function using print window as a fallback
export async function generatePdf(contentElement: HTMLElement): Promise<Blob> {
  try {
    console.log("Starting PDF generation...")

    // Create a deep clone of the element to avoid modifying the original
    const clone = contentElement.cloneNode(true) as HTMLElement

    // Create a temporary container
    const container = document.createElement("div")
    container.appendChild(clone)
    document.body.appendChild(container)

    try {
      // Try using html2canvas with the cloned element
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      })

      console.log("Canvas generated successfully")

      // Calculate dimensions
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      console.log("PDF created successfully")

      // Clean up
      document.body.removeChild(container)

      // Convert to blob
      const pdfBlob = pdf.output("blob")
      return pdfBlob
    } catch (error) {
      console.error("Error in html2canvas PDF generation:", error)

      // Clean up
      document.body.removeChild(container)

      // Fallback to print window method
      console.log("Falling back to print window method...")

      // Open print window
      openPrintWindow(contentElement.innerHTML)

      // Return a simple PDF with a message
      const pdf = new jsPDF()
      pdf.text("Your document has been opened in a new window for printing.", 10, 10)
      pdf.text("Please use your browser's print function to save as PDF.", 10, 20)
      return pdf.output("blob")
    }
  } catch (error) {
    console.error("Error in PDF generation:", error)

    // Last resort fallback
    try {
      openPrintWindow(contentElement.innerHTML)

      const pdf = new jsPDF()
      pdf.text("Your document has been opened in a new window for printing.", 10, 10)
      pdf.text("Please use your browser's print function to save as PDF.", 10, 20)
      return pdf.output("blob")
    } catch (finalError) {
      console.error("Final fallback error:", finalError)
      throw new Error("PDF generation failed. Please try the 'Print' option instead.")
    }
  }
}

// Simple HTML to image conversion
export async function generateImage(contentElement: HTMLElement): Promise<Blob> {
  try {
    console.log("Starting image generation...")

    // Create a deep clone of the element to avoid modifying the original
    const clone = contentElement.cloneNode(true) as HTMLElement

    // Create a temporary container
    const container = document.createElement("div")
    container.appendChild(clone)
    document.body.appendChild(container)

    try {
      // Try using html2canvas with the cloned element
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: "#ffffff",
      })

      console.log("Canvas for image generated successfully")

      // Clean up
      document.body.removeChild(container)

      return new Promise((resolve, reject) => {
        try {
          canvas.toBlob((blob) => {
            if (blob) {
              console.log("Image blob created successfully")
              resolve(blob)
            } else {
              reject(new Error("Failed to convert canvas to blob"))
            }
          }, "image/png")
        } catch (error) {
          console.error("Error in canvas to blob conversion:", error)
          reject(error)
        }
      })
    } catch (error) {
      console.error("Error in html2canvas image generation:", error)

      // Clean up
      document.body.removeChild(container)

      // Fallback to a simple screenshot message
      const canvas = document.createElement("canvas")
      canvas.width = 800
      canvas.height = 600
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.font = "20px Arial"
        ctx.fillStyle = "#000000"
        ctx.fillText("Unable to generate image.", 50, 50)
        ctx.fillText("Please try using the Print option instead.", 50, 80)
      }

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob || new Blob(["Image generation failed"], { type: "text/plain" }))
        })
      })
    }
  } catch (error) {
    console.error("Error in image generation:", error)
    throw error
  }
}

// Simple HTML export
export function generateHtml(contentElement: HTMLElement): Blob {
  try {
    console.log("Starting HTML export...")

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Exported Document</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
          }
          p {
            margin-bottom: 1em;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 1em;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
          }
          th {
            background-color: #f2f2f2;
          }
        </style>
      </head>
      <body>
        ${contentElement.innerHTML}
      </body>
      </html>
    `

    console.log("HTML export created successfully")
    return new Blob([html], { type: "text/html" })
  } catch (error) {
    console.error("Error in HTML generation:", error)
    throw error
  }
}

// Simple text-based DOCX alternative
export function generateTextDocument(contentElement: HTMLElement): Blob {
  try {
    console.log("Starting text document export...")

    // Extract text content
    const text = contentElement.innerText || contentElement.textContent || ""

    console.log("Text document created successfully")
    return new Blob([text], { type: "text/plain" })
  } catch (error) {
    console.error("Error in text document generation:", error)
    throw error
  }
}

// Direct print function
export function printDocument(contentElement: HTMLElement): void {
  try {
    console.log("Opening print window...")
    openPrintWindow(contentElement.innerHTML)
  } catch (error) {
    console.error("Error opening print window:", error)
    alert("Failed to open print window. Please try again.")
  }
}
