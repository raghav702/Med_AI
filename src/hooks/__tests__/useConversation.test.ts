import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useConversation } from '../useConversation';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('useConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should initialize with empty conversation', () => {
    const { result } = renderHook(() => useConversation());
    
    expect(result.current.context.messages).toEqual([]);
    expect(result.current.context.currentSymptoms).toEqual([]);
    expect(result.current.context.urgencyLevel).toBe('low');
    expect(result.current.context.conversationStage).toBe('initial');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should add user message when sendMessage is called', async () => {
    const { result } = renderHook(() => useConversation());
    
    await act(async () => {
      await result.current.sendMessage('I have a headache');
    });

    expect(result.current.context.messages).toHaveLength(1);
    expect(result.current.context.messages[0].role).toBe('user');
    expect(result.current.context.messages[0].content).toBe('I have a headache');
    expect(result.current.context.conversationStage).toBe('gathering');
  });

  it('should detect symptoms from user message', async () => {
    const { result } = renderHook(() => useConversation());
    
    await act(async () => {
      await result.current.sendMessage('I have a severe headache and fever');
    });

    expect(result.current.context.currentSymptoms).toContain('headache');
    expect(result.current.context.currentSymptoms).toContain('fever');
  });

  it('should add AI response after user message', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useConversation());
    
    await act(async () => {
      await result.current.sendMessage('I feel sick');
    });

    // Fast-forward time to trigger AI response
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.context.messages).toHaveLength(2);
    expect(result.current.context.messages[1].role).toBe('assistant');
    
    vi.useRealTimers();
  });

  it('should update context correctly', () => {
    const { result } = renderHook(() => useConversation());
    
    act(() => {
      result.current.updateContext({
        urgencyLevel: 'high',
        recommendedSpecialty: 'cardiology'
      });
    });

    expect(result.current.context.urgencyLevel).toBe('high');
    expect(result.current.context.recommendedSpecialty).toBe('cardiology');
  });

  it('should set typing indicator', () => {
    const { result } = renderHook(() => useConversation());
    
    act(() => {
      result.current.setTyping(true);
    });

    expect(result.current.context.isTyping).toBe(true);
  });

  it('should clear conversation', () => {
    const { result } = renderHook(() => useConversation());
    
    // Add some messages first
    act(() => {
      result.current.addMessage({
        role: 'user',
        content: 'Test message',
        type: 'text'
      });
    });

    expect(result.current.context.messages).toHaveLength(1);

    // Clear conversation
    act(() => {
      result.current.clearConversation();
    });

    expect(result.current.context.messages).toHaveLength(0);
    expect(result.current.context.conversationStage).toBe('initial');
  });

  it('should save conversation to localStorage', async () => {
    const { result } = renderHook(() => useConversation());
    
    await act(async () => {
      result.current.addMessage({
        role: 'user',
        content: 'Test message',
        type: 'text'
      });
    });

    // Wait for async save to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    // Check that localStorage.setItem was called
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should load conversation from localStorage', () => {
    const mockConversation = {
      sessionId: 'test-session',
      messages: [{
        id: 'msg1',
        role: 'user',
        content: 'Previous message',
        type: 'text',
        timestamp: new Date().toISOString()
      }],
      currentSymptoms: ['headache'],
      urgencyLevel: 'medium',
      conversationStage: 'gathering',
      lastActivity: new Date().toISOString(),
      isTyping: false,
      metadata: {}
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConversation));

    const { result } = renderHook(() => useConversation());
    
    act(() => {
      result.current.loadConversation('test-session');
    });

    expect(result.current.context.messages).toHaveLength(1);
    expect(result.current.context.currentSymptoms).toContain('headache');
    expect(result.current.context.urgencyLevel).toBe('medium');
  });
});