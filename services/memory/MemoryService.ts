import axios from 'axios';

const MEMORY_API_BASE = process.env.MEMORY_API_URL;

export class MemoryService {
  private static instance: MemoryService;

  private constructor() {}

  public static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  /**
   * Search memories based on query and optional tags
   * @param query - The search query string
   * @param tags - Optional array of tags to filter by
   * @returns Array of memory results
   */
  public async searchMemories(query: string, tags?: string[]) {
    try {
      const res = await axios.post(`${MEMORY_API_BASE}/memory/search`, {
        query,
        tags,
      });
      return res.data.results;
    } catch (error) {
      console.error('Error searching memories:', error);
      return [];
    }
  }

  /**
   * Add a new memory to the system
   * @param memory - The memory object to store
   * @returns The response from the memory API
   */
  public async addMemory(memory: {
    type: string;
    content: string;
    source?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }) {
    try {
      const response = await axios.post(`${MEMORY_API_BASE}/memory/store`, memory);
      return response.data;
    } catch (error) {
      console.error('Error adding memory:', error);
      throw error;
    }
  }

  /**
   * Get a specific memory by ID
   * @param id - The ID of the memory to retrieve
   * @returns The memory object
   */
  public async getMemory(id: string) {
    try {
      const res = await axios.get(`${MEMORY_API_BASE}/memory/get/${id}`);
      return res.data;
    } catch (error) {
      console.error(`Error getting memory with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get available memory types
   * @returns Array of available memory types
   */
  public async getMemoryTypes() {
    try {
      const res = await axios.get(`${MEMORY_API_BASE}/memory/types`);
      return res.data;
    } catch (error) {
      console.error('Error getting memory types:', error);
      return [];
    }
  }

  /**
   * Get available memory tags
   * @returns Array of available memory tags
   */
  public async getMemoryTags() {
    try {
      const res = await axios.get(`${MEMORY_API_BASE}/memory/tags`);
      return res.data;
    } catch (error) {
      console.error('Error getting memory tags:', error);
      return [];
    }
  }
}

export default MemoryService.getInstance();
