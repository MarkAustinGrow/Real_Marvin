import { blogPostScheduler } from './blog-post-scheduler';

/**
 * This is a simple test script to trigger the blog post scheduler
 * to check for posts with "ready_to_tweet" status and post them immediately.
 */
async function testBlogPostScheduler() {
    console.log('Starting blog post scheduler test...');
    
    try {
        // Access the private method using type assertion
        const scheduler = blogPostScheduler as any;
        
        console.log('Manually triggering blog post check...');
        await scheduler.checkAndPostBlogPosts();
        
        console.log('Blog post check completed.');
    } catch (error) {
        console.error('Error during blog post scheduler test:', error);
    }
}

// Run the test
testBlogPostScheduler().catch(error => {
    console.error('Fatal error in test process:', error);
    process.exit(1);
});
