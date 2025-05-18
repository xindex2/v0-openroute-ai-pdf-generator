"use client"

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  AlignmentType,
  ShadingType,
  WidthType,
} from "docx"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"
import "jspdf-autotable"

// Helper function to get text content from HTML element
const getTextContent = (element: HTMLElement): string => {
  return element.innerText || element.textContent || ""
}

// Helper function to get all text content from document
const getAllTextContent = (element: HTMLElement): string => {
  return Array.from(element.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li, td, th"))
    .map((el) => el.textContent)
    .filter(Boolean)
    .join("\n\n")
}

// Simple saveAs implementation to replace file-saver dependency
function saveAs(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 100)
}

// Print function - this is the most reliable
export function printDocument(contentElement: HTMLElement): void {
  try {
    console.log("Opening print window...")
    const printWindow = window.open("", "_blank", "width=800,height=600")
    if (!printWindow) {
      alert("Please allow pop-ups to print the document")
      return
    }

    // Create a clean version of the HTML with basic styling
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Document</title>
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
            color: #2ECC71;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
          }
          p { margin-bottom: 1em; }
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
            background-color: #2ECC71;
            color: white;
          }
          .placeholder {
            background-color: #FFEB3B;
            padding: 2px 4px;
            border-radius: 2px;
          }
          .transaction-details {
            background-color: #E3F2FD;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          @media print {
            body { padding: 0; margin: 0; }
          }
        </style>
      </head>
      <body>
        ${contentElement.innerHTML}
        <script>
          window.onload = function() {
            setTimeout(() => window.print(), 500);
          };
        </script>
      </body>
      </html>
    `)

    printWindow.document.close()
  } catch (error) {
    console.error("Error opening print window:", error)
    alert("Failed to open print window. Please try again.")
  }
}

// Improved PDF export function that creates a text-based PDF with background colors
export async function generatePdf(contentElement: HTMLElement): Promise<Blob> {
  try {
    console.log("Starting text-based PDF generation with background colors...")

    // Create a new jsPDF instance
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    // Create a clean clone of the content
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = contentElement.innerHTML

    // Process placeholder spans to ensure they have proper styling
    const placeholderSpans = tempDiv.querySelectorAll(
      "span[class*='bg-yellow'], span[style*='background-color: #FFEB3B']",
    )
    placeholderSpans.forEach((span) => {
      // Mark placeholders for special handling
      span.setAttribute("data-placeholder", "true")
    })

    // Get the title if available
    const titleElement = tempDiv.querySelector("h1, h2, h3")
    const title = titleElement ? titleElement.textContent || "Document" : "Document"

    // Set up initial position
    let yPos = 20

    // Add title
    pdf.setFontSize(18)
    pdf.setTextColor(46, 204, 113) // Green color
    pdf.text(title, 20, yPos)
    yPos += 15

    // Set default text color and font size
    pdf.setFontSize(12)
    pdf.setTextColor(0, 0, 0)

    // Process all elements in order
    const elements = tempDiv.querySelectorAll("h1, h2, h3, h4, h5, h6, p, ul, ol, table, div")

    for (const element of Array.from(elements)) {
      const tagName = element.tagName.toLowerCase()

      // Skip empty elements
      if (!element.textContent?.trim()) continue

      // Skip if this is a list item and we're processing the list itself
      if (
        tagName === "li" &&
        element.parentElement &&
        (element.parentElement.tagName.toLowerCase() === "ul" || element.parentElement.tagName.toLowerCase() === "ol")
      ) {
        continue
      }

      // Add spacing
      yPos += 5

      // Check if we need a new page
      if (yPos > 270) {
        pdf.addPage()
        yPos = 20
      }

      // Process based on element type
      if (tagName.match(/^h[1-6]$/)) {
        const level = Number.parseInt(tagName.substring(1))
        const fontSize = 18 - level * 2

        pdf.setFontSize(fontSize)
        pdf.setTextColor(46, 204, 113) // Green color

        const text = element.textContent || ""
        const lines = pdf.splitTextToSize(text, 170)
        pdf.text(lines, 20, yPos)
        yPos += lines.length * (fontSize / 3) + 5

        pdf.setFontSize(12)
        pdf.setTextColor(0, 0, 0)
      } else if (tagName === "p") {
        const text = element.textContent || ""

        // Check for placeholders in this paragraph
        const placeholders = element.querySelectorAll('[data-placeholder="true"]')

        if (placeholders.length > 0) {
          // Handle paragraphs with placeholders by drawing background rectangles
          // This is a simplified approach - for complex documents with mixed formatting,
          // we'd need a more sophisticated approach to handle inline highlighting

          // Draw a yellow background for the entire paragraph as a simplification
          pdf.setFillColor(255, 235, 59) // Yellow
          pdf.rect(18, yPos - 5, 174, 10, "F")

          // Then add the text on top
          const lines = pdf.splitTextToSize(text, 170)
          pdf.text(lines, 20, yPos)
          yPos += lines.length * 7
        } else {
          // Regular paragraph without placeholders
          const lines = pdf.splitTextToSize(text, 170)
          pdf.text(lines, 20, yPos)
          yPos += lines.length * 7
        }
      } else if (tagName === "ul" || tagName === "ol") {
        const items = element.querySelectorAll("li")
        let itemNumber = 1

        for (const item of Array.from(items)) {
          const itemText = item.textContent || ""
          const prefix = tagName === "ul" ? "• " : `${itemNumber}. `
          itemNumber++

          // Check if this list item has placeholders
          const hasPlaceholders = item.querySelector('[data-placeholder="true"]')

          if (hasPlaceholders) {
            // Draw yellow background for items with placeholders
            pdf.setFillColor(255, 235, 59) // Yellow
            pdf.rect(23, yPos - 5, 167, 10, "F")
          }

          const lines = pdf.splitTextToSize(prefix + itemText, 160)

          // Check if we need a new page
          if (yPos + lines.length * 7 > 270) {
            pdf.addPage()
            yPos = 20
          }

          pdf.text(lines, 25, yPos) // Indented
          yPos += lines.length * 7
        }
      } else if (tagName === "table") {
        try {
          // Use jsPDF-AutoTable for better table support
          const tableData: string[][] = []
          const tableColumns: string[] = []
          const tableCellStyles: any[] = []

          // Get header row
          const headerRow = element.querySelector("thead tr")
          if (headerRow) {
            const headers = headerRow.querySelectorAll("th")
            headers.forEach((header) => {
              tableColumns.push(header.textContent || "")
            })
          }

          // Get data rows
          const rows = element.querySelectorAll("tbody tr")
          rows.forEach((row) => {
            const rowData: string[] = []
            const cellStyles: any[] = []

            const cells = row.querySelectorAll("td")
            cells.forEach((cell) => {
              rowData.push(cell.textContent || "")

              // Check if cell has placeholders
              const hasPlaceholders = cell.querySelector('[data-placeholder="true"]')
              if (hasPlaceholders) {
                cellStyles.push({ fillColor: [255, 235, 59] }) // Yellow background
              } else {
                cellStyles.push({})
              }
            })

            if (rowData.length > 0) {
              tableData.push(rowData)
              tableCellStyles.push(cellStyles)
            }
          })

          // If we have data, create the table
          if (tableData.length > 0 || tableColumns.length > 0) {
            // @ts-ignore - jspdf-autotable adds this method
            pdf.autoTable({
              head: tableColumns.length > 0 ? [tableColumns] : undefined,
              body: tableData,
              startY: yPos,
              theme: "grid",
              headStyles: {
                fillColor: [46, 204, 113], // Green
                textColor: [255, 255, 255], // White
                fontStyle: "bold",
              },
              margin: { left: 20, right: 20 },
              styles: {
                overflow: "linebreak",
                cellPadding: 3,
              },
              // Apply custom styles to cells with placeholders
              willDrawCell: (data) => {
                if (data.section === "body" && tableCellStyles[data.row] && tableCellStyles[data.row][data.column]) {
                  const cellStyle = tableCellStyles[data.row][data.column]
                  if (cellStyle.fillColor) {
                    data.cell.styles.fillColor = cellStyle.fillColor
                  }
                }
              },
            })

            // @ts-ignore - jspdf-autotable adds this property
            yPos = pdf.lastAutoTable.finalY + 10
          }
        } catch (tableError) {
          console.error("Error processing table with autoTable:", tableError)

          // Fallback to simple text representation
          const rows = element.querySelectorAll("tr")

          pdf.text("Table:", 20, yPos)
          yPos += 7

          rows.forEach((row) => {
            const cells = row.querySelectorAll("th, td")
            const rowText = Array.from(cells)
              .map((cell) => cell.textContent)
              .join(" | ")

            const lines = pdf.splitTextToSize(rowText, 170)
            pdf.text(lines, 25, yPos) // Indented
            yPos += lines.length * 7
          })

          yPos += 5 // Add extra space after table
        }
      } else if (tagName === "div") {
        // Check if this is a transaction details section (blue background)
        const hasBlueBackground =
          element.className.includes("bg-blue") ||
          element.className.includes("bg-sky") ||
          element.className.includes("bg-slate") ||
          element.style.backgroundColor?.includes("rgb(227, 242, 253)") || // #E3F2FD
          element.hasAttribute("data-transaction-details")

        if (hasBlueBackground) {
          // Get the content height to determine rectangle size
          const paragraphs = element.querySelectorAll("p")
          let contentHeight = 0

          if (paragraphs.length > 0) {
            contentHeight = paragraphs.length * 10 // Approximate height based on number of paragraphs
          } else {
            // If no paragraphs, estimate based on text length
            const text = element.textContent || ""
            const lines = pdf.splitTextToSize(text, 160)
            contentHeight = lines.length * 7
          }

          // Draw a blue background rectangle
          pdf.setFillColor(227, 242, 253) // #E3F2FD - light blue
          pdf.rect(15, yPos - 5, 180, contentHeight + 15, "F")

          // Process the content inside the div
          const divParagraphs = element.querySelectorAll("p")

          divParagraphs.forEach((p) => {
            const text = p.textContent || ""
            const lines = pdf.splitTextToSize(text, 160)
            pdf.text(lines, 20, yPos)
            yPos += lines.length * 7
          })

          // If no paragraphs, just use the text content
          if (divParagraphs.length === 0) {
            const text = element.textContent || ""
            const lines = pdf.splitTextToSize(text, 160)
            pdf.text(lines, 20, yPos)
            yPos += lines.length * 7
          }

          yPos += 5 // Add extra space after the section
        }
      }
    }

    // Add footer
    const pageCount = pdf.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      pdf.setFontSize(10)
      pdf.setTextColor(150, 150, 150)
      pdf.text(`Generated by docfa.st - Page ${i} of ${pageCount}`, 105, 290, { align: "center" })
    }

    console.log("Text-based PDF created successfully with", pageCount, "pages")
    return pdf.output("blob")
  } catch (error) {
    console.error("Error in text-based PDF generation:", error)
    // Fall back to canvas-based approach if text-based fails
    return generatePdfWithCanvas(contentElement)
  }
}

// Keep the canvas-based approach as a fallback
export async function generatePdfWithCanvas(contentElement: HTMLElement): Promise<Blob> {
  try {
    console.log("Starting PDF generation with canvas approach (fallback)...")

    // Create a clean clone of the content in a temporary div
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = contentElement.innerHTML

    // Apply basic styling
    tempDiv.style.fontFamily = "Arial, sans-serif"
    tempDiv.style.padding = "20px"
    tempDiv.style.backgroundColor = "#ffffff"
    tempDiv.style.width = "800px"
    tempDiv.style.color = "#333333"
    tempDiv.style.boxSizing = "border-box"

    // Add styling for headings and tables
    const styleElement = document.createElement("style")
    styleElement.textContent = `
      h1, h2, h3, h4, h5, h6 { color: #2ECC71; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
      th { background-color: #2ECC71; color: white; padding: 8px; text-align: left; }
      td { padding: 8px; border: 1px solid #ddd; }
      img { max-width: 100%; height: auto; }
      .placeholder, span[class*='bg-yellow'] { 
        background-color: #FFEB3B; 
        color: #000000; 
        padding: 2px 4px; 
        border-radius: 4px; 
      }
      div[class*='bg-blue'], div[class*='bg-sky'], div[class*='bg-slate'] { 
        background-color: #E3F2FD; 
        padding: 15px; 
        border-radius: 8px; 
        margin-bottom: 20px; 
      }
    `
    tempDiv.appendChild(styleElement)

    // Temporarily add to document to render
    tempDiv.style.position = "absolute"
    tempDiv.style.left = "0"
    tempDiv.style.top = "0"
    tempDiv.style.visibility = "visible"
    tempDiv.style.zIndex = "-1000"
    document.body.appendChild(tempDiv)

    try {
      // Wait a moment for any fonts or resources to load
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Create a new PDF document
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Use html2canvas with improved options
      const canvas = await html2canvas(tempDiv, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true, // Allow cross-origin images
        windowWidth: 800,
        windowHeight: tempDiv.scrollHeight,
        onclone: (clonedDoc) => {
          // Additional styling for the cloned document
          const clonedContent = clonedDoc.querySelector("div")
          if (clonedContent) {
            clonedContent.style.width = "800px"
            clonedContent.style.margin = "0"
            clonedContent.style.padding = "20px"
            clonedContent.style.visibility = "visible"
          }
        },
      })

      console.log("Canvas created with dimensions:", canvas.width, "x", canvas.height)

      // Add the canvas as an image to the PDF
      const imgData = canvas.toDataURL("image/jpeg", 0.95)
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Add image to first page
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight)

      // Add additional pages if needed
      let heightLeft = imgHeight - pageHeight
      let position = -pageHeight

      while (heightLeft > 0) {
        pdf.addPage()
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
        position -= pageHeight
      }

      // Add footer to each page
      const pageCount = pdf.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFontSize(10)
        pdf.setTextColor(150, 150, 150)
        pdf.text(`Generated by docfa.st - Page ${i} of ${pageCount}`, imgWidth / 2, pageHeight - 10, {
          align: "center",
        })
      }

      console.log("Canvas-based PDF created successfully with", pageCount, "pages")
      return pdf.output("blob")
    } finally {
      // Clean up
      document.body.removeChild(tempDiv)
    }
  } catch (error) {
    console.error("Error in PDF generation with canvas:", error)
    // Return a simple text-based PDF as fallback
    return generateFallbackPdf(contentElement)
  }
}

// Fallback PDF generation that creates a simple text-based PDF
function generateFallbackPdf(contentElement: HTMLElement): Promise<Blob> {
  return new Promise((resolve) => {
    console.log("Using fallback PDF generation...")
    const pdf = new jsPDF()

    // Extract text content
    const text = contentElement.textContent || "Document content could not be extracted"

    // Add title
    const titleElement = contentElement.querySelector("h1")
    const title = titleElement ? titleElement.textContent || "Document" : "Document"

    pdf.setFontSize(16)
    pdf.setTextColor(46, 204, 113) // Green color
    pdf.text(title, 20, 20)

    // Add content as plain text
    pdf.setFontSize(12)
    pdf.setTextColor(0, 0, 0)

    const textLines = pdf.splitTextToSize(text, 170)
    pdf.text(textLines, 20, 30)

    // Add footer
    pdf.setFontSize(10)
    pdf.setTextColor(150, 150, 150)
    pdf.text("Generated by docfa.st", 105, 280, { align: "center" })

    resolve(pdf.output("blob"))
  })
}

// Completely rewritten image export function
export async function generateImage(contentElement: HTMLElement): Promise<Blob> {
  try {
    console.log("Starting image generation with simplified approach...")

    // Create a clean clone of the content in a temporary div
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = contentElement.innerHTML

    // Apply basic styling
    tempDiv.style.fontFamily = "Arial, sans-serif"
    tempDiv.style.padding = "20px"
    tempDiv.style.backgroundColor = "#ffffff"
    tempDiv.style.width = "800px"
    tempDiv.style.color = "#333333"
    tempDiv.style.boxSizing = "border-box"

    // Add styling for headings and tables
    const styleElement = document.createElement("style")
    styleElement.textContent = `
      h1, h2, h3, h4, h5, h6 { color: #2ECC71; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
      th { background-color: #2ECC71; color: white; padding: 8px; text-align: left; }
      td { padding: 8px; border: 1px solid #ddd; }
      .placeholder, span[class*='bg-yellow'] { 
        background-color: #FFEB3B; 
        color: #000000; 
        padding: 2px 4px; 
        border-radius: 4px; 
      }
      div[class*='bg-blue'], div[class*='bg-sky'], div[class*='bg-slate'] { 
        background-color: #E3F2FD; 
        padding: 15px; 
        border-radius: 8px; 
        margin-bottom: 20px; 
      }
    `
    tempDiv.appendChild(styleElement)

    // Temporarily add to document to render
    tempDiv.style.position = "absolute"
    tempDiv.style.left = "0"
    tempDiv.style.top = "0"
    tempDiv.style.visibility = "visible"
    tempDiv.style.zIndex = "-1000"
    document.body.appendChild(tempDiv)

    try {
      // Use html2canvas with simplified options
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          // Additional styling for the cloned document if needed
          const clonedContent = clonedDoc.querySelector("div")
          if (clonedContent) {
            clonedContent.style.width = "800px"
          }
        },
      })

      // Convert canvas to blob
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log("Image created successfully")
              resolve(blob)
            } else {
              reject(new Error("Failed to convert canvas to blob"))
            }
          },
          "image/png",
          0.95,
        )
      })
    } finally {
      // Clean up
      document.body.removeChild(tempDiv)
    }
  } catch (error) {
    console.error("Error in image generation:", error)
    // Create a simple fallback image with text
    return generateFallbackImage(contentElement)
  }
}

// Fallback image generation that creates a simple text-based image
function generateFallbackImage(contentElement: HTMLElement): Promise<Blob> {
  return new Promise((resolve) => {
    console.log("Using fallback image generation...")

    // Create a canvas element
    const canvas = document.createElement("canvas")
    canvas.width = 800
    canvas.height = 600

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      throw new Error("Could not get canvas context")
    }

    // Fill background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Extract text content
    const text = contentElement.textContent || "Document content could not be extracted"

    // Add title
    const titleElement = contentElement.querySelector("h1")
    const title = titleElement ? titleElement.textContent || "Document" : "Document"

    ctx.font = "bold 24px Arial"
    ctx.fillStyle = "#2ECC71"
    ctx.fillText(title, 40, 40)

    // Add content as plain text
    ctx.font = "16px Arial"
    ctx.fillStyle = "#333333"

    // Simple text wrapping
    const words = text.split(" ")
    let line = ""
    let y = 80

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " "
      const metrics = ctx.measureText(testLine)
      const testWidth = metrics.width

      if (testWidth > canvas.width - 80 && i > 0) {
        ctx.fillText(line, 40, y)
        line = words[i] + " "
        y += 24

        // Stop if we run out of canvas space
        if (y > canvas.height - 40) {
          ctx.fillText("...", 40, y)
          break
        }
      } else {
        line = testLine
      }
    }

    // Add the last line
    if (y < canvas.height - 40) {
      ctx.fillText(line, 40, y)
    }

    // Add footer
    ctx.font = "12px Arial"
    ctx.fillStyle = "#999999"
    ctx.fillText("Generated by docfa.st", canvas.width / 2 - 60, canvas.height - 20)

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        // If even this fails, create an empty blob
        resolve(new Blob([""], { type: "image/png" }))
      }
    }, "image/png")
  })
}

// Replace the generateTextDocument function with this improved version
export async function generateTextDocument(contentElement: HTMLElement): Promise<Blob> {
  try {
    console.log("Starting DOCX generation with improved styling...")

    // Create a clean clone of the content
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = contentElement.innerHTML

    // Process placeholder spans to ensure they have proper styling
    const placeholderSpans = tempDiv.querySelectorAll("span[class*='bg-yellow']")
    placeholderSpans.forEach((span) => {
      // Replace the span with just its text content wrapped in brackets
      const text = span.textContent || ""
      const textNode = document.createTextNode(text)
      span.parentNode?.replaceChild(textNode, span)
    })

    // Create a new Document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [],
        },
      ],
    })

    // Extract content from HTML
    const children = []

    // Add title
    const titleElement = tempDiv.querySelector("h1")
    if (titleElement && titleElement.textContent) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: titleElement.textContent,
              bold: true,
              color: "2ECC71", // Green color - without # prefix for docx
              size: 32, // 16pt
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: {
            after: 200, // Add space after the title
          },
        }),
      )
    }

    // Process all elements in order
    const elements = tempDiv.querySelectorAll("h1, h2, h3, h4, h5, h6, p, ul, ol, table")
    elements.forEach((element) => {
      if (element.tagName === "H1" && element === titleElement) {
        // Skip the title as we've already added it
        return
      }

      if (element.tagName.startsWith("H")) {
        const level = Number.parseInt(element.tagName.substring(1))
        const headingLevel = level <= 6 ? (level as HeadingLevel) : HeadingLevel.HEADING_1

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: element.textContent || "",
                bold: true,
                color: "2ECC71", // Green color - without # prefix for docx
                size: 28 - level * 2, // Decrease size for deeper headings
              }),
            ],
            heading: headingLevel,
            spacing: {
              before: 240,
              after: 120,
            },
          }),
        )
      } else if (element.tagName === "P") {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: element.textContent || "",
                size: 24, // 12pt
              }),
            ],
            spacing: {
              after: 120, // Space after paragraph
            },
          }),
        )
      } else if (element.tagName === "UL" || element.tagName === "OL") {
        const items = element.querySelectorAll("li")
        items.forEach((item, index) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${element.tagName === "OL" ? (index + 1) + "." : "•"} ${item.textContent || ""}`,
                  size: 24, // 12pt
                }),
              ],
              indent: {
                left: 720, // 0.5 inches in twips
              },
              spacing: {
                after: 80, // Space after list item
              },
            }),
          )
        })
      } else if (element.tagName === "TABLE") {
        try {
          const rows = element.querySelectorAll("tr")
          const tableRows = []

          rows.forEach((row) => {
            const cells = row.querySelectorAll("th, td")
            const tableCells = []

            cells.forEach((cell) => {
              tableCells.push(
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cell.textContent || "",
                          bold: cell.tagName === "TH",
                          color: cell.tagName === "TH" ? "FFFFFF" : "000000",
                          size: 24, // 12pt
                        }),
                      ],
                    }),
                  ],
                  shading:
                    cell.tagName === "TH"
                      ? {
                          fill: "2ECC71", // Green color - without # prefix for docx
                          type: ShadingType.SOLID,
                          color: "auto",
                        }
                      : undefined,
                  verticalAlign: "center",
                }),
              )
            })

            if (tableCells.length > 0) {
              tableRows.push(new TableRow({ children: tableCells }))
            }
          })

          if (tableRows.length > 0) {
            children.push(
              new Table({
                rows: tableRows,
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                },
              }),
            )

            // Add space after table
            children.push(
              new Paragraph({
                children: [],
                spacing: {
                  after: 200,
                },
              }),
            )
          }
        } catch (tableError) {
          console.error("Error processing table:", tableError)
          // Add a paragraph indicating there was a table
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "[Table content could not be processed]",
                  italics: true,
                }),
              ],
            }),
          )
        }
      }
    })

    // Ensure we have at least one paragraph if no content was extracted
    if (children.length === 0) {
      const text = tempDiv.textContent || "No content"
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text,
              size: 24, // 12pt
            }),
          ],
        }),
      )
    }

    // Add footer
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Generated by docfa.st",
            color: "808080",
            size: 18, // 9pt
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 400, // Space before footer
        },
      }),
    )

    // Update the document with our content
    doc.sections[0].children = children

    // Generate the DOCX file
    const buffer = await Packer.toBuffer(doc)
    console.log("DOCX created successfully")
    return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
  } catch (error) {
    console.error("Error in DOCX generation:", error)
    // Fallback to text document if DOCX generation fails
    console.log("Falling back to text document")
    const text = contentElement.innerText || contentElement.textContent || ""
    return new Blob([text], { type: "text/plain" })
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
            font-family: ${contentElement.style.fontFamily || "Arial, sans-serif"};
            line-height: 1.6;
            color: ${contentElement.style.color || "#333"};
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: ${contentElement.style.backgroundColor || "#ffffff"};
          }
          h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            color: #2ECC71;
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
            background-color: #2ECC71;
            color: white;
          }
          .placeholder, span[class*='bg-yellow'] { 
            background-color: #FFEB3B; 
            color: #000000; 
            padding: 2px 4px; 
            border-radius: 4px; 
          }
          div[class*='bg-blue'], div[class*='bg-sky'], div[class*='bg-slate'] { 
            background-color: #E3F2FD; 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
          }
          footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #999;
          }
        </style>
      </head>
      <body>
        ${contentElement.innerHTML}
        <footer>Generated by docfa.st</footer>
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

// Plain text export function
export const generateTXT = (element: HTMLElement, filename: string): void => {
  try {
    const text = getAllTextContent(element)
    const blob = new Blob([text], { type: "text/plain" })

    // Use our own saveAs implementation
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 100)
  } catch (error) {
    console.error("Error generating TXT:", error)
    alert("Failed to generate TXT. Please try again.")
  }
}
