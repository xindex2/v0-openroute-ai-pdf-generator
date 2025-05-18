"use server"

import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"
import {
  createDocument,
  updateDocument as updateDocumentInDb,
  createDocumentVersion,
  getDocumentVersions,
  createMissingFields,
} from "./supabase/document-service"
import { extractMissingFields } from "./utils"

// Initialize OpenRouter with the API key
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTE_API_KEY || "",
})

export async function generateDocument(prompt: string, userId = "anonymous") {
  try {
    console.log("Starting document generation with OpenRouter API")

    // Create a more detailed prompt for the AI
    const enhancedPrompt = `
      Generate a professional document based on this request: "${prompt}"
      
      The document should be well-structured and formatted with HTML.
      Use appropriate HTML tags (h1, h2, p, table, etc.) for formatting.
      
      IMPORTANT: Apply rich styling directly in the HTML with inline styles:
      - Use attractive colors for headings, backgrounds, and sections
      - Apply proper spacing, margins, and padding
      - Create visually distinct sections with background colors
      
      Identify any fields that would need to be filled in by the user and mark them with square brackets like [Field Name].
      
      Return ONLY the HTML content without any explanations, markdown, or code blocks.
    `

    const OPENROUTER_API_KEY = process.env.OPENROUTE_API_KEY
    console.log("Using OpenRouter API key:", OPENROUTER_API_KEY ? "Key is set" : "Key is missing")

    if (!OPENROUTER_API_KEY) {
      console.log("API key is missing, falling back to mock data")
      return generateMockDocument(prompt)
    }

    try {
      // Call the OpenRouter API using the AI SDK
      const { text } = await generateText({
        model: openrouter.chat("google/gemini-2.5-flash-preview"),
        prompt: enhancedPrompt,
        system:
          "You are a professional document generator. Create well-formatted HTML documents with appropriate structure and placeholders for missing information. Apply rich styling directly in the HTML with attractive colors for headings, backgrounds, and sections. Use color psychology to make documents visually appealing and professional. Include background colors, borders, and other visual elements to create a polished look. DO NOT include markdown code blocks or ```html tags in your response.",
      })

      console.log("Successfully received response from OpenRouter API")

      // Clean up any markdown code block markers
      let cleanedContent = text
      cleanedContent = cleanedContent.replace(/```html/g, "")
      cleanedContent = cleanedContent.replace(/```/g, "")

      // Extract missing fields from the generated content
      const missingFields = extractMissingFields(cleanedContent)

      // Create a title from the prompt
      const title = prompt.length > 50 ? prompt.substring(0, 50) + "..." : prompt

      // Save the document to the database
      const document = await createDocument(title, cleanedContent, userId)

      if (document) {
        // Create the first version
        await createDocumentVersion(document.id, cleanedContent, 0)

        // Create missing fields
        await createMissingFields(document.id, missingFields)
      }

      return {
        document,
        content: cleanedContent,
        missingFields,
      }
    } catch (apiError) {
      console.error("OpenRouter API call failed:", apiError)

      // Fallback to mock data if API call fails
      console.log("Falling back to mock data")
      return generateMockDocument(prompt, userId)
    }
  } catch (error) {
    console.error("Error in generateDocument function:", error)
    // Fallback to mock data
    return generateMockDocument(prompt, userId)
  }
}

