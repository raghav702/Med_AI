// Medical Knowledge RAG Agent
// Implements Retrieval-Augmented Generation for medical information

import { 
  MEDICAL_CONDITIONS, 
  SYMPTOM_MAPPINGS, 
  EMERGENCY_SYMPTOMS, 
  MEDICAL_SPECIALTIES,
  MedicalCondition,
  SymptomMapping,
  EmergencySymptom
} from '../../data/medicalKnowledge';
import { vectorDatabase, VectorDocument } from '../vectorDatabase';
import { embeddingService } from '../embeddingService';

export interface MedicalVector {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    type: 'symptom' | 'condition' | 'specialty' | 'emergency';
    urgencyLevel?: 'low' | 'medium' | 'high' | 'emergency';
    specialties?: string[];
    keywords?: string[];
  };
}

export interface SemanticSearchResult {
  content: string;
  similarity: number;
  metadata: MedicalVector['metadata'];
  source: 'symptom' | 'condition' | 'emergency' | 'specialty';
}

export interface MedicalRAGResponse {
  answer: string;
  confidence: number;
  sources: SemanticSearchResult[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  recommendedSpecialties: string[];
  followUpQuestions: string[];
  emergencyAlert?: {
    isEmergency: boolean;
    immediateAction: string;
    description: string;
  };
}

/**
 * Medical Knowledge RAG Agent
 * Provides semantic search and context-aware medical information retrieval
 */
export class MedicalKnowledgeAgent {
  private isInitialized = false;

  constructor() {
    this.initializeVectorDatabase();
  }

  /**
   * Initialize the vector database with medical knowledge
   */
  private async initializeVectorDatabase(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const documents: VectorDocument[] = [];

      // Create vectors for symptoms
      for (const symptom of SYMPTOM_MAPPINGS) {
        const content = `${symptom.symptom}: ${symptom.keywords.join(', ')}. Follow-up: ${symptom.followUpQuestions.join(' ')}`;
        const embeddingResult = await embeddingService.generateEmbedding(
          symptom.symptom + ' ' + symptom.keywords.join(' ')
        );

        const document: VectorDocument = {
          id: `symptom_${symptom.symptom.toLowerCase().replace(/\s+/g, '_')}`,
          content,
          embedding: embeddingResult.embedding,
          metadata: {
            type: 'symptom',
            urgencyLevel: symptom.urgencyLevel,
            specialties: symptom.specialties,
            keywords: symptom.keywords
          },
          timestamp: new Date()
        };
        documents.push(document);
      }

      // Create vectors for medical conditions
      for (const condition of MEDICAL_CONDITIONS) {
        const content = `${condition.name}: ${condition.description}. Symptoms: ${condition.symptoms.join(', ')}`;
        const embeddingResult = await embeddingService.generateEmbedding(
          condition.name + ' ' + condition.description + ' ' + condition.symptoms.join(' ')
        );

        const document: VectorDocument = {
          id: `condition_${condition.name.toLowerCase().replace(/\s+/g, '_')}`,
          content,
          embedding: embeddingResult.embedding,
          metadata: {
            type: 'condition',
            urgencyLevel: condition.urgencyLevel,
            specialties: condition.specialties
          },
          timestamp: new Date()
        };
        documents.push(document);
      }

      // Create vectors for emergency symptoms
      for (const emergency of EMERGENCY_SYMPTOMS) {
        const content = `EMERGENCY: ${emergency.symptom}: ${emergency.description}. Action: ${emergency.immediateAction}`;
        const embeddingResult = await embeddingService.generateEmbedding(
          emergency.symptom + ' ' + emergency.keywords.join(' ') + ' emergency'
        );

        const document: VectorDocument = {
          id: `emergency_${emergency.symptom.toLowerCase().replace(/\s+/g, '_')}`,
          content,
          embedding: embeddingResult.embedding,
          metadata: {
            type: 'emergency',
            urgencyLevel: 'emergency',
            keywords: emergency.keywords
          },
          timestamp: new Date()
        };
        documents.push(document);
      }

      // Create vectors for specialties
      for (const [name, specialty] of Object.entries(MEDICAL_SPECIALTIES)) {
        const content = `${specialty.name}: ${specialty.description}. Common conditions: ${specialty.commonConditions.join(', ')}`;
        const embeddingResult = await embeddingService.generateEmbedding(
          specialty.name + ' ' + specialty.description + ' ' + specialty.commonConditions.join(' ')
        );

        const document: VectorDocument = {
          id: `specialty_${name.toLowerCase().replace(/\s+/g, '_')}`,
          content,
          embedding: embeddingResult.embedding,
          metadata: {
            type: 'specialty',
            specialties: [name]
          },
          timestamp: new Date()
        };
        documents.push(document);
      }

      // Add all documents to vector database
      await vectorDatabase.addDocuments(documents);

      this.isInitialized = true;
      console.log(`Medical RAG initialized with ${documents.length} vectors`);
    } catch (error) {
      console.error('Failed to initialize medical vector database:', error);
      throw error;
    }
  }



