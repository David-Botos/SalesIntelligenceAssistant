class DocumentMetadata {
  title string @description("The main title of the document")
  sourceUrl string? @description("Source URL if present")
}

class MarkdownSection {
  title string @description("The heading/title for this section")
  level int @description("The heading level (1-6)")
  content string @description("The content text under this heading")
  subsections MarkdownSection[] @description("Any nested subsections under this heading")
}

class DocumentStructure {
  metadata DocumentMetadata
  sections MarkdownSection[] @description("Top-level sections of the document")
}

function ExtractDocumentStructure(rawText: string) -> DocumentStructure {
  client "anthropic/claude-3-5-sonnet-latest"
  prompt #"
    You are a documentation structure analyzer. Given text content (likely from a documentation page),
    extract the document's structure including metadata and hierarchical sections.

    Follow these guidelines:
    - Extract the title and source URL if present at the start
    - Identify main sections and their subsections
    - Preserve the hierarchical relationship between sections
    - Include relevant content under each section
    - Clean up any artifacts from web scraping or text extraction
    - Ignore navigation elements or non-content sections (like "Edit on GitHub")

    {{ ctx.output_format }}

    {{ _.role("user") }} {{ rawText }}
  "#
}

test BasicDocsTest {
  functions [ExtractDocumentStructure]
  args {
    rawText #"
      Title: Getting Started Guide
      URL Source: https://example.com/docs/getting-started

      Introduction
      This guide will help you get started with our platform.

      Installation
      Follow these steps to install:
      1. Download the package
      2. Run setup wizard

      Configuration
      Basic configuration involves:
      - Setting API keys
      - Choosing preferences
    "#
  }
}

test TechnicalDocsTest {
  functions [ExtractDocumentStructure]
  args {
    rawText #"
      Title: HSDS Reference Guide
      URL Source: https://docs.openreferral.org/en/latest/

      About HSDS
      The Human Services Data Specification defines core objects and relationships.

      Core Objects
      Organizations
      - Name and description
      - Contact information

      Services
      - Service types
      - Eligibility rules

      Locations
      - Physical addresses
      - Service areas
    "#
  }
}