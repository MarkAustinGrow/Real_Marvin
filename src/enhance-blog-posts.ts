import { BlogPostEnhancer } from './blog-post-enhancer';

/**
 * Script to enhance blog posts with missing metadata
 */
async function enhanceBlogPosts() {
  console.log('Starting blog post enhancement process...');
  
  const enhancer = new BlogPostEnhancer();
  
  // Process all posts that need enhancement
  await enhancer.processAllPosts();
  
  console.log('Blog post enhancement process completed');
}

// Run the enhancement process
enhanceBlogPosts().catch(error => {
  console.error('Error in blog post enhancement process:', error);
  process.exit(1);
});
