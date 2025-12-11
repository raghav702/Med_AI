// Embedding Service for Medical RAG System
// Provides text embedding generation for semantic search

export interface EmbeddingOptions {
  model?: 'tfidf' | 'word2vec' | 'medical-bert';
  dimensions?: number;
  normalize?: boolean;
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
  processingTime: number;
}

/**
 * Embedding Service for generating text embeddings
 * In production, this would integrate with OpenAI, Cohere, or local embedding models
 */
export class EmbeddingService {
  private vocabulary: Map<string, number> = new Map();
  private idfScores: Map<string, number> = new Map();
  private isInitialized = false;
  private documentCount = 0;

  constructor() {
    this.initializeVocabulary();
  }

  /**
   * Initialize vocabulary and IDF scores from medical knowledge
   */
  private async initializeVocabulary(): Promise<void> {
    if (this.isInitialized) return;

    // Medical vocabulary with weights
    const medicalTerms = [
      // Symptoms
      'pain', 'ache', 'fever', 'headache', 'nausea', 'vomiting', 'diarrhea', 'constipation',
      'fatigue', 'weakness', 'dizziness', 'shortness', 'breath', 'cough', 'chest', 'abdominal',
      'joint', 'muscle', 'skin', 'rash', 'swelling', 'bleeding', 'numbness', 'tingling',
      
      // Body parts
      'head', 'neck', 'shoulder', 'arm', 'hand', 'chest', 'back', 'abdomen', 'stomach',
      'leg', 'foot', 'heart', 'lung', 'liver', 'kidney', 'brain', 'eye', 'ear', 'nose',
      'throat', 'mouth', 'tooth', 'skin', 'bone', 'muscle', 'joint',
      
      // Medical conditions
      'diabetes', 'hypertension', 'asthma', 'arthritis', 'depression', 'anxiety', 'migraine',
      'infection', 'inflammation', 'allergy', 'cancer', 'tumor', 'disease', 'syndrome',
      'disorder', 'condition', 'illness', 'injury', 'fracture', 'sprain', 'strain',
      
      // Urgency indicators
      'severe', 'acute', 'chronic', 'sudden', 'gradual', 'persistent', 'recurring',
      'emergency', 'urgent', 'immediate', 'critical', 'serious', 'mild', 'moderate',
      
      // Time indicators
      'hours', 'days', 'weeks', 'months', 'years', 'recent', 'ongoing', 'intermittent',
      'constant', 'occasional', 'frequent', 'rare', 'daily', 'weekly', 'monthly',
      
      // Intensity indicators
      'mild', 'moderate', 'severe', 'excruciating', 'unbearable', 'tolerable',
      'sharp', 'dull', 'throbbing', 'burning', 'stabbing', 'cramping', 'aching',
      
      // Medical specialties
      'cardiology', 'neurology', 'orthopedics', 'dermatology', 'gastroenterology',
      'pulmonology', 'psychiatry', 'psychology', 'gynecology', 'ophthalmology',
      'otolaryngology', 'endocrinology', 'rheumatology', 'immunology', 'oncology'
    ];

    // Build vocabulary with indices
    medicalTerms.forEach((term, index) => {
      this.vocabulary.set(term, index);
    });

    // Add common English words
    const commonWords = [
      'feel', 'feeling', 'have', 'having', 'experience', 'experiencing', 'get', 'getting',
      'start', 'started', 'begin', 'began', 'stop', 'stopped', 'continue', 'continued',
      'better', 'worse', 'same', 'different', 'new', 'old', 'young', 'adult', 'child',
      'male', 'female', 'man', 'woman', 'person', 'patient', 'doctor', 'physician',
      'treatment', 'medication', 'medicine', 'therapy', 'surgery', 'procedure'
    ];

    commonWords.forEach((word, index) => {
      this.vocabulary.set(word, medicalTerms.length + index);
    });

    this.isInitialized = true;
  }

  /**
   * Generate TF-IDF based embedding
   */
  async generateTFIDFEmbedding(text: string): Promise<number[]> {
    await this.initializeVocabulary();

    const words = this.preprocessText(text);
    const embedding = new Array(this.vocabulary.size).fill(0);

    // Calculate term frequency
    const termFreq: Map<string, number> = new Map();
    words.forEach(word => {
      termFreq.set(word, (termFreq.get(word) || 0) + 1);
    });

    // Generate embedding vector
    for (const [word, freq] of termFreq) {
      const vocabIndex = this.vocabulary.get(word);
      if (vocabIndex !== undefined) {
        // TF-IDF calculation
        const tf = freq / words.length;
        const idf = this.getIDF(word);
        embedding[vocabIndex] = tf * idf;
      }
    }

    return this.normalizeVector(embedding);
  }