// Function to update an existing document
export async function updateDocument(documentId: string, existingContent: string, updateInstructions: string) {
  try {
    console.log("Starting document update with OpenRouter API")

    // Create a more detailed prompt for the AI
    const enhancedPrompt = `
      I have an existing HTML document that I need you to update based on these instructions: "${updateInstructions}"
      
      Here is the current document content:
      
      ${existingContent}
      
      Please make the requested changes while preserving the overall structure and styling.
      Return the complete updated HTML document.
      
      Return ONLY the HTML content without any explanations or markdown.
    `

    const OPENROUTER_API_KEY = process.env.OPENROUTE_API_KEY
    console.log("Using OpenRouter API key:", OPENROUTER_API_KEY ? "Key is set" : "Key is missing")

    if (!OPENROUTER_API_KEY) {
      console.log("API key is missing, falling back to mock update")
      return {
        content: existingContent,
        missingFields: extractMissingFields(existingContent),
      }
    }

    try {
      // Call the OpenRouter API using the AI SDK
      const { text } = await generateText({
        model: openrouter.chat("google/gemini-2.5-flash-preview"),
        prompt: enhancedPrompt,
        system:
          "You are a professional document editor. Update HTML documents based on user instructions while preserving the overall structure and styling. Make targeted changes without rewriting the entire document unless necessary.",
      })

      console.log("Successfully received response from OpenRouter API")

      // Clean up any markdown code block markers
      let updatedContent = text
      updatedContent = updatedContent.replace(/```html/g, "")
      updatedContent = updatedContent.replace(/```/g, "")

      // Extract missing fields from the updated content
      const missingFields = extractMissingFields(updatedContent)

      // Get the document from the database
      const document = await updateDocumentInDb(
        documentId,
        (await getDocument(documentId))?.title || "Updated Document",
        updatedContent,
      )

      if (document) {
        // Get existing versions
        const versions = await getDocumentVersions(documentId)
        const newVersionNumber = versions.length

        // Create a new version
        await createDocumentVersion(documentId, updatedContent, newVersionNumber)

        // Update missing fields
        await createMissingFields(documentId, missingFields)
      }

      return {
        document,
        content: updatedContent,
        missingFields,
      }
    } catch (apiError) {
      console.error("OpenRouter API call failed:", apiError)
      throw apiError
    }
  } catch (error) {
    console.error("Error in updateDocument function:", error)
    throw error
  }
}

