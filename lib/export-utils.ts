"use client"

import html2canvas from "html2canvas"
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, BorderStyle, TextRun } from "docx"

// Export as DOCX
export async function exportAsDocx(contentElement: HTMLElement, title: string): Promise<Blob> {
  try {
    console.log("Starting DOCX export process")

    // Create a new docx Document with proper initialization
    const doc = new Document({
      title: title,
      description: "Generated with AI PDF Generator",
      sections: [
        {
          properties: {},
          children: [],
        },
      ],
    })

    // Parse HTML and convert to docx elements
    const children = []

    // Add title
    const titleElement = contentElement.querySelector("h1")
    if (titleElement && titleElement.textContent) {
      children.push(
        new Paragraph({
          text: titleElement.textContent,
          heading: HeadingLevel.HEADING_1,
        }),
      )
    }

    // Process all elements in order
    const elements = contentElement.querySelectorAll("h1, h2, h3, h4, h5, h6, p, ul, ol, table")
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
            text: element.textContent || "",
            heading: headingLevel,
          }),
        )
      } else if (element.tagName === "P") {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: element.textContent || "",
              }),
            ],
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
                }),
              ],
              indent: {
                left: 720, // 0.5 inches in twips
              },
            }),
          )
        })
      } else if (element.tagName === "TABLE") {
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
                      }),
                    ],
                  }),
                ],
                shading:
                  cell.tagName === "TH"
                    ? {
                        fill: "2ECC71",
                      }
                    : undefined,
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
      }
    })

    // Ensure we have at least one paragraph if no content was extracted
    if (children.length === 0) {
      children.push(new Paragraph({ text: "No content" }))
    }

    // Update the first section with our content
    doc.sections[0].children = children

    console.log(`DOCX document created with ${children.length} elements`)

    // Generate the docx file
    try {
      const buffer = await Packer.toBuffer(doc)
      console.log("DOCX buffer created successfully")
      return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
    } catch (packError) {
      console.error("Error packing DOCX:", packError)
      throw new Error(`Failed to pack DOCX: ${packError.message}`)
    }
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
