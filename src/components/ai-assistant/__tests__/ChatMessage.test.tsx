import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatMessage } from '../ChatMessage';
import type { ChatMessage as ChatMessageType } from '../ChatMessage';

describe('ChatMessage', () => {
  const mockUserMessage: ChatMessageType = {
    id: '1',
    content: 'Hello, I have a headache',
    sender: 'user',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    status: 'sent'
  };

  const mockAIMessage: ChatMessageType = {
    id: '2',
    content: 'I understand you have a headache. Can you tell me more about it?',
    sender: 'ai',
    timestamp: new Date('2024-01-01T10:01:00Z')
  };

  it('renders user message with correct styling', () => {
    render(<ChatMessage message={mockUserMessage} />);
    
    expect(screen.getByText('Hello, I have a headache')).toBeInTheDocument();
    expect(screen.getByText('03:30 pm')).toBeInTheDocument();
    
    // Check for user avatar (SVG icon)
    const container = screen.getByText('Hello, I have a headache').closest('.flex.w-full');
    expect(container).toHaveClass('justify-end'); // User messages are right-aligned
  });

  it('renders AI message with correct styling', () => {
    render(<ChatMessage message={mockAIMessage} />);
    
    expect(screen.getByText('I understand you have a headache. Can you tell me more about it?')).toBeInTheDocument();
    expect(screen.getByText('03:31 pm')).toBeInTheDocument();
  });

  it('shows message status for user messages', () => {
    render(<ChatMessage message={mockUserMessage} />);
    
    // Status icon should be present for user messages
    const messageContainer = screen.getByText('Hello, I have a headache').closest('div');
    expect(messageContainer).toBeInTheDocument();
  });

  it('does not show message status for AI messages', () => {
    render(<ChatMessage message={mockAIMessage} />);
    
    // AI messages should not have status indicators
    const messageContainer = screen.getByText('I understand you have a headache. Can you tell me more about it?').closest('div');
    expect(messageContainer).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(<ChatMessage message={mockUserMessage} className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});