import * as fs from "fs";
import * as path from "path";
import { b, DocumentStructure, MarkdownSection } from "../baml_client";

import dotenv from "dotenv";
import { error } from "console";
dotenv.config();

function processSection(section: MarkdownSection): string {
  // Create heading based on level
  let sectionMarkdown =
    "#".repeat(section.level) + " " + section.title + "\n\n";

  // Add content if it exists
  if (section.content.trim()) {
    sectionMarkdown += section.content + "\n\n";
  }

  // Process subsections recursively
  for (const subsection of section.subsections) {
    sectionMarkdown += processSection(subsection);
  }

  return sectionMarkdown;
}

function convertDocumentToMarkdown(document: DocumentStructure): string {
  let markdown = "";

  // Add document title and source if available
  markdown += `# ${document.metadata.title}\n\n`;

  if (document.metadata.sourceUrl) {
    markdown += `Source: [${document.metadata.sourceUrl}](${document.metadata.sourceUrl})\n\n`;
  }

  // Process all top-level sections
  for (const section of document.sections) {
    markdown += processSection(section);
  }

  return markdown;
}

/**
 * Converts a DocumentStructure to Markdown and saves it to a file
 * @param document The document structure to convert
 * @param outputDir The directory where the file should be saved
 * @returns A promise that resolves to the full path of the created file
 */
async function saveDocumentAsMarkdown(
  document: DocumentStructure,
  outputDir: string
): Promise<string> {
  // Generate markdown content
  const markdownContent = convertDocumentToMarkdown(document);

  // Create sanitized filename from document title
  const sanitizedTitle = document.metadata.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const filename = `${sanitizedTitle}.md`;
  const outputPath = path.join(outputDir, filename);

  // Ensure the output directory exists
  await fs.promises.mkdir(outputDir, { recursive: true });

  // Write the markdown to a file
  await fs.promises.writeFile(outputPath, markdownContent, "utf8");

  return outputPath;
}

async function convertAndSaveDocument(documentJson: string): Promise<string> {
  try {
    if (process.env.DISTILLED_DIRECTORY) {
      const outputDir = process.env.DISTILLED_DIRECTORY;
      const document: DocumentStructure = JSON.parse(documentJson);
      const filePath = await saveDocumentAsMarkdown(document, outputDir);
      console.log(`Markdown file created at: ${filePath}`);
      return filePath;
    } else {
      console.error("Error loading DISTILLED_DIRECTORY env var", error);
      throw error;
    }
  } catch (error) {
    console.error("Error creating markdown file:", error);
    throw error;
  }
}

function readTextFile(filePath: string): string {
  try {
    const resolvedPath = path.resolve(filePath);

    const fileContent = fs.readFileSync(resolvedPath, "utf8");

    return fileContent;
  } catch (error) {
    console.error(`Error reading file with path: `, filePath, error);
    throw error;
  }
}

export default async function distillMarkdown(
  inputTXTFilePath: string
): Promise<string> {
  const websiteContents = readTextFile(inputTXTFilePath);
  const markdownJSON = await b.ExtractDocumentStructure(websiteContents);

  const markdownContent = convertDocumentToMarkdown(markdownJSON);

  const markdownFilePath = await convertAndSaveDocument(markdownContent);

  return markdownFilePath;
}
