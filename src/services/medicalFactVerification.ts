// Medical Fact Verification Service
// Provides fact-checking capabilities for medical information

import { medicalKnowledgeAgent, SemanticSearchResult } from './agents/medicalKnowledgeAgent';
import { embeddingService } from './embeddingService';

export interface FactVerificationResult {
  statement: string;
  isVerified: boolean;
  confidence: number;
  verificationLevel: 'high' | 'medium' | 'low' | 'unverified';
  supportingEvidence: SemanticSearchResult[];
  contradictingEvidence: SemanticSearchResult[];
  medicalAccuracy: {
    score: number;
    reasoning: string;
    recommendations: string[];
  };
  sources: {
    type: 'knowledge_base' | 'medical_literature' | 'clinical_guidelines';
    content: string;
    reliability: number;
  }[];
}

export interface MedicalClaim {
  statement: string;
  category: 'symptom' | 'treatment' | 'diagnosis' | 'prevention' | 'general';
  urgencyLevel?: 'low' | 'medium' | 'high' | 'emergency';
  context?: string;
}

/**
 * Medical Fact Verification Service
 * Verifies medical statements against knowledge base and medical guidelines
 */
export class MedicalFactVerificationService {
  private verificationThresholds = {
    high: 0.8,
    medium: 0.6,
    low: 0.4
  };

  /**
   * Verify a medical fact or statement
   */
  async verifyMedicalFact(claim: MedicalClaim): Promise<FactVerificationResult> {
    const { statement, category, context } = claim;

    // Enhance statement with context if provided
    const enhancedStatement = context ? `${statement} ${context}` : statement;

    // Search for supporting evidence
    const supportingEvidence = await medicalKnowledgeAgent.semanticSearch(
      enhancedStatement, 
      10
    );

    // Search for potential contradictions
    const contradictingEvidence = await this.findContradictingEvidence(
      statement, 
      supportingEvidence
    );

    // Calculate verification confidence
    const confidence = this.calculateVerificationConfidence(
      supportingEvidence, 
      contradictingEvidence
    );

    // Determine verification level
    const verificationLevel = this.determineVerificationLevel(confidence);

    // Assess medical accuracy
    const medicalAccuracy = await this.assessMedicalAccuracy(
      statement, 
      supportingEvidence, 
      category
    );

    // Generate sources
    const sources = this.generateSources(supportingEvidence);

    return {
      statement,
      isVerified: verificationLevel !== 'unverified',
      confidence,
      verificationLevel,
      supportingEvidence: supportingEvidence.slice(0, 5),
      contradictingEvidence,
      medicalAccuracy,
      sources
    };
  }

