// Vector Database Service for Medical RAG System
// Provides vector storage, indexing, and similarity search capabilities

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface SearchResult {
  document: VectorDocument;
  similarity: number;
  score: number;
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  filter?: (doc: VectorDocument) => boolean;
  boost?: (doc: VectorDocument) => number;
}

/**
 * In-memory vector database with similarity search capabilities
 * In production, this would be replaced with a proper vector database like Pinecone, Weaviate, or Chroma
 */
export class VectorDatabase {
  private documents: Map<string, VectorDocument> = new Map();
  private index: Map<string, Set<string>> = new Map(); // Simple inverted index for keyword search
  private isInitialized = false;

  constructor() {
    this.initializeIndex();
  }

  /**
   * Initialize the vector database index
   */
  private initializeIndex(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  /**
   * Add a document to the vector database
   */
  async addDocument(document: VectorDocument): Promise<void> {
    this.documents.set(document.id, document);
    this.updateIndex(document);
  }

  /**
   * Add multiple documents to the vector database
   */
  async addDocuments(documents: VectorDocument[]): Promise<void> {
    for (const doc of documents) {
      await this.addDocument(doc);
    }
  }

  /**
   * Update the inverted index for keyword search
   */
  private updateIndex(document: VectorDocument): void {
    const words = this.extractKeywords(document.content);
    
    words.forEach(word => {
      if (!this.index.has(word)) {
        this.index.set(word, new Set());
      }
      this.index.get(word)!.add(document.id);
    });
  }

  /**
   * Extract keywords from text for indexing
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }

  /**
   * Check if a word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ]);
    return stopWords.has(word);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  private euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity;

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Perform vector similarity search
   */
  async vectorSearch(
    queryEmbedding: number[], 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      limit = 10,
      threshold = 0.1,
      filter,
      boost
    } = options;

    const results: SearchResult[] = [];

    for (const [id, document] of this.documents) {
      // Apply filter if provided
      if (filter && !filter(document)) {
        continue;
      }

      // Calculate similarity
      const similarity = this.cosineSimilarity(queryEmbedding, document.embedding);
      
      if (similarity >= threshold) {
        let score = similarity;
        
        // Apply boost if provided
        if (boost) {
          score *= boost(document);
        }

        results.push({
          document,
          similarity,
          score
        });
      }
    }

    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Perform hybrid search (vector + keyword)
   */
  async hybridSearch(
    queryEmbedding: number[],
    queryText: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const vectorResults = await this.vectorSearch(queryEmbedding, options);
    const keywordResults = await this.keywordSearch(queryText, options);

    // Combine and re-rank results
    const combinedResults = new Map<string, SearchResult>();

    // Add vector results with full weight
    vectorResults.forEach(result => {
      combinedResults.set(result.document.id, result);
    });

    // Add keyword results with partial weight and combine scores
    keywordResults.forEach(keywordResult => {
      const existing = combinedResults.get(keywordResult.document.id);
      if (existing) {
        // Combine scores: 70% vector, 30% keyword
        existing.score = existing.score * 0.7 + keywordResult.score * 0.3;
      } else {
        // Add keyword-only result with reduced weight
        keywordResult.score *= 0.5;
        combinedResults.set(keywordResult.document.id, keywordResult);
      }
    });

    return Array.from(combinedResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);
  }

  /**
   * Perform keyword-based search
   */
  async keywordSearch(
    queryText: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      limit = 10,
      threshold = 0.1,
      filter,
      boost
    } = options;

    const queryKeywords = this.extractKeywords(queryText);
    const documentScores = new Map<string, number>();

    // Calculate TF-IDF-like scores
    queryKeywords.forEach(keyword => {
      const documentIds = this.index.get(keyword);
      if (documentIds) {
        const idf = Math.log(this.documents.size / documentIds.size);
        
        documentIds.forEach(docId => {
          const currentScore = documentScores.get(docId) || 0;
          documentScores.set(docId, currentScore + idf);
        });
      }
    });

    const results: SearchResult[] = [];

    for (const [docId, score] of documentScores) {
      const document = this.documents.get(docId);
      if (!document) continue;

      // Apply filter if provided
      if (filter && !filter(document)) {
        continue;
      }

      // Normalize score
      const normalizedScore = Math.min(score / queryKeywords.length, 1);
      
      if (normalizedScore >= threshold) {
        let finalScore = normalizedScore;
        
        // Apply boost if provided
        if (boost) {
          finalScore *= boost(document);
        }

        results.push({
          document,
          similarity: normalizedScore,
          score: finalScore
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<VectorDocument | null> {
    return this.documents.get(id) || null;
  }

  /**
   * Delete document by ID
   */
  async deleteDocument(id: string): Promise<boolean> {
    const document = this.documents.get(id);
    if (!document) return false;

    this.documents.delete(id);
    this.removeFromIndex(document);
    return true;
  }

  /**
   * Remove document from inverted index
   */
  private removeFromIndex(document: VectorDocument): void {
    const words = this.extractKeywords(document.content);
    
    words.forEach(word => {
      const docIds = this.index.get(word);
      if (docIds) {
        docIds.delete(document.id);
        if (docIds.size === 0) {
          this.index.delete(word);
        }
      }
    });
  }

  /**
   * Update an existing document
   */
  async updateDocument(document: VectorDocument): Promise<void> {
    const existing = this.documents.get(document.id);
    if (existing) {
      this.removeFromIndex(existing);
    }
    
    await this.addDocument(document);
  }

  /**
   * Get all documents matching a filter
   */
  async getDocuments(filter?: (doc: VectorDocument) => boolean): Promise<VectorDocument[]> {
    const docs = Array.from(this.documents.values());
    return filter ? docs.filter(filter) : docs;
  }

  /**
   * Get database statistics
   */
  getStats(): {
    totalDocuments: number;
    totalKeywords: number;
    averageEmbeddingDimension: number;
    memoryUsage: string;
  } {
    const docs = Array.from(this.documents.values());
    const avgDimension = docs.length > 0 
      ? docs.reduce((sum, doc) => sum + doc.embedding.length, 0) / docs.length 
      : 0;

    return {
      totalDocuments: this.documents.size,
      totalKeywords: this.index.size,
      averageEmbeddingDimension: Math.round(avgDimension),
      memoryUsage: `${Math.round(JSON.stringify(Array.from(this.documents.values())).length / 1024)} KB`
    };
  }

  /**
   * Clear all documents from the database
   */
  async clear(): Promise<void> {
    this.documents.clear();
    this.index.clear();
  }

  /**
   * Export database to JSON
   */
  async export(): Promise<string> {
    return JSON.stringify({
      documents: Array.from(this.documents.entries()),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Import database from JSON
   */
  async import(data: string): Promise<void> {
    const parsed = JSON.parse(data);
    
    await this.clear();
    
    for (const [id, document] of parsed.documents) {
      await this.addDocument(document);
    }
  }
}

// Export singleton instance
export const vectorDatabase = new VectorDatabase();