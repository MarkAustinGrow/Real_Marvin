# Blog Post Enhancer

This tool enhances blog posts by filling in missing metadata fields that are required for proper display in the web interface.

## Problem

The blog post generation system creates high-quality content, but some metadata fields are missing, which causes issues when viewing the blog posts in the web interface:

1. Missing category and tone information
2. Missing tags
3. Missing memory references
4. Missing character ID
5. Internal server errors when clicking "Read more"

## Solution

The Blog Post Enhancer analyzes the content of blog posts and fills in the missing metadata fields with relevant information. It uses AI to determine appropriate values for fields like category, tone, and tags based on the content of the blog post.

## Features

- Automatically enhances new blog posts when they're created
- Can be run on existing blog posts to fill in missing fields
- Uses AI to analyze content and determine appropriate metadata
- Provides fallbacks for all fields to ensure robustness

## Usage

### Enhancing All Blog Posts

To enhance all blog posts that have missing fields, run:

```bash
# Windows
enhance-blog-posts.bat

# Linux/Mac
./enhance-blog-posts.sh
```

### Enhancing a Specific Blog Post

To enhance a specific blog post, you can use the API endpoint:

```bash
curl -X POST http://localhost:3000/api/enhance-blog-posts \
  -H "Content-Type: application/json" \
  -d '{"postId": "your-blog-post-id"}'
```

### Enhancing All Blog Posts via API

To enhance all blog posts via the API endpoint:

```bash
curl -X POST http://localhost:3000/api/enhance-blog-posts
```

## Implementation Details

The Blog Post Enhancer consists of the following components:

1. **BlogPostEnhancer class** (`src/blog-post-enhancer.ts`): The main class that handles the enhancement process.
2. **CLI script** (`src/enhance-blog-posts.ts`): A script to run the enhancer from the command line.
3. **Web server integration** (`src/web-server.ts`): Integration with the web server to automatically enhance new blog posts and provide API endpoints.
4. **Batch files** (`enhance-blog-posts.bat` and `enhance-blog-posts.sh`): Convenience scripts for running the enhancer.

## Fields Enhanced

The enhancer fills in the following fields if they're missing:

- **category**: Determined by analyzing the blog post content (technology, culture, philosophy, science, art)
- **tone**: Determined by analyzing the blog post content (philosophical, analytical, reflective, conversational, technical)
- **tags**: Generated based on the blog post content, with standard tags added
- **memory_refs**: References to relevant memories or generated UUIDs if no memories are found
- **character_id**: Set to Marvin's character ID
- **image_url**: Extracted from the blog post content if available, or generated based on timestamp

## Automatic Enhancement

New blog posts are automatically enhanced when they're created through the `/api/generate-blog-post` endpoint. The enhancer is called after the blog post is saved to the database.
