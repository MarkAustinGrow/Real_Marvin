import { ImageTweetService } from '../services/content/ImageTweetService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test script to generate and post an image tweet
 */
async function testImageTweet() {
    console.log('Starting test for image tweet generation and posting...');
    
    try {
        // Get the ImageTweetService instance
        const imageTweetService = ImageTweetService.getInstance();
        
        console.log('Attempting to generate and post an image tweet...');
        
        // Generate and post the image tweet
        const result = await imageTweetService.generateAndPostImageTweet();
        
        if (result) {
            console.log('✅ Image tweet was successfully generated and posted!');
        } else {
            console.log('❌ Failed to generate and post image tweet.');
        }
    } catch (error) {
        console.error('Error during image tweet test:', error);
    }
}

// Run the test function
testImageTweet().then(() => {
    console.log('Test completed.');
    process.exit(0);
}).catch(error => {
    console.error('Fatal error in test process:', error);
    process.exit(1);
});
