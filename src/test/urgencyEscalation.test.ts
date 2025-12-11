import { describe, it, expect } from 'vitest';
import { urgencyEscalationService } from '../services/urgencyEscalationService';
import { symptomAnalysisAgent } from '../services/agents/symptomAnalysisAgent';

describe('Urgency Escalation Service', () => {
    it('should detect emergency symptoms correctly', () => {
        const emergencyInput = "I'm having severe chest pain and can't breathe";
        const analysis = symptomAnalysisAgent.analyzeSymptoms(emergencyInput);

        expect(analysis.urgencyLevel).toBe('emergency');
        expect(analysis.emergencyFlags.length).toBeGreaterThan(0);
    });

    it('should provide appropriate escalation for emergency', () => {
        const emergencyInput = "I think I'm having a heart attack";
        const analysis = symptomAnalysisAgent.analyzeSymptoms(emergencyInput);
        const escalation = urgencyEscalationService.assessUrgency(analysis);

        expect(escalation.urgencyLevel).toBe('emergency');
        expect(escalation.immediateActions).toContain('Call 911 immediately');
        expect(escalation.emergencyContacts.length).toBeGreaterThan(0);
    });

    it('should detect high urgency symptoms', () => {
        const highUrgencyInput = "I have severe abdominal pain for the last 6 hours";
        const analysis = symptomAnalysisAgent.analyzeSymptoms(highUrgencyInput);
        const escalation = urgencyEscalationService.assessUrgency(analysis);

        expect(['high', 'emergency']).toContain(escalation.urgencyLevel);
        expect(escalation.timeframe).toBeDefined();
    });

    it('should provide emergency contacts based on symptoms', () => {
        const suicidalInput = "I want to kill myself";
        const analysis = symptomAnalysisAgent.analyzeSymptoms(suicidalInput);
        const contacts = urgencyEscalationService.getEmergencyContacts(analysis);

        // Check if we get any emergency contacts for mental health crisis
        expect(contacts.length).toBeGreaterThan(0);
        // Should include either 911 or crisis lifeline
        expect(contacts.some(c => c.number === '911' || c.number === '988')).toBe(true);
    });

    it('should detect immediate danger correctly', () => {
        const dangerousInput = "severe bleeding won't stop";
        const analysis = symptomAnalysisAgent.analyzeSymptoms(dangerousInput);
        const isImmediate = urgencyEscalationService.isImmediateDanger(analysis);

        expect(isImmediate).toBe(true);
    });

    it('should provide appropriate care recommendations', () => {
        const mediumInput = "I have a persistent headache for 3 days";
        const analysis = symptomAnalysisAgent.analyzeSymptoms(mediumInput);
        const recommendations = urgencyEscalationService.getImmediateCareRecommendations(analysis);

        expect(recommendations.length).toBeGreaterThan(0);
        expect(recommendations.some(r => r.includes('appointment'))).toBe(true);
    });

    it('should get emergency protocol for specific conditions', () => {
        const protocol = urgencyEscalationService.getEmergencyProtocol('heart attack');

        expect(protocol).toBeDefined();
        expect(protocol?.immediateActions).toContain('Call 911 immediately');
        expect(protocol?.firstAidSteps.length).toBeGreaterThan(0);
    });
});