// New function to stream document generation
export async function streamDocument(prompt: string, onChunk: (chunk: string) => void, signal?: AbortSignal) {
  try {
    console.log("Starting document streaming with OpenRouter API")

    // Create a more detailed prompt for the AI
    const enhancedPrompt = `
      Generate a professional document based on this request: "${prompt}"
      
      The document should be well-structured and formatted with HTML.
      Use appropriate HTML tags (h1, h2, p, table, etc.) for formatting.
      
      IMPORTANT: Apply rich styling directly in the HTML with inline styles:
      - Use attractive colors for headings, backgrounds, and sections
      - Apply proper spacing, margins, and padding
      - Create visually distinct sections with background colors
      
      Identify any fields that would need to be filled in by the user and mark them with square brackets like [Field Name].
      
      Return ONLY the HTML content without any explanations, markdown, or code blocks.
    `

    const OPENROUTER_API_KEY = process.env.OPENROUTE_API_KEY

    if (!OPENROUTER_API_KEY) {
      console.log("API key is missing, falling back to mock data")
      const mockData = generateMockDocument(prompt)
      onChunk(mockData.content)
      return
    }

    // Call the OpenRouter API with streaming
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://vercel.com",
        "X-Title": "docfa.st",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a professional document generator. Create well-formatted HTML documents with appropriate structure and placeholders for missing information. Apply rich styling directly in the HTML with attractive colors for headings, backgrounds, and sections. Use color psychology to make documents visually appealing and professional. Include background colors, borders, and other visual elements to create a polished look. DO NOT include markdown code blocks or ```html tags in your response.",
          },
          {
            role: "user",
            content: enhancedPrompt,
          },
        ],
        stream: true,
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenRouter API error:", errorText)
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("Response body is not readable")
    }

    const decoder = new TextDecoder()
    let buffer = ""

    // Process the stream
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk

      // Process the buffer to extract complete JSON objects
      let newlineIndex
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex)
        buffer = buffer.slice(newlineIndex + 1)

        if (line.startsWith("data: ")) {
          const data = line.slice(6)

          if (data === "[DONE]") {
            continue
          }

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices[0]?.delta?.content || ""

            if (content) {
              // Clean up any markdown code block markers
              const cleanedContent = content.replace(/```html/g, "").replace(/```/g, "")

              onChunk(cleanedContent)
            }
          } catch (e) {
            console.error("Error parsing JSON:", e)
          }
        }
      }
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      console.log("Document streaming aborted")
      throw error
    }

    console.error("Error in streamDocument function:", error)
    throw error
  }
}

// Function to generate mock document when API fails
function generateMockDocument(prompt: string, userId = "anonymous") {
  console.log("Generating mock document for prompt:", prompt)

  let content = ""
  let missingFields: string[] = []

  // Generate different mock content based on the prompt
  if (prompt.toLowerCase().includes("invoice")) {
    content = generateMockInvoice()
    missingFields = ["Client Name", "Invoice Number", "Due Date", "Amount"]
  } else if (prompt.toLowerCase().includes("contract") || prompt.toLowerCase().includes("agreement")) {
    content = generateMockContract()
    missingFields = ["Party Name", "Contract Date", "Term Length", "Payment Terms"]
  } else if (prompt.toLowerCase().includes("report")) {
    content = generateMockReport()
    missingFields = ["Report Title", "Author", "Date", "Department"]
  } else {
    content = generateMockGenericDocument(prompt)
    missingFields = ["Name", "Date", "Reference Number"]
  }

  // Create a title from the prompt
  const title = prompt.length > 50 ? prompt.substring(0, 50) + "..." : prompt

  // Save the mock document to the database
  createDocument(title, content, userId)
    .then((document) => {
      if (document) {
        // Create the first version
        createDocumentVersion(document.id, content, 0)

        // Create missing fields
        createMissingFields(document.id, missingFields)
      }
    })
    .catch((error) => {
      console.error("Error saving mock document to database:", error)
    })

  return {
    content,
    missingFields,
  }
}

// Mock functions to generate different document types
function generateMockInvoice() {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; background-color: #f9fafc; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px;">INVOICE</h1>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin: 20px 0 30px;">
        <div>
          <p style="font-weight: bold;">From:</p>
          <p>Your Company Name</p>
          <p>123 Business Street</p>
          <p>Business City, BC 12345</p>
          <p>contact@yourcompany.com</p>
        </div>
        <div>
          <p style="font-weight: bold;">To:</p>
          <p>[Client Name]</p>
          <p>Client Address Line 1</p>
          <p>Client City, State ZIP</p>
          <p>client@example.com</p>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p><strong>Invoice Number:</strong> [Invoice Number]</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Due Date:</strong> [Due Date]</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Description</th>
            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Quantity</th>
            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Unit Price</th>
            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">Professional Services</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">10</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">$100.00</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">$1,000.00</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">Additional Services</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">5</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">$75.00</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">$375.00</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Subtotal:</td>
            <td style="padding: 10px; text-align: right;">$1,375.00</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Tax (10%):</td>
            <td style="padding: 10px; text-align: right;">$137.50</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">[Amount]</td>
          </tr>
        </tfoot>
      </table>
      
      <div style="margin-top: 30px;">
        <p><strong>Payment Terms:</strong> Net 30 days</p>
        <p><strong>Payment Methods:</strong> Bank Transfer, Credit Card</p>
        <p>Please include the invoice number in your payment reference.</p>
      </div>
      
      <div style="margin-top: 40px; text-align: center; color: #666; font-size: 14px;">
        <p>Thank you for your business!</p>
      </div>
    </div>
  `
}

function generateMockContract() {
  return `
    <div style="font-family: 'Times New Roman', serif; color: #333; max-width: 800px; margin: 0 auto; line-height: 1.6; background-color: #f8f9fa; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0;">
      <h1 style="text-align: center; margin-bottom: 30px; color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">SERVICE AGREEMENT</h1>
      
      <p style="text-align: center; margin-bottom: 30px;">
        This Service Agreement (the "Agreement") is entered into as of [Contract Date] (the "Effective Date") by and between:
      </p>
      
      <p style="margin-bottom: 20px;">
        <strong>Service Provider:</strong> Your Company Name, a company organized and existing under the laws of [State/Country], with its principal place of business at 123 Business Street, Business City, BC 12345 ("Provider")
      </p>
      
      <p style="margin-bottom: 30px;">
        <strong>Client:</strong> [Party Name], a [type of entity] organized and existing under the laws of [State/Country], with its principal place of business at [Client Address] ("Client")
      </p>
      
      <h2 style="color: #2c5282; margin-bottom: 15px;">1. SERVICES</h2>
      
      <p style="margin-bottom: 20px;">
        1.1 Provider agrees to provide Client with the following services (the "Services"): [Description of services to be provided].
      </p>
      
      <p style="margin-bottom: 20px;">
        1.2 Provider shall perform the Services in a professional and workmanlike manner, consistent with industry standards.
      </p>
      
      <h2 style="color: #2c5282; margin-bottom: 15px;">2. TERM</h2>
      
      <p style="margin-bottom: 20px;">
        2.1 This Agreement shall commence on the Effective Date and shall continue for a period of [Term Length] (the "Term"), unless earlier terminated as provided herein.
      </p>
      
      <h2 style="color: #2c5282; margin-bottom: 15px;">3. COMPENSATION</h2>
      
      <p style="margin-bottom: 20px;">
        3.1 In consideration for the Services, Client shall pay Provider according to the following terms: [Payment Terms].
      </p>
      
      <p style="margin-bottom: 20px;">
        3.2 Provider shall invoice Client [frequency of invoicing], and Client shall pay such invoices within [number of days] days of receipt.
      </p>
      
      <h2 style="color: #2c5282; margin-bottom: 15px;">4. CONFIDENTIALITY</h2>
      
      <p style="margin-bottom: 20px;">
        4.1 Each party acknowledges that it may receive confidential information from the other party during the Term of this Agreement. Each party agrees to maintain the confidentiality of such information and not to disclose it to any third party without the prior written consent of the disclosing party.
      </p>
      
      <h2 style="color: #2c5282; margin-bottom: 15px;">5. TERMINATION</h2>
      
      <p style="margin-bottom: 20px;">
        5.1 Either party may terminate this Agreement for cause upon written notice if the other party materially breaches this Agreement and fails to cure such breach within [number of days] days of receiving notice of such breach.
      </p>
      
      <h2 style="color: #2c5282; margin-bottom: 15px;">6. GOVERNING LAW</h2>
      
      <p style="margin-bottom: 30px;">
        6.1 This Agreement shall be governed by and construed in accordance with the laws of [State/Country], without regard to its conflict of laws principles.
      </p>
      
      <div style="display: flex; justify-content: space-between; margin-top: 50px;">
        <div style="width: 45%;">
          <p style="border-top: 1px solid #000; padding-top: 10px;"><strong>Service Provider:</strong></p>
          <p>Your Company Name</p>
          <p>Signature: ____________________</p>
          <p>Name: ____________________</p>
          <p>Title: ____________________</p>
          <p>Date: ____________________</p>
        </div>
        
        <div style="width: 45%;">
          <p style="border-top: 1px solid #000; padding-top: 10px;"><strong>Client:</strong></p>
          <p>[Party Name]</p>
          <p>Signature: ____________________</p>
          <p>Name: ____________________</p>
          <p>Title: ____________________</p>
          <p>Date: ____________________</p>
        </div>
      </div>
    </div>
  `
}

function generateMockReport() {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; line-height: 1.6; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 40px; background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 5px solid #3b82f6;">
        <h1 style="margin-bottom: 10px; color: #1e40af;">[Report Title]</h1>
        <p style="color: #4b5563;">Prepared by: [Author]</p>
        <p style="color: #4b5563;">Date: [Date]</p>
        <p style="color: #4b5563;">Department: [Department]</p>
      </div>
      
      <h2 style="color: #2c5282; margin-bottom: 15px;">Executive Summary</h2>
      
      <p style="margin-bottom: 20px;">
        This report provides an analysis of our recent project outcomes and performance metrics. The findings indicate significant progress in key areas while highlighting opportunities for improvement in others.
      </p>
      
      <h2 style="color: #2c5282; margin-bottom: 15px;">1. Introduction</h2>
      
      <p style="margin-bottom: 20px;">
        This report was commissioned to evaluate the performance of Project X during the first quarter of 2023. The analysis focuses on key performance indicators (KPIs), resource utilization, and achievement of strategic objectives.
      </p>
      
      <h2 style="color: #2c5282; margin-bottom: 15px;">2. Methodology</h2>
      
      <p style="margin-bottom: 20px;">
        Data was collected through a combination of system analytics, team surveys, and client feedback forms. The analysis employed both quantitative and qualitative methods to ensure a comprehensive understanding of project performance.
      </p>
      
      <h2 style="color: #2c5282; margin-bottom: 15px;">3. Key Findings</h2>
      
      <h3 style="color: #3182ce; margin-bottom: 10px;">3.1 Performance Metrics</h3>
      
      <p style="margin-bottom: 20px;">
        The project achieved an 87% completion rate against planned milestones, representing a 12% improvement over the previous quarter. Resource utilization stood at 92%, which is within the optimal range of 90-95%.
      </p>
      
      <h3 style="color: #3182ce; margin-bottom: 10px;">3.2 Client Satisfaction</h3>
      
      <p style="margin-bottom: 20px;">
        Client satisfaction surveys indicated an overall satisfaction score of 4.2/5, with particularly high ratings for communication (4.5/5) and quality of deliverables (4.3/5). Areas for improvement include response time to change requests (3.8/5).
      </p>
      
      <h3 style="color: #3182ce; margin-bottom: 10px;">3.3 Team Performance</h3>
      
      <p style="margin-bottom: 20px;">
        Team productivity increased by 15% compared to the baseline established at project initiation. Cross-functional collaboration was rated highly by 78% of team members, though 22% indicated challenges with information sharing across departments.
      </p>
      
      <h2 style="color: #2c5282; margin-bottom: 15px;">4. Recommendations</h2>
      
      <ul style="margin-bottom: 20px;">
        <li>Implement a streamlined process for handling change requests to improve response time.</li>
        <li>Enhance cross-departmental communication channels to address information sharing challenges.</li>
        <li>Develop additional training resources for team members in areas identified as skill gaps.</li>
        <li>Consider reallocating resources to optimize team composition based on project requirements.</li>
      </ul>
      
      <h2 style="color: #2c5282; margin-bottom: 15px;">5. Conclusion</h2>
      
      <p style="margin-bottom: 30px;">
        Project X has demonstrated strong performance across most key metrics, with notable improvements in completion rates and team productivity. By addressing the identified areas for improvement, particularly in change request handling and cross-departmental communication, the project is well-positioned to exceed targets in the coming quarter.
      </p>
      
      <div style="margin-top: 50px;">
        <p><strong>Submitted by:</strong> [Author]</p>
        <p><strong>Approved by:</strong> ____________________</p>
        <p><strong>Date:</strong> [Date]</p>
      </div>
    </div>
  `
}

function generateMockGenericDocument(prompt: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; line-height: 1.6; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 25px; text-align: center; margin-bottom: 30px; border-radius: 8px;">
        <h1 style="margin: 0; font-size: 26px; letter-spacing: 0.5px;">Document</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">Reference: [Reference Number]</p>
        <p style="margin: 5px 0 0; opacity: 0.9;">Date: [Date]</p>
        <p style="margin: 5px 0 0; opacity: 0.9;">Prepared for: [Name]</p>
      </div>
      
      <p style="margin-bottom: 20px;">
        This document was generated based on the following request:
      </p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #2c5282; margin-bottom: 20px;">
        <p style="font-style: italic;">${prompt}</p>
      </div>
      
      <h2 style="color: #2c5282; margin-bottom: 15px;">1. Overview</h2>
      
      <p style="margin-bottom: 20px;">
        This document provides a comprehensive outline of the requested information. It has been structured to address all key points while maintaining clarity and professionalism.
      </p>
      
      <h2 style="color: #2c5282; margin-bottom: 15px;">2. Key Information</h2>
      
      <p style="margin-bottom: 20px;">
        The following sections contain the primary content generated in response to your request. Each section addresses specific aspects of the prompt to ensure a complete and thorough response.
      </p>
      
      <h3 style="color: #3182ce; margin-bottom: 10px;">2.1 Primary Considerations</h3>
      
      <p style="margin-bottom: 20px;">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl.
      </p>
      
      <h3 style="color: #3182ce; margin-bottom: 10px;">2.2 Secondary Factors</h3>
      
      <p style="margin-bottom: 20px;">
        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
      </p>
      
      <h2 style="color: #2c5282; margin-bottom: 15px;">3. Conclusion</h2>
      
      <p style="margin-bottom: 30px;">
        This document has been generated to address your specific requirements as outlined in the prompt. The information provided is intended to serve as a comprehensive response to your query, with all key points addressed in a clear and structured manner.
      </p>
      
      <div style="margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px;">
        <p><strong>Generated by:</strong> AI PDF Generator</p>
        <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Authorized by:</strong> ____________________</p>
      </div>
    </div>
  `
}

import { getDocument } from "./supabase/document-service"
