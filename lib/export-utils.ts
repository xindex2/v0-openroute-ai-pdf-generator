"use client"

import html2canvas from "html2canvas"
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, BorderStyle } from "docx"

// Export as DOCX
export async function exportAsDocx(contentElement: HTMLElement, title: string): Promise<Blob> {
  try {
    // Create a new docx Document
    const doc = new Document({
      title: title,
      description: "Generated with AI PDF Generator",
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 24,
              font: "Calibri",
            },
            paragraph: {
              spacing: {
                after: 200,
              },
            },
          },
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 36,
              bold: true,
              color: "2ECC71",
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120,
              },
            },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 32,
              bold: true,
              color: "2ECC71",
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120,
              },
            },
          },
        ],
      },
    })

    // Parse HTML and convert to docx elements
    const sections = []

    // Process headings
    const headings = contentElement.querySelectorAll("h1, h2, h3, h4, h5, h6")
    headings.forEach((heading) => {
      const level = Number.parseInt(heading.tagName.substring(1))
      const headingLevel = level <= 6 ? (level as HeadingLevel) : HeadingLevel.HEADING_1

      sections.push(
        new Paragraph({
          text: heading.textContent || "",
          heading: headingLevel,
        }),
      )
    })

    // Process paragraphs
    const paragraphs = contentElement.querySelectorAll("p")
    paragraphs.forEach((p) => {
      sections.push(
        new Paragraph({
          text: p.textContent || "",
        }),
      )
    })

    // Process tables (simplified)
    const tables = contentElement.querySelectorAll("table")
    tables.forEach((table) => {
      const rows = table.querySelectorAll("tr")
      const docxRows = []

      rows.forEach((row) => {
        const cells = row.querySelectorAll("th, td")
        const docxCells = []

        cells.forEach((cell) => {
          docxCells.push(
            new TableCell({
              children: [
                new Paragraph({
                  text: cell.textContent || "",
                  ...(cell.tagName === "TH" && { heading: HeadingLevel.HEADING_3 }),
                }),
              ],
              ...(cell.tagName === "TH" && {
                shading: {
                  fill: "2ECC71",
                },
              }),
            }),
          )
        })

        docxRows.push(new TableRow({ children: docxCells }))
      })

      if (docxRows.length > 0) {
        sections.push(
          new Table({
            rows: docxRows,
            width: {
              size: 100,
              type: "pct",
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
      }
    })

    // Add all sections to the document
    doc.addSection({
      children: sections.length > 0 ? sections : [new Paragraph({ text: "No content" })],
    })

    // Generate the docx file
    const buffer = await Packer.toBuffer(doc)
    return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
  } catch (error) {
    console.error("Error generating DOCX:", error)
    throw new Error("Failed to generate DOCX: " + (error instanceof Error ? error.message : String(error)))
  }
}

// Export as Image
export async function exportAsImage(contentElement: HTMLElement): Promise<Blob> {
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

      // Convert canvas to blob
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to convert canvas to blob"))
          }
        }, "image/png")
      })
    } finally {
      // Clean up - remove the temporary div
      document.body.removeChild(tempDiv)
    }
  } catch (error) {
    console.error("Error generating image:", error)
    throw new Error("Failed to generate image: " + (error instanceof Error ? error.message : String(error)))
  }
}
