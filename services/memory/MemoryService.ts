import axios from 'axios';

// Configuration
const MEMORY_API_BASE = process.env.MEMORY_API_URL;
const DEFAULT_TIMEOUT = 30000; // 30 seconds in milliseconds
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

// Type definitions
export interface Memory {
  id: string;
  content: string;
  type: string;
  source: string;
  timestamp: string;
  tags: string[];
  alignment_score: number;
  similarity_score?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface MemoriesResponse {
  memories: Memory[];
  pagination: PaginationInfo;
  error?: string;
}

export interface SearchResponse {
  memories: Memory[];
  error?: string;
}

export interface CreateMemoryResponse {
  id: string;
  error?: string;
}

export interface DeleteMemoryResponse {
  status: string;
  error?: string;
}

export interface ResearchResponse {
  query_id: string;
  status: string;
  insights?: any[];
  error?: string;
}

export interface PendingResearchResponse {
  pending_research: any[];
  error?: string;
}

export interface ApproveInsightsResponse {
  status: string;
  memory_ids?: string[];
  error?: string;
}

export interface ProcessTweetsResponse {
  processed: number;
  stored: number;
  error?: string;
}

export interface ListMemoriesOptions {
  page?: number;
  limit?: number;
  memoryType?: string;
  minAlignment?: number;
  tags?: string[] | string;
}

export interface SearchMemoriesOptions {
  limit?: number;
  memoryType?: string;
  minAlignment?: number;
  tags?: string[] | string;
}

export interface CreateMemoryOptions {
  content: string;
  type: string;
  source?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface RequestOptions {
  params?: Record<string, any>;
  data?: any;
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
}

export class MemoryService {
  private static instance: MemoryService;
  private baseUrl: string;
  private timeout: number;
  private retryCount: number;
  private retryDelay: number;

  private constructor() {
    this.baseUrl = MEMORY_API_BASE || 'https://memory.marvn.club';
    this.timeout = DEFAULT_TIMEOUT;
    this.retryCount = DEFAULT_RETRY_COUNT;
    this.retryDelay = DEFAULT_RETRY_DELAY;
  }

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
  ): Promise<Memory[]> {
    try {
      // Build query parameters
      const params: Record<string, any> = {
        query,
        limit
      };
      
      if (tags && tags.length > 0) {
        params.tags = Array.isArray(tags) ? tags.join(',') : tags;
      }
      
      if (memoryType) {
        params.memory_type = memoryType;
      }
      
      if (minAlignment) {
        params.min_alignment = minAlignment;
      }
      
      const response = await this._makeRequest<SearchResponse>('GET', '/api/memories/search', { params });
      
      if (response.error) {
        console.error('Error searching memories:', response.error);
        return [];
      }
      
      return response.memories || [];
    } catch (error: any) {
      console.error('Error searching memories:', error);
      return [];
    }
  }

  /**
   * Add a new memory to the system
   * @param memory - The memory object to store
   * @returns The response from the memory API
   */
  public async addMemory(memory: CreateMemoryOptions): Promise<any> {
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
      
      const response = await this._makeRequest<CreateMemoryResponse>('POST', '/api/memories/', { data: memoryData });
      
      if (response.error) {
        console.error('Error adding memory:', response.error);
        throw new Error(response.error);
      }
      
      return response;
    } catch (error: any) {
      console.error('Error adding memory:', error);
      throw error;
    }
  }

  /**
   * Get a specific memory by ID
   * @param id - The ID of the memory to retrieve
   * @returns The memory object
   */
  public async getMemory(id: string): Promise<Memory> {
    try {
      const response = await this._makeRequest<Memory>('GET', `/api/memories/${id}`);
      
      if ('error' in response) {
        console.error(`Error getting memory with ID ${id}:`, response.error);
        throw new Error(response.error as string);
      }
      
      return response;
    } catch (error: any) {
      console.error(`Error getting memory with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * List all memories with optional filtering
   * @param options - Options for listing memories
   * @returns Array of memories and pagination info
   */
  public async listMemories(options: ListMemoriesOptions = {}): Promise<MemoriesResponse> {
    try {
      const {
        page = 1,
        limit = 50,
        memoryType = null,
        minAlignment = null,
        tags = null
      } = options;

      const params: Record<string, any> = {
        page,
        limit
      };
      
      if (memoryType) {
        params.memory_type = memoryType;
      }
      
      if (minAlignment !== null) {
        params.min_alignment = minAlignment;
      }
      
      if (tags) {
        params.tags = Array.isArray(tags) ? tags.join(',') : tags;
      }
      
      const response = await this._makeRequest<MemoriesResponse>('GET', '/api/memories/', { params });
      
      if (response.error) {
        console.error('Error listing memories:', response.error);
        return { memories: [], pagination: { page: 1, limit: 0, total: 0, pages: 0 } };
      }
      
      return response;
    } catch (error: any) {
      console.error('Error listing memories:', error);
      return { memories: [], pagination: { page: 1, limit: 0, total: 0, pages: 0 } };
    }
  }

  /**
   * Delete a memory by ID
   * @param id - The ID of the memory to delete
   * @returns Success status
   */
  public async deleteMemory(id: string): Promise<DeleteMemoryResponse> {
    try {
      const response = await this._makeRequest<DeleteMemoryResponse>('DELETE', `/api/memories/${id}`);
      
      if (response.error) {
        console.error(`Error deleting memory with ID ${id}:`, response.error);
        throw new Error(response.error);
      }
      
      return response;
    } catch (error: any) {
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
  public async conductResearch(query: string, autoApprove: boolean = false): Promise<ResearchResponse> {
    try {
      const data = {
        query,
        auto_approve: autoApprove
      };
      
      const response = await this._makeRequest<ResearchResponse>('POST', '/api/research/', { data });
      
      if (response.error) {
        console.error('Error conducting research:', response.error);
        throw new Error(response.error);
      }
      
      return response;
    } catch (error: any) {
      console.error('Error conducting research:', error);
      throw error;
    }
  }

  /**
   * Make an HTTP request to the API with retry logic
   * @param method - HTTP method
   * @param endpoint - API endpoint
   * @param options - Request options
   * @returns Promise resolving to response data
   * @private
   */
  private async _makeRequest<T>(
    method: string,
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      params = {},
      data = null,
      retryCount = this.retryCount,
      retryDelay = this.retryDelay,
      timeout = this.timeout
    } = options;

    let currentRetry = 0;
    let currentDelay = retryDelay;

    while (true) {
      try {
        const config = {
          method,
          url: `${this.baseUrl}${endpoint}`,
          params,
          data,
          timeout,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        };

        const response = await axios(config);
        return response.data as T;
      } catch (error: any) {
        // Handle 502 Bad Gateway with retry
        if (error.response && error.response.status === 502 && currentRetry < retryCount) {
          console.log(`Received 502 Bad Gateway. Retrying in ${currentDelay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          currentRetry++;
          currentDelay *= 2; // Exponential backoff
          continue;
        }

        // Handle timeout with retry
        if (error.code === 'ECONNABORTED' && currentRetry < retryCount) {
          console.log(`Request timed out. Retrying in ${currentDelay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          currentRetry++;
          currentDelay *= 2; // Exponential backoff
          continue;
        }

        // Handle other errors or max retries reached
        if (currentRetry >= retryCount) {
          console.log('Max retries reached');
        }

        // Try to get error details from response
        if (error.response && error.response.data) {
          return { error: JSON.stringify(error.response.data) } as unknown as T;
        }

        return { error: error.message || 'Unknown error' } as unknown as T;
      }
    }
  }
}

export default MemoryService.getInstance();
