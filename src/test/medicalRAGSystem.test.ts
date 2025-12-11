// Medical RAG System Tests
// Tests for vector database, embedding service, and medical knowledge agent

import { describe, it, expect, beforeAll } from 'vitest';
import { medicalKnowledgeAgent } from '../services/agents/medicalKnowledgeAgent';
import { vectorDatabase } from '../services/vectorDatabase';
import { embeddingService } from '../services/embeddingService';
import { medicalFactVerificationService } from '../services/medicalFactVerification';

describe('Medical RAG System', () => {
  beforeAll(async () => {
    // Initialize the system
    await new Promise(resolve => setTimeout(resolve, 1000)); // Allow initialization
  });

  describe('Embedding Service', () => {
    it('should generate embeddings for medical text', async () => {
      const result = await embeddingService.generateEmbedding('chest pain severe');
      
      expect(result.embedding).toBeDefined();
      expect(result.embedding.length).toBeGreaterThan(0);
      expect(result.dimensions).toBe(result.embedding.length);
      expect(result.model).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should calculate similarity between embeddings', async () => {
      const result1 = await embeddingService.generateEmbedding('chest pain');
      const result2 = await embeddingService.generateEmbedding('heart pain');
      const result3 = await embeddingService.generateEmbedding('headache');

      const similarity1 = embeddingService.calculateSimilarity(
        result1.embedding, 
        result2.embedding
      );
      const similarity2 = embeddingService.calculateSimilarity(
        result1.embedding, 
        result3.embedding
      );

      expect(similarity1).toBeGreaterThan(similarity2);
      expect(similarity1).toBeGreaterThan(0);
      expect(similarity2).toBeGreaterThanOrEqual(0);
    });

    it('should provide service statistics', () => {
      const stats = embeddingService.getStats();
      
      expect(stats.vocabularySize).toBeGreaterThan(0);
      expect(stats.isInitialized).toBe(true);
      expect(stats.supportedModels).toContain('medical-bert');
    });
  });

  describe('Vector Database', () => {
    it('should provide database statistics', () => {
      const stats = vectorDatabase.getStats();
      
      expect(stats.totalDocuments).toBeGreaterThan(0);
      expect(stats.totalKeywords).toBeGreaterThan(0);
      expect(stats.averageEmbeddingDimension).toBeGreaterThan(0);
      expect(stats.memoryUsage).toBeDefined();
    });

    it('should perform vector search', async () => {
      const embeddingResult = await embeddingService.generateEmbedding('chest pain');
      const searchResults = await vectorDatabase.vectorSearch(
        embeddingResult.embedding,
        { limit: 5, threshold: 0.1 }
      );

      expect(searchResults).toBeDefined();
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].similarity).toBeGreaterThan(0);
      expect(searchResults[0].document).toBeDefined();
    });

    it('should perform hybrid search', async () => {
      const embeddingResult = await embeddingService.generateEmbedding('severe headache');
      const searchResults = await vectorDatabase.hybridSearch(
        embeddingResult.embedding,
        'severe headache',
        { limit: 5 }
      );

      expect(searchResults).toBeDefined();
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].score).toBeGreaterThan(0);
    });
  });

  describe('Medical Knowledge Agent', () => {
    it('should perform semantic search for symptoms', async () => {
      const results = await medicalKnowledgeAgent.semanticSearch('chest pain', 5);
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toBeDefined();
      expect(results[0].similarity).toBeGreaterThan(0);
      expect(results[0].metadata).toBeDefined();
    });

    it('should retrieve contextual information', async () => {
      const response = await medicalKnowledgeAgent.retrieveContextualInformation(
        'severe chest pain',
        {
          previousSymptoms: ['shortness of breath'],
          userAge: 45
        }
      );

      expect(response.answer).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.urgencyLevel).toBeDefined();
      expect(response.recommendedSpecialties).toBeDefined();
      expect(response.followUpQuestions).toBeDefined();
    });

    it('should detect emergency symptoms', async () => {
      const response = await medicalKnowledgeAgent.retrieveContextualInformation(
        'severe chest pain crushing pressure'
      );

      expect(response.urgencyLevel).toBe('emergency');
      expect(response.emergencyAlert).toBeDefined();
      expect(response.emergencyAlert?.isEmergency).toBe(true);
    });

    it('should provide knowledge base statistics', async () => {
      const stats = await medicalKnowledgeAgent.getKnowledgeBaseStats();
      
      expect(stats.totalVectors).toBeGreaterThan(0);
      expect(stats.symptomVectors).toBeGreaterThan(0);
      expect(stats.conditionVectors).toBeGreaterThan(0);
      expect(stats.emergencyVectors).toBeGreaterThan(0);
      expect(stats.specialtyVectors).toBeGreaterThan(0);
    });
  });

  describe('Medical Fact Verification', () => {
    it('should verify medical facts', async () => {
      const result = await medicalFactVerificationService.verifyMedicalFact({
        statement: 'Chest pain can be a symptom of heart problems',
        category: 'symptom'
      });

      expect(result.isVerified).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.verificationLevel).toBeDefined();
      expect(result.supportingEvidence).toBeDefined();
      expect(result.medicalAccuracy.score).toBeGreaterThan(0);
    });

    it('should verify medical advice safety', async () => {
      const safeAdvice = 'If you have chest pain, consult a doctor';
      const unsafeAdvice = 'Ignore chest pain, it will go away';

      const safeResult = await medicalFactVerificationService.verifyMedicalAdviceSafety(safeAdvice);
      const unsafeResult = await medicalFactVerificationService.verifyMedicalAdviceSafety(unsafeAdvice);

      expect(safeResult.isSafe).toBe(true);
      expect(safeResult.riskLevel).toBe('low');
      
      expect(unsafeResult.isSafe).toBe(false);
      expect(unsafeResult.riskLevel).toBe('critical');
      expect(unsafeResult.warnings.length).toBeGreaterThan(0);
    });

    it('should provide verification statistics', () => {
      const stats = medicalFactVerificationService.getVerificationStats();
      
      expect(stats.verificationThresholds).toBeDefined();
      expect(stats.supportedCategories).toContain('symptom');
      expect(stats.supportedCategories).toContain('treatment');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex medical queries', async () => {
      const query = 'I have been experiencing severe headaches with nausea and light sensitivity for the past week';
      
      const response = await medicalKnowledgeAgent.retrieveContextualInformation(query);
      
      expect(response.answer).toBeDefined();
      expect(response.recommendedSpecialties).toContain('Neurology');
      expect(response.followUpQuestions.length).toBeGreaterThan(0);
      expect(response.urgencyLevel).toBeDefined();
    });

    it('should prioritize emergency conditions', async () => {
      const emergencyQuery = 'crushing chest pain radiating to left arm';
      const regularQuery = 'mild headache';

      const emergencyResponse = await medicalKnowledgeAgent.retrieveContextualInformation(emergencyQuery);
      const regularResponse = await medicalKnowledgeAgent.retrieveContextualInformation(regularQuery);

      expect(emergencyResponse.urgencyLevel).toBe('emergency');
      expect(regularResponse.urgencyLevel).not.toBe('emergency');
      expect(emergencyResponse.emergencyAlert).toBeDefined();
    });

    it('should provide relevant specialty recommendations', async () => {
      const queries = [
        { query: 'skin rash itchy', expectedSpecialty: 'Dermatology' },
        { query: 'joint pain stiffness', expectedSpecialty: 'Rheumatology' },
        { query: 'breathing problems wheezing', expectedSpecialty: 'Pulmonology' }
      ];

      for (const { query, expectedSpecialty } of queries) {
        const response = await medicalKnowledgeAgent.retrieveContextualInformation(query);
        expect(response.recommendedSpecialties).toContain(expectedSpecialty);
      }
    });
  });
});