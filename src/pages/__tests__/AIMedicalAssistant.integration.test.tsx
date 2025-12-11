/**
 * Integration tests for AI Medical Assistant
 * 
 * These tests verify that the AI Medical Assistant frontend properly:
 * - Connects to the FastAPI backend
 * - Sends messages to http://localhost:8000/ask
 * - Displays AI responses with proper formatting
 * - Shows tool badges when tools are used
 * - Displays emergency alerts for high severity responses
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AIMedicalAssistant from '../AIMedicalAssistant';

// Mock the hooks and components
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AIMedicalAssistant />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AIMedicalAssistant Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should display the AI Medical Assistant chat interface (Requirement 3.1)', () => {
    renderComponent();
    
    expect(screen.getByText('AI Medical Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe your symptoms/i)).toBeInTheDocument();
    expect(screen.getByText('Get medical guidance, find doctors, and receive emergency support')).toBeInTheDocument();
  });

  it('should send messages to http://localhost:8000/ask (Requirement 3.2)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'I can help you with that.',
        tool_used: null,
      }),
    });

    renderComponent();
    
    const input = screen.getByPlaceholderText(/Describe your symptoms/i);
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons.find(btn => !btn.textContent?.includes('Browse'));

    fireEvent.change(input, { target: { value: 'I have a headache' } });
    if (sendButton) fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/ask',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: 'I have a headache' }),
        })
      );
    });
  });

  it('should display AI responses with proper formatting (Requirement 3.3)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Based on your symptoms, I recommend seeing a doctor.',
        tool_used: 'medgemma_triage_tool',
      }),
    });

    renderComponent();
    
    const input = screen.getByPlaceholderText(/Describe your symptoms/i);
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons.find(btn => !btn.textContent?.includes('Browse'));

    fireEvent.change(input, { target: { value: 'I have a fever' } });
    if (sendButton) fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Based on your symptoms/i)).toBeInTheDocument();
    });
  });

  it('should display tool badge when tool_used is present (Requirement 3.4)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'I found some doctors for you.',
        tool_used: 'doctor_locator_tool',
      }),
    });

    renderComponent();
    
    const input = screen.getByPlaceholderText(/Describe your symptoms/i);
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons.find(btn => !btn.textContent?.includes('Browse'));

    fireEvent.change(input, { target: { value: 'Find me a cardiologist' } });
    if (sendButton) fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Doctor Finder/i)).toBeInTheDocument();
    });
  });

  it('should display emergency alert for emergency_alert_tool (Requirement 3.5)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: '🚨 EMERGENCY ALERT TRIGGERED 🚨\n\nImmediate Actions:\n1. Call emergency services: 112',
        tool_used: 'emergency_alert_tool',
      }),
    });

    renderComponent();
    
    const input = screen.getByPlaceholderText(/Describe your symptoms/i);
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons.find(btn => !btn.textContent?.includes('Browse'));

    fireEvent.change(input, { target: { value: 'I have severe chest pain' } });
    if (sendButton) fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/MEDICAL EMERGENCY DETECTED - Seek immediate medical attention/i)).toBeInTheDocument();
    });
  });

  it('should detect high severity from MedGemma response (Requirement 3.5)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          severity: 'high',
          likely_conditions: ['Heart attack'],
          recommended_actions: ['Seek emergency medical help immediately'],
          suggested_specialties: ['Cardiologist'],
        }),
        tool_used: 'medgemma_triage_tool',
      }),
    });

    renderComponent();
    
    const input = screen.getByPlaceholderText(/Describe your symptoms/i);
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons.find(btn => !btn.textContent?.includes('Browse'));

    fireEvent.change(input, { target: { value: 'Chest pain and shortness of breath' } });
    if (sendButton) fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/HIGH Priority/i)).toBeInTheDocument();
    });
  });

  it('should handle backend connection errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderComponent();
    
    const input = screen.getByPlaceholderText(/Describe your symptoms/i);
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons.find(btn => !btn.textContent?.includes('Browse'));

    fireEvent.change(input, { target: { value: 'Test message' } });
    if (sendButton) fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('should show loading state while waiting for response', async () => {
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ response: 'Response', tool_used: null }),
      }), 100))
    );

    renderComponent();
    
    const input = screen.getByPlaceholderText(/Describe your symptoms/i);
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons.find(btn => !btn.textContent?.includes('Browse'));

    fireEvent.change(input, { target: { value: 'Test' } });
    if (sendButton) fireEvent.click(sendButton);

    // Should show loading indicator
    await waitFor(() => {
      if (sendButton) expect(sendButton).toBeDisabled();
    });
  });

  it('should clear input after sending message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Response',
        tool_used: null,
      }),
    });

    renderComponent();
    
    const input = screen.getByPlaceholderText(/Describe your symptoms/i) as HTMLInputElement;
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons.find(btn => !btn.textContent?.includes('Browse'));

    fireEvent.change(input, { target: { value: 'Test message' } });
    expect(input.value).toBe('Test message');
    
    if (sendButton) fireEvent.click(sendButton);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('should display multiple messages in conversation', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'First response',
          tool_used: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'Second response',
          tool_used: null,
        }),
      });

    renderComponent();
    
    const input = screen.getByPlaceholderText(/Describe your symptoms/i);
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons.find(btn => !btn.textContent?.includes('Browse'));

    // Send first message
    fireEvent.change(input, { target: { value: 'First message' } });
    if (sendButton) fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('First response')).toBeInTheDocument();
    });

    // Send second message
    fireEvent.change(input, { target: { value: 'Second message' } });
    if (sendButton) fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Second response')).toBeInTheDocument();
    });

    // Both messages should be visible
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
  });
});
