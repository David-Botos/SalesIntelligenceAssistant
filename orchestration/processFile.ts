import distillMarkdown from "../1-markdown-distillation/distill-markdown";
import { uploadMarkdownToPinecone } from "../2-knowledge-upload/pineconeUpload";

// Get the file path from the command line arguments
const filePath = process.argv[2];

if (!filePath) {
  console.error("Error: No file path provided");
  process.exit(1);
}

(async () => {
  try {
    // Get the markdown file path
    const distilledMarkdownFilePath = await distillMarkdown(filePath);
    console.log(`Markdown file created at: ${distilledMarkdownFilePath}`);

    // Upload to Pinecone
    const didPineconeSucceed = await uploadMarkdownToPinecone(
      distilledMarkdownFilePath
    );

    if (didPineconeSucceed) {
      console.log("🎉 Success! Document processed and uploaded to Pinecone");
      process.exit(0);
    } else {
      console.error("🚨 Document processed but failed to upload to Pinecone");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error processing document:", error);
    process.exit(1);
  }
})();
