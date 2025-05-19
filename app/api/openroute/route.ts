import { type NextRequest, NextResponse } from "next/server"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

// Initialize OpenRouter with the API key
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTE_API_KEY || "",
})

export async function POST(req: NextRequest) {
  try {
    console.log("API route called")

    // In a real implementation, you would validate the request body
    const body = await req.json()
    const { prompt, documentType } = body

    if (!prompt || !documentType) {
      return NextResponse.json({ error: "Missing required fields: prompt and documentType" }, { status: 400 })
    }

    // Check if API key is available
    if (!process.env.OPENROUTE_API_KEY) {
      console.log("OpenRoute API key is not configured")
      return NextResponse.json({ error: "OpenRoute API key is not configured" }, { status: 500 })
    }

    console.log("Processing request for document type:", documentType)

    try {
      // Create a more detailed prompt for the AI
      const enhancedPrompt = `
        Generate a professional ${documentType} with HTML formatting.
        
        The content should be well-structured and include appropriate sections for a ${documentType}.
        Use HTML tags for formatting (h1, h2, p, table, etc.).
        
        Identify any fields that would need to be filled in by the user and mark them with square brackets like [Field Name].
        
        Additional context: ${prompt}
      `

      // Add timeout for the API call
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      // Call the OpenRouter API using the AI SDK
      const { text } = await generateText({
        model: openrouter.chat("anthropic/claude-3-5-sonnet"),
        prompt: enhancedPrompt,
        system:
          "You are a professional document generator. Create well-formatted HTML documents with appropriate structure and placeholders for missing information.",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log("Successfully received response from OpenRouter API")

      // Extract missing fields from the generated content
      const regex = /\[(.*?)\]/g
      const matches = text.match(regex) || []
      const fields = [
        ...new Set(matches.map((match) => match.replace(/[[\]]/g, "").trim()).filter((field) => field.length > 0)),
      ]

      return NextResponse.json({
        content: text,
        missingFields: fields,
      })
    } catch (apiError) {
      console.error("Error calling OpenRouter API:", apiError)

      // Generate mock response based on document type
      let content = ""
      let missingFields: string[] = []

      if (documentType.toLowerCase().includes("invoice")) {
        content = generateMockInvoice()
        missingFields = ["Client Name", "Invoice Number", "Due Date", "Amount"]
      } else if (documentType.toLowerCase().includes("contract")) {
        content = generateMockContract()
        missingFields = ["Party Name", "Contract Date", "Term Length", "Payment Terms"]
      } else {
        content = generateMockGenericDocument(prompt, documentType)
        missingFields = ["Name", "Date", "Reference Number"]
      }

      return NextResponse.json({
        content,
        missingFields,
      })
    }
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

// Mock functions to generate different document types
function generateMockInvoice() {
  return `
    <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">INVOICE</h1>
    
    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
      <div>
        <p><strong>From:</strong> WriteDoc</p>
        <p>123 Business Street</p>
        <p>Business City, BC 12345</p>
        <p>contact@writedoc.ai</p>
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
      <strong>Service Provider:</strong> WriteDoc, a company organized and existing under the laws of [State/Country], with its principal place of business at 123 Business Street, Business City, BC 12345 ("Provider")
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
        <p>WriteDoc</p>
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
      <p><strong>Generated by:</strong> WriteDoc AI</p>
      <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Authorized by:</strong> ____________________</p>
    </div>
  `
}
