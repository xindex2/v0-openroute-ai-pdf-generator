"use server"

import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

// Initialize OpenRouter with the API key
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTE_API_KEY || "",
})

export async function generatePdf(prompt: string, documentType: string) {
  try {
    console.log("Starting PDF generation with OpenRouter API")

    // Create a more detailed prompt for the AI
    const enhancedPrompt = `
      Generate a professional ${documentType} with HTML formatting.
      
      The content should be well-structured and include appropriate sections for a ${documentType}.
      Use HTML tags for formatting (h1, h2, p, table, etc.).
      
      Identify any fields that would need to be filled in by the user and mark them with square brackets like [Field Name].
      
      Additional context: ${prompt}
    `

    console.log("Using OpenRouter API key:", process.env.OPENROUTE_API_KEY ? "Key is set" : "Key is missing")

    // Call the OpenRouter API using the AI SDK
    try {
      const { text } = await generateText({
        model: openrouter.chat("anthropic/claude-3-5-sonnet"),
        prompt: enhancedPrompt,
        system:
          "You are a professional document generator. Create well-formatted HTML documents with appropriate structure and placeholders for missing information.",
      })

      console.log("Successfully received response from OpenRouter API")

      // Extract missing fields from the generated content
      const missingFields = extractMissingFields(text)

      return {
        content: text,
        missingFields,
      }
    } catch (apiError) {
      console.error("OpenRouter API call failed:", apiError)

      // Fallback to mock data if API call fails
      console.log("Falling back to mock data")
      return generateMockDocument(prompt, documentType)
    }
  } catch (error) {
    console.error("Error in generatePdf function:", error)
    // Fallback to mock data
    return generateMockDocument(prompt, documentType)
  }
}

// Helper function to extract missing fields from the content
function extractMissingFields(content: string): string[] {
  const regex = /\[(.*?)\]/g
  const matches = content.match(regex) || []

  // Extract field names and remove duplicates
  const fields = matches.map((match) => match.replace(/[[\]]/g, "").trim()).filter((field) => field.length > 0)

  // Remove duplicates
  return [...new Set(fields)]
}

// Function to generate mock document when API fails
function generateMockDocument(prompt: string, documentType: string) {
  console.log("Generating mock document for type:", documentType)

  let content = ""
  let missingFields: string[] = []

  // Generate different mock content based on document type
  if (documentType.toLowerCase().includes("invoice")) {
    content = generateMockInvoice()
    missingFields = ["Client Name", "Invoice Number", "Due Date", "Amount"]
  } else if (documentType.toLowerCase().includes("contract")) {
    content = generateMockContract()
    missingFields = ["Party Name", "Contract Date", "Term Length", "Payment Terms"]
  } else if (documentType.toLowerCase().includes("report")) {
    content = generateMockReport()
    missingFields = ["Report Title", "Author", "Date", "Department"]
  } else {
    content = generateMockGenericDocument(prompt, documentType)
    missingFields = ["Name", "Date", "Reference Number"]
  }

  return {
    content,
    missingFields,
  }
}

// Mock functions to generate different document types
function generateMockInvoice() {
  return `
    <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">INVOICE</h1>
    
    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
      <div>
        <p><strong>From:</strong> Your Company Name</p>
        <p>123 Business Street</p>
        <p>Business City, BC 12345</p>
        <p>contact@yourcompany.com</p>
      </div>
      <div>
        <p><strong>To:</strong> [Client Name]</p>
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
  `
}

function generateMockContract() {
  return `
    <h1 style="text-align: center; margin-bottom: 30px;">SERVICE AGREEMENT</h1>
    
    <p style="text-align: center; margin-bottom: 30px;">
      This Service Agreement (the "Agreement") is entered into as of [Contract Date] (the "Effective Date") by and between:
    </p>
    
    <p style="margin-bottom: 20px;">
      <strong>Service Provider:</strong> Your Company Name, a company organized and existing under the laws of [State/Country], with its principal place of business at 123 Business Street, Business City, BC 12345 ("Provider")
    </p>
    
    <p style="margin-bottom: 30px;">
      <strong>Client:</strong> [Party Name], a [type of entity] organized and existing under the laws of [State/Country], with its principal place of business at [Client Address] ("Client")
    </p>
    
    <h2 style="margin-bottom: 15px;">1. SERVICES</h2>
    
    <p style="margin-bottom: 20px;">
      1.1 Provider agrees to provide Client with the following services (the "Services"): [Description of services to be provided].
    </p>
    
    <p style="margin-bottom: 20px;">
      1.2 Provider shall perform the Services in a professional and workmanlike manner, consistent with industry standards.
    </p>
    
    <h2 style="margin-bottom: 15px;">2. TERM</h2>
    
    <p style="margin-bottom: 20px;">
      2.1 This Agreement shall commence on the Effective Date and shall continue for a period of [Term Length] (the "Term"), unless earlier terminated as provided herein.
    </p>
    
    <h2 style="margin-bottom: 15px;">3. COMPENSATION</h2>
    
    <p style="margin-bottom: 20px;">
      3.1 In consideration for the Services, Client shall pay Provider according to the following terms: [Payment Terms].
    </p>
    
    <p style="margin-bottom: 20px;">
      3.2 Provider shall invoice Client [frequency of invoicing], and Client shall pay such invoices within [number of days] days of receipt.
    </p>
    
    <h2 style="margin-bottom: 15px;">4. CONFIDENTIALITY</h2>
    
    <p style="margin-bottom: 20px;">
      4.1 Each party acknowledges that it may receive confidential information from the other party during the Term of this Agreement. Each party agrees to maintain the confidentiality of such information and not to disclose it to any third party without the prior written consent of the disclosing party.
    </p>
    
    <h2 style="margin-bottom: 15px;">5. TERMINATION</h2>
    
    <p style="margin-bottom: 20px;">
      5.1 Either party may terminate this Agreement for cause upon written notice if the other party materially breaches this Agreement and fails to cure such breach within [number of days] days of receiving notice of such breach.
    </p>
    
    <h2 style="margin-bottom: 15px;">6. GOVERNING LAW</h2>
    
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
  `
}