  /**
   * Generate medical-specific embedding with domain knowledge
   */
  async generateMedicalEmbedding(text: string): Promise<number[]> {
    await this.initializeVocabulary();

    const words = this.preprocessText(text);
    const embedding = new Array(this.vocabulary.size).fill(0);

    // Medical term weights
    const medicalWeights: Map<string, number> = new Map([
      // High priority medical terms
      ['emergency', 3.0], ['severe', 2.5], ['acute', 2.5], ['critical', 3.0],
      ['pain', 2.0], ['chest', 2.5], ['heart', 2.5], ['breathing', 2.5],
      ['blood', 2.0], ['fever', 2.0], ['infection', 2.0], ['cancer', 2.5],
      
      // Medium priority terms
      ['chronic', 1.5], ['moderate', 1.5], ['mild', 1.2], ['fatigue', 1.5],
      ['headache', 1.5], ['nausea', 1.5], ['dizziness', 1.5], ['weakness', 1.5],
      
      // Specialty indicators
      ['cardiology', 2.0], ['neurology', 2.0], ['orthopedics', 2.0],
      ['dermatology', 2.0], ['gastroenterology', 2.0], ['psychiatry', 2.0]
    ]);

    // Calculate weighted term frequency
    const termFreq: Map<string, number> = new Map();
    words.forEach(word => {
      const weight = medicalWeights.get(word) || 1.0;
      termFreq.set(word, (termFreq.get(word) || 0) + weight);
    });

    // Generate embedding with medical weighting
    for (const [word, freq] of termFreq) {
      const vocabIndex = this.vocabulary.get(word);
      if (vocabIndex !== undefined) {
        const tf = freq / words.length;
        const idf = this.getIDF(word);
        const medicalBoost = this.getMedicalBoost(word);
        embedding[vocabIndex] = tf * idf * medicalBoost;
      }
    }

    return this.normalizeVector(embedding);
  }

  /**
   * Generate embedding using specified options
   */
  async generateEmbedding(
    text: string, 
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult> {
    const startTime = Date.now();
    const { model = 'medical-bert', normalize = true } = options;

    let embedding: number[];

    switch (model) {
      case 'tfidf':
        embedding = await this.generateTFIDFEmbedding(text);
        break;
      case 'medical-bert':
        embedding = await this.generateMedicalEmbedding(text);
        break;
      default:
        embedding = await this.generateMedicalEmbedding(text);
    }

    if (normalize) {
      embedding = this.normalizeVector(embedding);
    }

    const processingTime = Math.max(1, Date.now() - startTime); // Ensure minimum 1ms

    return {
      embedding,
      dimensions: embedding.length,
      model,
      processingTime
    };
  }

  /**
   * Preprocess text for embedding generation
   */
  private preprocessText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1)
      .filter(word => !this.isStopWord(word));
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'will', 'would', 'could', 'should',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);
    return stopWords.has(word);
  }

  /**
   * Get IDF score for a word
   */
  private getIDF(word: string): number {
    // Simple IDF calculation - in production, this would be pre-calculated from a large corpus
    const baseIDF = 2.0;
    const commonWords = new Set(['pain', 'feel', 'have', 'get', 'experience']);
    
    if (commonWords.has(word)) {
      return baseIDF * 0.5; // Reduce weight for very common words
    }
    
    return baseIDF;
  }

  /**
   * Get medical boost factor for a word
   */
  private getMedicalBoost(word: string): number {
    const emergencyTerms = new Set(['emergency', 'severe', 'acute', 'critical', 'urgent']);
    const medicalTerms = new Set(['pain', 'fever', 'infection', 'disease', 'condition']);
    const specialtyTerms = new Set(['cardiology', 'neurology', 'orthopedics', 'dermatology']);

    if (emergencyTerms.has(word)) return 2.0;
    if (medicalTerms.has(word)) return 1.5;
    if (specialtyTerms.has(word)) return 1.3;
    
    return 1.0;
  }

  /**
   * Normalize vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude === 0) return vector;
    
    return vector.map(val => val / magnitude);
  }

  /**
   * Calculate similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Batch generate embeddings for multiple texts
   */
  async generateBatchEmbeddings(
    texts: string[], 
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    
    for (const text of texts) {
      const result = await this.generateEmbedding(text, options);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Get embedding service statistics
   */
  getStats(): {
    vocabularySize: number;
    isInitialized: boolean;
    supportedModels: string[];
  } {
    return {
      vocabularySize: this.vocabulary.size,
      isInitialized: this.isInitialized,
      supportedModels: ['tfidf', 'medical-bert']
    };
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();