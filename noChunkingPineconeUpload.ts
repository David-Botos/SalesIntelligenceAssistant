import dotenv from "dotenv";
dotenv.config();

import { Pinecone } from "@pinecone-database/pinecone";
import fs from "fs";
import path from "path";

/**
 * Recursively get all file paths in a directory
 */
function getAllFilePaths(
  dirPath: string,
  arrayOfFiles: string[] = []
): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    // Skip .DS_Store files
    if (file === ".DS_Store") return;

    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFilePaths(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Upload a file with retry logic
 */
async function uploadFileWithRetry(
  assistant: any,
  filePath: string,
  maxRetries = 5,
  baseDelay = 1000
): Promise<void> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await assistant.uploadFile({ path: filePath });
      return;
    } catch (error: any) {
      if (
        error.message &&
        error.message.includes("Too many pending operations")
      ) {
        const delay = baseDelay * Math.pow(2, retries);
        console.log(`Rate limited. Retrying in ${delay / 1000} seconds...`);
        await sleep(delay);
        retries++;
      } else if (error.message && error.message.includes("Invalid file type")) {
        console.log(`Skipping invalid file type: ${filePath}`);
        return;
      } else {
        throw error;
      }
    }
  }

  throw new Error(
    `Failed to upload file after ${maxRetries} retries: ${filePath}`
  );
}

/**
 * Process and upload files to the assistant
 */
async function uploadFiles(assistant: any) {
  // Get all file paths in the Sources directory
  const sourceDir = path.resolve("./Governmental_Customers/Sources");
  const filePaths = getAllFilePaths(sourceDir);

  console.log(`Found ${filePaths.length} files to upload`);

  // Upload each file
  for (const filePath of filePaths) {
    try {
      // Skip .DS_Store files
      if (path.basename(filePath) === ".DS_Store") {
        console.log(`Skipping .DS_Store file: ${filePath}`);
        continue;
      }

      console.log(`Uploading file: ${filePath}`);
      await uploadFileWithRetry(assistant, filePath);
      console.log(`Successfully uploaded: ${filePath}`);

      // Add a small delay between uploads to reduce rate limiting
      await sleep(500);
    } catch (error) {
      console.error(`Error uploading file ${filePath}:`, error);
    }
  }

  console.log(`Upload complete. Uploaded ${filePaths.length} files.`);
}

async function main() {
  const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
  if (!PINECONE_API_KEY) {
    throw new Error("Cannot find Pinecone API key");
  }

  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const assistantName = "gov-tech-research-assistant";
  let assistant;

  // Check if the assistant already exists
  const existingAssistants = await pc.listAssistants();
  const assistantExists = existingAssistants.assistants?.some(
    (a) => a.name === assistantName
  );

  if (assistantExists) {
    console.log(
      `Assistant '${assistantName}' already exists. Using existing assistant.`
    );
    assistant = pc.Assistant(assistantName);
  } else {
    console.log(`Creating new assistant '${assistantName}'...`);
    const govTechAssistant = await pc.createAssistant({
      name: assistantName,
      instructions:
        "You are a research assistant who excels in the intersection of healthcare and government, with a focus on Medicare, Medicaid, HUD, Social Services, public health, and social determinants of health. Use American English for spelling and grammar.",
      region: "us",
    });
    assistant = pc.Assistant(govTechAssistant.name);
    console.log(`Successfully created assistant '${assistantName}'`);
  }

  // Upload files to the assistant
  await uploadFiles(assistant);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