function generateMockReport() {
  return `
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="margin-bottom: 10px;">[Report Title]</h1>
      <p>Prepared by: [Author]</p>
      <p>Date: [Date]</p>
      <p>Department: [Department]</p>
    </div>
    
    <h2 style="margin-bottom: 15px;">Executive Summary</h2>
    
    <p style="margin-bottom: 20px;">
      This report provides an analysis of our recent project outcomes and performance metrics. The findings indicate significant progress in key areas while highlighting opportunities for improvement in others.
    </p>
    
    <h2 style="margin-bottom: 15px;">1. Introduction</h2>
    
    <p style="margin-bottom: 20px;">
      This report was commissioned to evaluate the performance of Project X during the first quarter of 2023. The analysis focuses on key performance indicators (KPIs), resource utilization, and achievement of strategic objectives.
    </p>
    
    <h2 style="margin-bottom: 15px;">2. Methodology</h2>
    
    <p style="margin-bottom: 20px;">
      Data was collected through a combination of system analytics, team surveys, and client feedback forms. The analysis employed both quantitative and qualitative methods to ensure a comprehensive understanding of project performance.
    </p>
    
    <h2 style="margin-bottom: 15px;">3. Key Findings</h2>
    
    <h3 style="margin-bottom: 10px;">3.1 Performance Metrics</h3>
    
    <p style="margin-bottom: 20px;">
      The project achieved an 87% completion rate against planned milestones, representing a 12% improvement over the previous quarter. Resource utilization stood at 92%, which is within the optimal range of 90-95%.
    </p>
    
    <h3 style="margin-bottom: 10px;">3.2 Client Satisfaction</h3>
    
    <p style="margin-bottom: 20px;">
      Client satisfaction surveys indicated an overall satisfaction score of 4.2/5, with particularly high ratings for communication (4.5/5) and quality of deliverables (4.3/5). Areas for improvement include response time to change requests (3.8/5).
    </p>
    
    <h3 style="margin-bottom: 10px;">3.3 Team Performance</h3>
    
    <p style="margin-bottom: 20px;">
      Team productivity increased by 15% compared to the baseline established at project initiation. Cross-functional collaboration was rated highly by 78% of team members, though 22% indicated challenges with information sharing across departments.
    </p>
    
    <h2 style="margin-bottom: 15px;">4. Recommendations</h2>
    
    <ul style="margin-bottom: 20px;">
      <li>Implement a streamlined process for handling change requests to improve response time.</li>
      <li>Enhance cross-departmental communication channels to address information sharing challenges.</li>
      <li>Develop additional training resources for team members in areas identified as skill gaps.</li>
      <li>Consider reallocating resources to optimize team composition based on project requirements.</li>
    </ul>
    
    <h2 style="margin-bottom: 15px;">5. Conclusion</h2>
    
    <p style="margin-bottom: 30px;">
      Project X has demonstrated strong performance across most key metrics, with notable improvements in completion rates and team productivity. By addressing the identified areas for improvement, particularly in change request handling and cross-departmental communication, the project is well-positioned to exceed targets in the coming quarter.
    </p>
    
    <div style="margin-top: 50px;">
      <p><strong>Submitted by:</strong> [Author]</p>
      <p><strong>Approved by:</strong> ____________________</p>
      <p><strong>Date:</strong> [Date]</p>
    </div>
  `
}

function generateMockGenericDocument(prompt: string, documentType: string) {
  return `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="margin-bottom: 10px;">${documentType.toUpperCase()}</h1>
      <p>Reference: [Reference Number]</p>
      <p>Date: [Date]</p>
      <p>Prepared for: [Name]</p>
    </div>
    
    <p style="margin-bottom: 20px;">
      This document was generated based on the following prompt:
    </p>
    
    <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #ddd; margin-bottom: 20px;">
      <p style="font-style: italic;">${prompt}</p>
    </div>
    
    <h2 style="margin-bottom: 15px;">1. Overview</h2>
    
    <p style="margin-bottom: 20px;">
      This ${documentType.toLowerCase()} provides a comprehensive outline of the requested information. It has been structured to address all key points while maintaining clarity and professionalism.
    </p>
    
    <h2 style="margin-bottom: 15px;">2. Key Information</h2>
    
    <p style="margin-bottom: 20px;">
      The following sections contain the primary content generated in response to your request. Each section addresses specific aspects of the prompt to ensure a complete and thorough response.
    </p>
    
    <h3 style="margin-bottom: 10px;">2.1 Primary Considerations</h3>
    
    <p style="margin-bottom: 20px;">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl.
    </p>
    
    <h3 style="margin-bottom: 10px;">2.2 Secondary Factors</h3>
    
    <p style="margin-bottom: 20px;">
      Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
    </p>
    
    <h2 style="margin-bottom: 15px;">3. Conclusion</h2>
    
    <p style="margin-bottom: 30px;">
      This document has been generated to address your specific requirements as outlined in the prompt. The information provided is intended to serve as a comprehensive response to your query, with all key points addressed in a clear and structured manner.
    </p>
    
    <div style="margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px;">
      <p><strong>Generated by:</strong> AI PDF Generator</p>
      <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Authorized by:</strong> ____________________</p>
    </div>
  `
}
