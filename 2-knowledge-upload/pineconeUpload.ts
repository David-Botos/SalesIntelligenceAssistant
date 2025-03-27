import distillMarkdown from "../1-markdown-distillation/distill-markdown";
import dotenv from "dotenv";
import { Pinecone } from "@pinecone-database/pinecone";
import path from "path";

dotenv.config();

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
): Promise<boolean> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await assistant.uploadFile({ path: filePath });
      return true;
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
        return false;
      } else {
        console.error(`Error uploading file: ${error.message}`);
        return false;
      }
    }
  }

  console.error(
    `Failed to upload file after ${maxRetries} retries: ${filePath}`
  );
  return false;
}

/**
 * Upload a markdown file to Pinecone
 */
export async function uploadMarkdownToPinecone(
  filePath: string
): Promise<boolean> {
  try {
    const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
    if (!PINECONE_API_KEY) {
      throw new Error("Cannot find Pinecone API key");
    }

    console.log(`Connecting to Pinecone with API key...`);
    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });

    // Use the assistant name from environment variables or a default name
    const assistantName =
      process.env.PINECONE_ASSISTANT_NAME || "knowledge-assistant";
    let assistant;

    // Check if the assistant already exists
    console.log(`Checking if assistant '${assistantName}' exists...`);
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
      const newAssistant = await pc.createAssistant({
        name: assistantName,
        instructions:
          process.env.PINECONE_ASSISTANT_INSTRUCTIONS ||
          "You are a knowledge assistant that helps users find relevant information from uploaded documents.",
        region: process.env.PINECONE_REGION || "us",
      });
      assistant = pc.Assistant(newAssistant.name);
      console.log(`Successfully created assistant '${assistantName}'`);
    }

    // Upload the file
    console.log(`Uploading markdown file: ${filePath}`);
    const uploadSuccess = await uploadFileWithRetry(assistant, filePath);

    if (uploadSuccess) {
      console.log(
        `Successfully uploaded file to Pinecone: ${path.basename(filePath)}`
      );
      return true;
    } else {
      console.log(
        `Failed to upload file to Pinecone: ${path.basename(filePath)}`
      );
      return false;
    }
  } catch (error) {
    console.error("Error in Pinecone upload:", error);
    return false;
  }
}
