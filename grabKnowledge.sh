#!/bin/bash

# grabknowledge.sh - Script to extract text from a webpage using Jina Reader API
# Usage: ./grabknowledge.sh URL

# Check if URL is provided
if [ -z "$1" ]; then
    echo "Error: URL is required!"
    echo "Usage: ./grabknowledge.sh URL"
    exit 1
fi

# Set variables
URL="$1"

# Use PWD-based output directory
OUTPUT_DIR="$(pwd)/knowledge"

# Load environment variables from .env file if it exists
if [ -f "$(pwd)/.env" ]; then
    echo "Loading environment variables from .env file"
    export $(grep -v '^#' "$(pwd)/.env" | xargs)
else
    echo "Error: .env file not found in $(pwd)!"
    exit 1
fi

# Check if JINA_TOKEN is set
if [ -z "$JINA_TOKEN" ]; then
    echo "Error: JINA_TOKEN not found in .env file!"
    exit 1
fi

# Check if output directory exists, create if it doesn't
if [ ! -d "$OUTPUT_DIR" ]; then
    echo "Creating output directory: $OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR"
    
    # Check if directory creation was successful
    if [ $? -ne 0 ]; then
        echo "Error: Failed to create output directory!"
        exit 1
    fi
fi

# Extract domain name for filename
DOMAIN=$(echo "$URL" | sed -E 's|^https?://([^/]+).*|\1|')
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="$OUTPUT_DIR/${DOMAIN}_${TIMESTAMP}.txt"

echo "Extracting content from: $URL"
echo "Saving to: $OUTPUT_FILE"

# Call Jina Reader API using curl
curl -s "https://r.jina.ai/$URL" \
    -H "Authorization: Bearer $JINA_TOKEN" \
    > "$OUTPUT_FILE"

# Check if the operation was successful
if [ $? -eq 0 ] && [ -s "$OUTPUT_FILE" ]; then
    echo "Success! Content extracted and saved to $OUTPUT_FILE"
    echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
    
    # extract structured markdown and generate a document
    if [ $? -eq 0 ] && [ -s "$OUTPUT_FILE" ]; then
        echo "Success! Content extracted and saved to $OUTPUT_FILE"
        echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
        
        # Call the processFile.ts script with the text file path
        echo "Processing document and uploading to Pinecone Assistant..."
        npx ts-node ./processFile.ts "$OUTPUT_FILE"
        
        # Get the exit code from the TypeScript execution
        TS_EXIT_CODE=$?
        
        if [ $TS_EXIT_CODE -eq 0 ]; then
            echo "Document processing completed successfully"
            exit 0
        else
            echo "Error: Failed to process document"
            exit $TS_EXIT_CODE
    fi
else
    # Error handling remains the same
fi

else
    echo "Error: Failed to extract content or file is empty."
    # Remove empty file if it exists
    [ -f "$OUTPUT_FILE" ] && rm "$OUTPUT_FILE"
    exit 1
fi