  /**
   * Perform semantic search for symptoms and medical information
   */
  async semanticSearch(query: string, limit: number = 5): Promise<SemanticSearchResult[]> {
    await this.initializeVectorDatabase();

    const embeddingResult = await embeddingService.generateEmbedding(query);
    const searchResults = await vectorDatabase.hybridSearch(
      embeddingResult.embedding,
      query,
      {
        limit,
        threshold: 0.1,
        boost: (doc) => {
          // Boost emergency documents
          if (doc.metadata.type === 'emergency') return 2.0;
          // Boost high urgency documents
          if (doc.metadata.urgencyLevel === 'high') return 1.5;
          return 1.0;
        }
      }
    );

    return searchResults.map(result => ({
      content: result.document.content,
      similarity: result.similarity,
      metadata: result.document.metadata,
      source: result.document.metadata.type as 'symptom' | 'condition' | 'emergency' | 'specialty'
    }));
  }

  /**
   * Context-aware information retrieval
   */
  async retrieveContextualInformation(
    query: string, 
    context: {
      previousSymptoms?: string[];
      userAge?: number;
      userGender?: string;
      medicalHistory?: string[];
    } = {}
  ): Promise<MedicalRAGResponse> {
    await this.initializeVectorDatabase();

    // Enhance query with context
    let enhancedQuery = query;
    if (context.previousSymptoms?.length) {
      enhancedQuery += ' ' + context.previousSymptoms.join(' ');
    }
    if (context.medicalHistory?.length) {
      enhancedQuery += ' ' + context.medicalHistory.join(' ');
    }

    // Perform semantic search
    const searchResults = await this.semanticSearch(enhancedQuery, 10);

    // Check for emergency conditions first
    const emergencyResults = searchResults.filter(r => r.metadata.type === 'emergency');
    const isEmergency = emergencyResults.length > 0 && emergencyResults[0].similarity > 0.3;

    // Determine urgency level
    let urgencyLevel: 'low' | 'medium' | 'high' | 'emergency' = 'low';
    if (isEmergency) {
      urgencyLevel = 'emergency';
    } else {
      const urgencyLevels = searchResults
        .filter(r => r.metadata.urgencyLevel)
        .map(r => r.metadata.urgencyLevel!);
      
      if (urgencyLevels.includes('high')) urgencyLevel = 'high';
      else if (urgencyLevels.includes('medium')) urgencyLevel = 'medium';
    }

    // Extract recommended specialties
    const specialties = new Set<string>();
    searchResults.forEach(result => {
      if (result.metadata.specialties) {
        result.metadata.specialties.forEach(specialty => specialties.add(specialty));
      }
    });

    // Generate follow-up questions based on context
    const followUpQuestions = this.generateContextualFollowUpQuestions(query, searchResults, context);

    // Generate comprehensive answer
    const answer = this.generateMedicalAnswer(query, searchResults, context);

    // Calculate confidence based on search results
    const confidence = searchResults.length > 0 ? 
      Math.min(searchResults[0].similarity * 100, 95) : 20;

    const response: MedicalRAGResponse = {
      answer,
      confidence,
      sources: searchResults.slice(0, 5),
      urgencyLevel,
      recommendedSpecialties: Array.from(specialties).slice(0, 3),
      followUpQuestions
    };

    // Add emergency alert if needed
    if (isEmergency && emergencyResults.length > 0) {
      const emergencyInfo = this.extractEmergencyInfo(emergencyResults[0].content);
      response.emergencyAlert = {
        isEmergency: true,
        immediateAction: emergencyInfo.action,
        description: emergencyInfo.description
      };
    }

    return response;
  }

  /**
   * Generate contextual follow-up questions
   */
  private generateContextualFollowUpQuestions(
    query: string, 
    searchResults: SemanticSearchResult[],
    context: any
  ): string[] {
    const questions = new Set<string>();

    // Add generic follow-up questions based on symptoms
    if (query.toLowerCase().includes('pain')) {
      questions.add('On a scale of 1-10, how severe is the pain?');
      questions.add('When did the pain start?');
      questions.add('Does anything make the pain better or worse?');
    }

    if (query.toLowerCase().includes('fever')) {
      questions.add('What is your current temperature?');
      questions.add('How long have you had the fever?');
      questions.add('Do you have any other symptoms with the fever?');
    }

    // Add questions from search results
    searchResults.forEach(result => {
      if (result.metadata.type === 'symptom') {
        // Extract follow-up questions from symptom mappings
        const symptomMapping = SYMPTOM_MAPPINGS.find(s => 
          result.content.toLowerCase().includes(s.symptom.toLowerCase())
        );
        if (symptomMapping) {
          symptomMapping.followUpQuestions.forEach(q => questions.add(q));
        }
      }
    });

    return Array.from(questions).slice(0, 3);
  }

