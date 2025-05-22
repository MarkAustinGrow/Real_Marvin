import { SupabaseService } from '../services/supabase/SupabaseService';
import { OpenAIService } from '../services/openai/OpenAIService';
import { AnthropicService } from '../services/anthropic/AnthropicService';
import { GrokService } from '../services/grok/GrokService';
import MemoryService from '../services/memory/MemoryService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test script to validate the persona upgrade changes
 * This script tests tweet generation across all LLMs using the standardized method
 */
async function testPersonaUpgrade() {
    console.log('Starting test for persona upgrade...');
    
    try {
        // Initialize services
        const supabaseService = SupabaseService.getInstance();
        const openAIService = OpenAIService.getInstance();
        const anthropicService = AnthropicService.getInstance();
        const grokService = GrokService.getInstance();
        
        console.log('Services initialized successfully');
        
        // Get character data
        console.log('Fetching character data...');
        const characterData = await supabaseService.getCharacterData('marvin-street');
        
        if (!characterData) {
            console.error('Failed to fetch character data');
            return;
        }
        
        console.log('Character data fetched successfully');
        
        // Get some test memories
        console.log('Fetching test memories...');
        const memories = await MemoryService.searchMemories('street art');
        const memoryContents = memories.map((memory: any) => memory.content).slice(0, 2);
        
        console.log(`Found ${memoryContents.length} memories`);
        
        // Test 1: Generate tweet with OpenAI
        console.log('\n--- Test 1: Generate tweet with OpenAI ---');
        const testCategory = 'Toolbox';
        
        console.log(`Generating tweet with OpenAI for category: ${testCategory}`);
        const openAITweet = await openAIService.generateTweetContent(characterData, testCategory, memoryContents);
        
        console.log('Generated tweet with OpenAI:');
        console.log(openAITweet);
        
        // Test 2: Generate tweet with Claude
        console.log('\n--- Test 2: Generate tweet with Claude ---');
        const testPrompt = 'What do you think about digital street art?';
        
        console.log(`Generating tweet with Claude for prompt: ${testPrompt}`);
        const claudeTweet = await anthropicService.generateTweet(testPrompt, true, characterData, memoryContents);
        
        console.log('Generated tweet with Claude:');
        console.log(claudeTweet);
        
        // Test 3: Generate tweet with Grok
        console.log('\n--- Test 3: Generate tweet with Grok ---');
        const testContext = 'Someone just shared your street art post. Write a thank you tweet with your unique style.';
        
        console.log(`Generating tweet with Grok for context: ${testContext}`);
        const grokTweet = await grokService.generateHumorousReply(testContext, memoryContents);
        
        console.log('Generated tweet with Grok:');
        console.log(grokTweet);
        
        console.log('\nPersona upgrade test completed successfully');
    } catch (error) {
        console.error('Error in persona upgrade test:', error);
    }
}

// Run the test
testPersonaUpgrade().catch(console.error);
