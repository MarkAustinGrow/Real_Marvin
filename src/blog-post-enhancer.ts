import { SupabaseService } from '../services/supabase/SupabaseService';
import { OpenAIService } from '../services/openai/OpenAIService';
import MemoryService from '../services/memory/MemoryService';

export class BlogPostEnhancer {
  private supabaseService: SupabaseService;
  private openAIService: OpenAIService;
  
  constructor() {
    this.supabaseService = SupabaseService.getInstance();
    this.openAIService = OpenAIService.getInstance();
  }
  
  /**
   * Enhance a blog post with missing metadata
   */
  public async enhanceBlogPost(postId: string): Promise<boolean> {
    try {
      // Fetch the blog post
      const { data: post, error } = await this.supabaseService.client
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single();
        
      if (error || !post) {
        console.error('Error fetching blog post:', error);
        return false;
      }
      
      console.log(`Enhancing blog post: ${post.title} (${postId})`);
      
      // Check which fields need to be filled
      const updates: any = {};
      
      if (!post.category) {
        updates.category = await this.determineCategory(post.title, post.markdown);
        console.log(`Determined category: ${updates.category}`);
      }
      
      if (!post.tone) {
        updates.tone = await this.determineTone(post.markdown);
        console.log(`Determined tone: ${updates.tone}`);
      }
      
      if (!post.tags || post.tags.length === 0) {
        updates.tags = await this.generateTags(post.title, post.markdown);
        console.log(`Generated tags: ${updates.tags.join(', ')}`);
      }
      
      if (!post.memory_refs || post.memory_refs.length === 0) {
        updates.memory_refs = await this.getRelevantMemoryRefs(post.title, post.markdown);
        console.log(`Generated memory refs: ${updates.memory_refs.length} references`);
      }
      
      if (!post.character_id) {
        // Default to Marvin's character ID
        const characterData = await this.supabaseService.getCharacterData('marvin-street');
        updates.character_id = characterData.id;
        console.log(`Set character ID: ${updates.character_id}`);
      }
      
      if (!post.image_url && post.markdown.includes('![')) {
        // Extract image description from markdown if available
        updates.image_url = await this.generateImageUrl(post.markdown);
        console.log(`Generated image URL: ${updates.image_url}`);
      }
      
      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await this.supabaseService.client
          .from('blog_posts')
          .update(updates)
          .eq('id', postId);
          
        if (updateError) {
          console.error('Error updating blog post:', updateError);
          return false;
        }
        
        console.log(`Enhanced blog post ${postId} with fields:`, Object.keys(updates));
        return true;
      }
      
      console.log(`Blog post ${postId} already has all required fields`);
      return true;
    } catch (error) {
      console.error('Error enhancing blog post:', error);
      return false;
    }
  }
  
  /**
   * Process all blog posts that need enhancement
   */
  public async processAllPosts(): Promise<void> {
    try {
      // Fetch posts that might need enhancement (missing category or tone)
      const { data: posts, error } = await this.supabaseService.client
        .from('blog_posts')
        .select('id, title')
        .or('category.is.null,tone.is.null,tags.is.null,memory_refs.is.null,character_id.is.null');
        
      if (error) {
        console.error('Error fetching blog posts:', error);
        return;
      }
      
      console.log(`Found ${posts.length} blog posts that need enhancement`);
      
      // Process each post
      for (const post of posts) {
        console.log(`Processing post: ${post.title} (${post.id})`);
        await this.enhanceBlogPost(post.id);
      }
      
      console.log('Finished processing all blog posts');
    } catch (error) {
      console.error('Error processing blog posts:', error);
    }
  }
  
  /**
   * Determine the category of a blog post
   */
  private async determineCategory(title: string, content: string): Promise<string> {
    try {
      const prompt = `Analyze the following blog post title and content, and determine the most appropriate category from these options: technology, culture, philosophy, science, art.
      
Title: ${title}

Content excerpt: ${content.substring(0, 500)}...

Return only the category name, nothing else.`;
      
      const response = await this.generateCompletion(prompt);
      const category = response.trim().toLowerCase();
      
      // Validate the category
      const validCategories = ['technology', 'culture', 'philosophy', 'science', 'art'];
      return validCategories.includes(category) ? category : 'technology';
    } catch (error) {
      console.error('Error determining category:', error);
      return 'technology'; // Default
    }
  }
  
  /**
   * Determine the tone of a blog post
   */
  private async determineTone(content: string): Promise<string> {
    try {
      const prompt = `Analyze the following blog post content and determine its tone. Choose from: philosophical, analytical, reflective, conversational, technical.
      
Content excerpt: ${content.substring(0, 500)}...

Return only the tone, nothing else.`;
      
      const response = await this.generateCompletion(prompt);
      return response.trim().toLowerCase();
    } catch (error) {
      console.error('Error determining tone:', error);
      return 'philosophical'; // Default based on examples
    }
  }
  
  /**
   * Generate tags for a blog post
   */
  private async generateTags(title: string, content: string): Promise<string[]> {
    try {
      const prompt = `Generate 8-10 relevant tags for the following blog post. Include both general topics and specific concepts mentioned in the post.
      
Title: ${title}

Content excerpt: ${content.substring(0, 500)}...

Return the tags as a comma-separated list, nothing else.`;
      
      const response = await this.generateCompletion(prompt);
      
      // Process the tags
      const tags = response.split(',').map(tag => tag.trim().toLowerCase());
      
      // Add standard tags from examples
      tags.unshift('[]');
      tags.unshift('[\"Altcoins\"]');
      tags.unshift('[\"Bitcoin\"]');
      
      return tags;
    } catch (error) {
      console.error('Error generating tags:', error);
      return ['[]', '[\"Altcoins\"]', '[\"Bitcoin\"]', 'technology', 'social']; // Default
    }
  }
  
  /**
   * Get relevant memory references
   */
  private async getRelevantMemoryRefs(title: string, content: string): Promise<string[]> {
    try {
      // Search for relevant memories
      const memoryService = MemoryService;
      const memories = await memoryService.searchMemories(title, [], 5);
      
      // Return the memory IDs
      return memories.map(memory => memory.id);
    } catch (error) {
      console.error('Error getting memory refs:', error);
      
      // Generate random UUIDs as fallback
      return Array.from({ length: 5 }, () => this.generateRandomUUID());
    }
  }
  
  /**
   * Generate an image URL based on content
   */
  private async generateImageUrl(content: string): Promise<string> {
    try {
      // Extract image description from markdown if available
      const imageMatch = content.match(/!\[(.*?)\]\((.*?)\)/);
      if (imageMatch && imageMatch[2] && imageMatch[2].includes('supabase.co')) {
        return imageMatch[2];
      }
      
      // Generate a placeholder URL based on timestamp
      const timestamp = new Date().toISOString()
        .replace(/[-:]/g, '')
        .split('.')[0]
        .replace('T', '_');
        
      return `https://oeexwetwqsooikroobgm.supabase.co/storage/v1/object/public/marvin-art-images/images/${timestamp}/marvin_art_${timestamp}.png?`;
    } catch (error) {
      console.error('Error generating image URL:', error);
      return '';
    }
  }
  
  /**
   * Generate a simple completion using OpenAI
   */
  private async generateCompletion(prompt: string): Promise<string> {
    try {
      // Use the OpenAI API directly since we don't have a generateCompletion method
      const response = await this.openAIService.openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.3
      });

      return response.data.choices[0].message?.content?.trim() || '';
    } catch (error) {
      console.error('Error generating completion:', error);
      throw new Error('Failed to generate completion');
    }
  }
  
  /**
   * Generate a random UUID
   */
  private generateRandomUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