  /**
   * Batch verify multiple medical facts
   */
  async verifyMultipleFacts(claims: MedicalClaim[]): Promise<FactVerificationResult[]> {
    const results: FactVerificationResult[] = [];
    
    for (const claim of claims) {
      const result = await this.verifyMedicalFact(claim);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Find contradicting evidence for a statement
   */
  private async findContradictingEvidence(
    statement: string, 
    supportingEvidence: SemanticSearchResult[]
  ): Promise<SemanticSearchResult[]> {
    // Look for contradictory terms
    const contradictoryQueries = this.generateContradictoryQueries(statement);
    const contradictingEvidence: SemanticSearchResult[] = [];

    for (const query of contradictoryQueries) {
      const results = await medicalKnowledgeAgent.semanticSearch(query, 3);
      
      // Filter out results that are too similar to supporting evidence
      const filtered = results.filter(result => 
        !supportingEvidence.some(support => 
          embeddingService.calculateSimilarity(
            [result.similarity], 
            [support.similarity]
          ) > 0.8
        )
      );
      
      contradictingEvidence.push(...filtered);
    }

    return contradictingEvidence.slice(0, 3);
  }

  /**
   * Generate contradictory search queries
   */
  private generateContradictoryQueries(statement: string): string[] {
    const queries: string[] = [];
    const lowerStatement = statement.toLowerCase();

    // Add negation patterns
    if (lowerStatement.includes('causes')) {
      queries.push(statement.replace(/causes?/gi, 'does not cause'));
    }
    
    if (lowerStatement.includes('helps') || lowerStatement.includes('treats')) {
      queries.push(statement.replace(/helps?|treats?/gi, 'does not help'));
    }
    
    if (lowerStatement.includes('safe')) {
      queries.push(statement.replace(/safe/gi, 'dangerous'));
    }
    
    if (lowerStatement.includes('effective')) {
      queries.push(statement.replace(/effective/gi, 'ineffective'));
    }

    // Add alternative condition queries
    if (lowerStatement.includes('symptom')) {
      queries.push(statement.replace(/symptom/gi, 'not a symptom'));
    }

    return queries;
  }

  /**
   * Calculate verification confidence based on evidence
   */
  private calculateVerificationConfidence(
    supportingEvidence: SemanticSearchResult[],
    contradictingEvidence: SemanticSearchResult[]
  ): number {
    if (supportingEvidence.length === 0) return 0;

    // Base confidence from supporting evidence
    const supportScore = supportingEvidence.reduce((sum, evidence) => 
      sum + evidence.similarity, 0
    ) / supportingEvidence.length;

    // Penalty for contradicting evidence
    const contradictPenalty = contradictingEvidence.length > 0 ? 
      contradictingEvidence.reduce((sum, evidence) => 
        sum + evidence.similarity, 0
      ) / contradictingEvidence.length * 0.5 : 0;

    // Boost for emergency-related evidence
    const emergencyBoost = supportingEvidence.some(e => 
      e.metadata.type === 'emergency'
    ) ? 0.1 : 0;

    // Boost for multiple source types
    const sourceTypes = new Set(supportingEvidence.map(e => e.metadata.type));
    const diversityBoost = sourceTypes.size > 2 ? 0.1 : 0;

    const confidence = Math.max(0, Math.min(1, 
      supportScore - contradictPenalty + emergencyBoost + diversityBoost
    ));

    return Math.round(confidence * 100) / 100;
  }

  /**
   * Determine verification level based on confidence
   */
  private determineVerificationLevel(confidence: number): 'high' | 'medium' | 'low' | 'unverified' {
    if (confidence >= this.verificationThresholds.high) return 'high';
    if (confidence >= this.verificationThresholds.medium) return 'medium';
    if (confidence >= this.verificationThresholds.low) return 'low';
    return 'unverified';
  }

  /**
   * Assess medical accuracy of a statement
   */
  private async assessMedicalAccuracy(
    statement: string,
    evidence: SemanticSearchResult[],
    category: string
  ): Promise<{
    score: number;
    reasoning: string;
    recommendations: string[];
  }> {
    let score = 0;
    let reasoning = '';
    const recommendations: string[] = [];

    if (evidence.length === 0) {
      score = 20;
      reasoning = 'No supporting evidence found in medical knowledge base';
      recommendations.push('Consult medical literature or healthcare professional');
      recommendations.push('Verify with authoritative medical sources');
    } else {
      // Calculate accuracy score based on evidence quality
      const avgSimilarity = evidence.reduce((sum, e) => sum + e.similarity, 0) / evidence.length;
      const emergencyEvidence = evidence.filter(e => e.metadata.type === 'emergency');
      const medicalEvidence = evidence.filter(e => 
        e.metadata.type === 'condition' || e.metadata.type === 'symptom'
      );

      score = Math.min(95, avgSimilarity * 100);

      // Adjust score based on evidence types
      if (emergencyEvidence.length > 0) {
        score = Math.min(95, score + 10);
        reasoning = 'Statement relates to emergency medical conditions with high confidence';
        recommendations.push('Seek immediate medical attention if experiencing these symptoms');
      } else if (medicalEvidence.length > 0) {
        reasoning = 'Statement supported by medical knowledge base with good confidence';
        recommendations.push('Consider consulting healthcare professional for personalized advice');
      } else {
        reasoning = 'Statement has limited support in medical knowledge base';
        recommendations.push('Verify with additional medical sources');
      }

      // Category-specific adjustments
      if (category === 'treatment') {
        score *= 0.9; // Be more conservative with treatment claims
        recommendations.push('Treatment decisions should always involve healthcare professionals');
      } else if (category === 'diagnosis') {
        score *= 0.8; // Be very conservative with diagnostic claims
        recommendations.push('Only qualified healthcare professionals can provide medical diagnoses');
      }
    }

    return {
      score: Math.round(score),
      reasoning,
      recommendations
    };
  }

  /**
   * Generate sources from evidence
   */
  private generateSources(evidence: SemanticSearchResult[]): {
    type: 'knowledge_base' | 'medical_literature' | 'clinical_guidelines';
    content: string;
    reliability: number;
  }[] {
    return evidence.slice(0, 3).map(e => ({
      type: 'knowledge_base' as const,
      content: e.content.substring(0, 200) + (e.content.length > 200 ? '...' : ''),
      reliability: Math.round(e.similarity * 100)
    }));
  }

  /**
   * Verify medical advice safety
   */
  async verifyMedicalAdviceSafety(advice: string): Promise<{
    isSafe: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    warnings: string[];
    recommendations: string[];
  }> {
    // Check for dangerous advice patterns
    const dangerousPatterns = [
      /ignore.*(symptoms?|pain|bleeding)/i,
      /don'?t.*(see|visit|consult).*(doctor|physician|medical)/i,
      /self.*(medicate|treat|diagnose)/i,
      /stop.*(taking|medication|treatment)/i,
      /home.*(surgery|procedure)/i
    ];

    const warnings: string[] = [];
    const recommendations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check for dangerous patterns
    for (const pattern of dangerousPatterns) {
      if (pattern.test(advice)) {
        riskLevel = 'critical';
        warnings.push('Advice contains potentially dangerous medical guidance');
        recommendations.push('Always consult healthcare professionals for medical decisions');
        break;
      }
    }

    // Check for positive medical advice patterns
    const safePatterns = [
      /consult.*(doctor|physician|medical|healthcare)/i,
      /see.*(doctor|physician|medical)/i,
      /seek.*(medical|professional).*(help|advice|attention)/i,
      /visit.*(doctor|clinic|hospital)/i
    ];

    let hasSafePattern = false;
    for (const pattern of safePatterns) {
      if (pattern.test(advice)) {
        hasSafePattern = true;
        break;
      }
    }

    // If no dangerous patterns and has safe patterns, keep as low risk
    if (riskLevel === 'low' && hasSafePattern) {
      recommendations.push('This information is for educational purposes only');
      recommendations.push('Consult healthcare professionals for personalized medical advice');
    } else if (riskLevel === 'low') {
      // Check for emergency-related advice
      const emergencyEvidence = await medicalKnowledgeAgent.semanticSearch(
        advice + ' emergency', 
        3
      );

      if (emergencyEvidence.some(e => e.metadata.type === 'emergency' && e.similarity > 0.5)) {
        riskLevel = 'high';
        warnings.push('Advice relates to emergency medical conditions');
        recommendations.push('Seek immediate medical attention for emergency symptoms');
      } else {
        recommendations.push('This information is for educational purposes only');
        recommendations.push('Consult healthcare professionals for personalized medical advice');
      }
    }

    return {
      isSafe: riskLevel === 'low' || riskLevel === 'medium',
      riskLevel,
      warnings,
      recommendations
    };
  }

  /**
   * Get verification service statistics
   */
  getVerificationStats(): {
    verificationThresholds: typeof this.verificationThresholds;
    supportedCategories: string[];
  } {
    return {
      verificationThresholds: this.verificationThresholds,
      supportedCategories: ['symptom', 'treatment', 'diagnosis', 'prevention', 'general']
    };
  }
}

// Export singleton instance
export const medicalFactVerificationService = new MedicalFactVerificationService();