  /**
   * Generate comprehensive medical answer
   */
  private generateMedicalAnswer(
    query: string, 
    searchResults: SemanticSearchResult[],
    context: any
  ): string {
    if (searchResults.length === 0) {
      return "I understand you're experiencing some symptoms. While I can provide general guidance, I'd recommend consulting with a healthcare professional for a proper evaluation of your specific situation.";
    }

    let answer = "Based on the symptoms you've described, ";

    // Check for emergency first
    const emergencyResults = searchResults.filter(r => r.metadata.type === 'emergency');
    if (emergencyResults.length > 0 && emergencyResults[0].similarity > 0.3) {
      return "⚠️ MEDICAL EMERGENCY: Your symptoms may indicate a serious medical condition that requires immediate attention. Please call 911 or go to the nearest emergency room right away. Do not delay seeking medical care.";
    }

    // Analyze top results
    const topResults = searchResults.slice(0, 3);
    const conditions = topResults.filter(r => r.metadata.type === 'condition');
    const symptoms = topResults.filter(r => r.metadata.type === 'symptom');

    if (conditions.length > 0) {
      const conditionNames = conditions.map(c => 
        c.content.split(':')[0].replace('EMERGENCY: ', '')
      );
      answer += `this could be related to conditions such as ${conditionNames.join(' or ')}. `;
    }

    if (symptoms.length > 0) {
      const urgencyLevels = symptoms.map(s => s.metadata.urgencyLevel).filter(Boolean);
      if (urgencyLevels.includes('high')) {
        answer += "These symptoms warrant prompt medical attention. ";
      } else if (urgencyLevels.includes('medium')) {
        answer += "I recommend scheduling an appointment with a healthcare provider soon. ";
      } else {
        answer += "While these symptoms may not be immediately serious, it's still good to monitor them. ";
      }
    }

    answer += "Please remember that this is general information and not a substitute for professional medical advice. A healthcare provider can give you a proper diagnosis and treatment plan.";

    return answer;
  }

  /**
   * Extract emergency information from content
   */
  private extractEmergencyInfo(content: string): { action: string; description: string } {
    const parts = content.split('. Action: ');
    const description = parts[0].replace('EMERGENCY: ', '');
    const action = parts[1] || 'Seek immediate medical attention';
    
    return { action, description };
  }

  /**
   * Verify medical facts against knowledge base
   */
  async verifyMedicalFact(statement: string): Promise<{
    isVerified: boolean;
    confidence: number;
    supportingEvidence: SemanticSearchResult[];
    contradictingEvidence: SemanticSearchResult[];
  }> {
    await this.initializeVectorDatabase();

    const searchResults = await this.semanticSearch(statement, 10);
    
    // Simple fact verification based on similarity scores
    const supportingEvidence = searchResults.filter(r => r.similarity > 0.4);
    const contradictingEvidence: SemanticSearchResult[] = []; // Would need more sophisticated logic
    
    const isVerified = supportingEvidence.length > 0;
    const confidence = supportingEvidence.length > 0 ? 
      Math.min(supportingEvidence[0].similarity * 100, 90) : 10;

    return {
      isVerified,
      confidence,
      supportingEvidence: supportingEvidence.slice(0, 3),
      contradictingEvidence
    };
  }

  /**
   * Get medical knowledge statistics
   */
  async getKnowledgeBaseStats(): Promise<{
    totalVectors: number;
    symptomVectors: number;
    conditionVectors: number;
    emergencyVectors: number;
    specialtyVectors: number;
    vectorDbStats: any;
    embeddingStats: any;
  }> {
    await this.initializeVectorDatabase();
    
    const allDocs = await vectorDatabase.getDocuments();
    const vectorDbStats = vectorDatabase.getStats();
    const embeddingStats = embeddingService.getStats();

    return {
      totalVectors: allDocs.length,
      symptomVectors: allDocs.filter(d => d.metadata.type === 'symptom').length,
      conditionVectors: allDocs.filter(d => d.metadata.type === 'condition').length,
      emergencyVectors: allDocs.filter(d => d.metadata.type === 'emergency').length,
      specialtyVectors: allDocs.filter(d => d.metadata.type === 'specialty').length,
      vectorDbStats,
      embeddingStats
    };
  }
}

// Export singleton instance
export const medicalKnowledgeAgent = new MedicalKnowledgeAgent();