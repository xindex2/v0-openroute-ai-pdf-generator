"use client"

import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Loader2, Download, Save, Sparkles, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { generateDocument, streamDocument } from "@/lib/document-actions"
import MissingFieldsForm from "@/components/missing-fields-form"
import { generatePdfFromHtml } from "@/lib/pdf-generator"
import RichTextEditor from "@/components/rich-text-editor"
import ThemeCustomizer from "@/components/theme-customizer"

type FormData = {
  prompt: string
}

export default function PdfGenerator() {
  const [pdfContent, setPdfContent] = useState<string>("")
  const [streamedContent, setStreamedContent] = useState<string>("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [editedContent, setEditedContent] = useState<string>("")
  const [pdfUrl, setPdfUrl] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("edit")
  const [documentTheme, setDocumentTheme] = useState({
    primaryColor: "#1a365d",
    secondaryColor: "#2c5282",
    accentColor: "#3182ce",
    backgroundColor: "#ffffff",
    textColor: "#333333",
    fontFamily: "Inter, sans-serif",
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>()

  const editorRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const finalContentRef = useRef<string>("")

  useEffect(() => {
    // Apply theme to edited content when theme changes
    if (editedContent) {
      applyThemeToContent()
    }
  }, [documentTheme])

  // Keep track of streamed content in a ref to avoid race conditions
  useEffect(() => {
    finalContentRef.current = streamedContent
  }, [streamedContent])

  const applyThemeToContent = () => {
    // This function would apply the theme to the edited content
    // For now, we'll just set the edited content as is
    // In a real implementation, you would parse the HTML and apply the theme
    setEditedContent(editedContent)
  }

  const onSubmit = async (data: FormData) => {
    try {
      setIsGenerating(true)
      setPdfUrl("")
      setError(null)
      setStreamedContent("")
      finalContentRef.current = ""

      // Cancel any ongoing streaming
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController()

      console.log("Generating document from prompt:", data.prompt)

      // Start streaming
      setIsStreaming(true)

      try {
        await streamDocument(
          data.prompt,
          (chunk) => {
            setStreamedContent((prev) => {
              const newContent = prev + chunk
              finalContentRef.current = newContent
              return newContent
            })
          },
          abortControllerRef.current.signal,
        )

        console.log("Document streaming completed")

        // When streaming is done, use the final accumulated content
        const finalContent = finalContentRef.current
        const extractedFields = extractMissingFields(finalContent)

        // Set the final content
        setPdfContent(finalContent)
        setEditedContent(finalContent)
        setMissingFields(extractedFields)

        // Switch to edit tab
        setActiveTab("edit")
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error in document streaming:", error)
          setError("There was an error generating your document. Please try again.")

          // If we have partial content, use it
          if (finalContentRef.current) {
            const finalContent = finalContentRef.current
            const extractedFields = extractMissingFields(finalContent)

            setPdfContent(finalContent)
            setEditedContent(finalContent)
            setMissingFields(extractedFields)

            // Switch to edit tab
            setActiveTab("edit")
          } else {
            // Fallback to non-streaming generation
            try {
              const result = await generateDocument(data.prompt)
              console.log("Document generation successful")

              setPdfContent(result.content)
              setEditedContent(result.content)
              setMissingFields(result.missingFields || [])

              // Switch to edit tab
              setActiveTab("edit")
            } catch (fallbackError) {
              console.error("Error in fallback document generation:", fallbackError)
              setError("There was an error generating your document. Please try again.")
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in form submission:", error)
      setError("Something went wrong. Please try again.")
    } finally {
      setIsGenerating(false)
      setIsStreaming(false)
    }
  }

  const handleFieldChange = (field: string, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Apply field values to edited content
    let updatedContent = editedContent
    Object.entries({ ...fieldValues, [field]: value }).forEach(([fieldName, fieldValue]) => {
      if (fieldValue) {
        const regex = new RegExp(`\\[${fieldName}\\]`, "g")
        updatedContent = updatedContent.replace(regex, fieldValue)
      }
    })

    setEditedContent(updatedContent)
  }

  const generateFinalPdf = async () => {
    try {
      setIsGenerating(true)
      setError(null)

      if (!editorRef.current) {
        throw new Error("Editor element not found")
      }

      // Create a clone of the editor content to apply theme
      const contentElement = document.createElement("div")
      contentElement.innerHTML = editedContent

      // Apply theme styles
      const styledElement = applyThemeStyles(contentElement)

      const pdfBlob = await generatePdfFromHtml(styledElement)
      const url = URL.createObjectURL(pdfBlob)
      setPdfUrl(url)
    } catch (error) {
      console.error("Error generating final PDF:", error)
      setError("There was an error creating your PDF. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const applyThemeStyles = (element: HTMLElement): HTMLElement => {
    // Create a wrapper with theme styles
    const wrapper = document.createElement("div")
    wrapper.style.fontFamily = documentTheme.fontFamily
    wrapper.style.color = documentTheme.textColor
    wrapper.style.backgroundColor = documentTheme.backgroundColor
    wrapper.style.padding = "20px"
    wrapper.style.maxWidth = "800px"
    wrapper.style.margin = "0 auto"
    wrapper.style.lineHeight = "1.6"

    // Add style element with CSS rules
    const styleElement = document.createElement("style")
    styleElement.textContent = `
      h1, h2, h3, h4, h5, h6 {
        color: ${documentTheme.primaryColor};
      }
      a {
        color: ${documentTheme.accentColor};
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      th {
        background-color: ${documentTheme.secondaryColor};
        color: white;
        text-align: left;
        padding: 12px;
        border-bottom: 2px solid #e2e8f0;
      }
      td {
        padding: 12px;
        border-bottom: 1px solid #e2e8f0;
      }
      .header {
        background-color: ${documentTheme.primaryColor};
        color: white;
        padding: 20px;
        margin-bottom: 30px;
        border-radius: 5px;
      }
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
        text-align: center;
        font-size: 14px;
        color: ${documentTheme.secondaryColor};
      }
    `

    wrapper.appendChild(styleElement)

    // Clone the content to avoid modifying the original
    const contentClone = element.cloneNode(true) as HTMLElement

    // Append the content
    wrapper.appendChild(contentClone)

    return wrapper
  }

  const downloadPdf = () => {
    if (pdfUrl) {
      const link = document.createElement("a")
      link.href = pdfUrl
      link.download = "generated-document.pdf"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleContentChange = (content: string) => {
    setEditedContent(content)

    // Extract missing fields from the updated content
    const updatedMissingFields = extractMissingFields(content)
    setMissingFields(updatedMissingFields)
  }

  const extractMissingFields = (content: string): string[] => {
    const regex = /\[(.*?)\]/g
    const matches = content.match(regex) || []

    // Extract field names and remove duplicates
    const fields = matches.map((match) => match.replace(/[[\]]/g, "").trim()).filter((field) => field.length > 0)

    // Remove duplicates
    return [...new Set(fields)]
  }

  const handleSaveDocument = () => {
    // In a real app, this would save the document to the user's account
    alert("Document saved to your device!")

    // Create a blob and download it
    const blob = new Blob([editedContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "document.html"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mb-8">
        <div className="space-y-2">
          <Textarea
            id="prompt"
            placeholder="Describe what you need (e.g., 'Create an invoice for web design services' or 'Draft a rental agreement for a 2-bedroom apartment')"
            className="min-h-[120px]"
            {...register("prompt", { required: "Please describe what you need" })}
          />
          {errors.prompt && <p className="text-sm text-red-500">{errors.prompt.message}</p>}
        </div>

        <Button type="submit" disabled={isGenerating || isStreaming} className="w-full">
          {isGenerating || isStreaming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isStreaming ? "Generating..." : "Processing..."}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Document
            </>
          )}
        </Button>
      </form>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isStreaming && streamedContent && (
        <div className="mb-6">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium mb-2">Generating document...</h3>
              <div className="prose max-w-none overflow-auto" dangerouslySetInnerHTML={{ __html: streamedContent }} />
            </CardContent>
          </Card>
        </div>
      )}

      {!isStreaming && editedContent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Document Editor</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSaveDocument}>
                  <Save className="mr-2 h-4 w-4" />
                  Save HTML
                </Button>
                <Button variant="outline" size="sm" onClick={generateFinalPdf} disabled={isGenerating}>
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Generate PDF
                </Button>
              </div>
            </div>

            <RichTextEditor
              initialContent={editedContent}
              onChange={handleContentChange}
              onSave={generateFinalPdf}
              ref={editorRef}
            />

            {pdfUrl && (
              <div className="mt-4">
                <Button onClick={downloadPdf} className="w-full" variant="default">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            )}
          </div>

          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fields">
                  <span className="flex items-center">
                    <span>Missing Fields</span>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="theme">
                  <span className="flex items-center">
                    <Palette className="h-4 w-4 sm:mr-2" />
                    <span>Theme</span>
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="fields" className="space-y-4">
                {missingFields.length > 0 ? (
                  <MissingFieldsForm
                    fields={missingFields}
                    values={fieldValues}
                    onChange={handleFieldChange}
                    onSubmit={generateFinalPdf}
                    isSubmitting={isGenerating}
                  />
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">
                        No missing fields detected. You can download the PDF.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="theme" className="space-y-4">
                <ThemeCustomizer theme={documentTheme} onChange={setDocumentTheme} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  )
}
