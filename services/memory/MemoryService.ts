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
   * @param limit - Optional maximum number of results (default: 5)
   * @param memoryType - Optional filter by memory type
   * @param minAlignment - Optional minimum alignment score
   * @returns Array of memory results
   */
  public async searchMemories(
    query: string, 
    tags?: string[], 
    limit: number = 5,
    memoryType?: string,
    minAlignment?: number
  ) {
    try {
      // Build query parameters
      const params: Record<string, any> = {
        query: query,
        limit: limit
      };
      
      if (tags && tags.length > 0) {
        params.tags = tags.join(',');
      }
      
      if (memoryType) {
        params.memory_type = memoryType;
      }
      
      if (minAlignment) {
        params.min_alignment = minAlignment;
      }
      
      // Make GET request with query parameters
      const res = await axios.get(`${MEMORY_API_BASE}/api/memories/search`, { params });
      return res.data;
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
      // Format the memory object according to the API's expected format
      const memoryData = {
        content: memory.content,
        type: memory.type,
        source: memory.source || 'marvin',
        tags: memory.tags || []
      };
      
      // Add metadata if provided
      if (memory.metadata) {
        Object.assign(memoryData, { metadata: memory.metadata });
      }
      
      const response = await axios.post(`${MEMORY_API_BASE}/api/memories/`, memoryData);
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
      const res = await axios.get(`${MEMORY_API_BASE}/api/memories/${id}`);
      return res.data;
    } catch (error) {
      console.error(`Error getting memory with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * List all memories with optional filtering
   * @param memoryType - Optional filter by memory type
   * @param tags - Optional array of tags to filter by
   * @returns Array of memories
   */
  public async listMemories(memoryType?: string, tags?: string[]) {
    try {
      const params: Record<string, any> = {};
      
      if (memoryType) {
        params.memory_type = memoryType;
      }
      
      if (tags && tags.length > 0) {
        params.tags = tags.join(',');
      }
      
      const res = await axios.get(`${MEMORY_API_BASE}/api/memories/`, { params });
      return res.data;
    } catch (error) {
      console.error('Error listing memories:', error);
      return [];
    }
  }

  /**
   * Delete a memory by ID
   * @param id - The ID of the memory to delete
   * @returns Success status
   */
  public async deleteMemory(id: string) {
    try {
      const res = await axios.delete(`${MEMORY_API_BASE}/api/memories/${id}`);
      return res.data;
    } catch (error) {
      console.error(`Error deleting memory with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Conduct research using the Memory API
   * @param query - The research question
   * @param autoApprove - Whether to automatically approve insights (default: false)
   * @returns Research results
   */
  public async conductResearch(query: string, autoApprove: boolean = false) {
    try {
      const response = await axios.post(`${MEMORY_API_BASE}/api/research/`, {
        query,
        auto_approve: autoApprove
      });
      return response.data;
    } catch (error) {
      console.error('Error conducting research:', error);
      throw error;
    }
  }
}

export default MemoryService.getInstance();
