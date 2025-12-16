import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatInterface } from '../ChatInterface';

describe('ChatInterface', () => {
  it('renders initial AI greeting message', () => {
    render(<ChatInterface />);
    
    expect(screen.getByText(/Hello! I'm your AI medical assistant/)).toBeInTheDocument();
    expect(screen.getByText('AI Medical Assistant')).toBeInTheDocument();
  });

  it('displays message input with placeholder', () => {
    render(<ChatInterface />);
    
    const input = screen.getByPlaceholderText('Describe your symptoms or health concerns...');
    expect(input).toBeInTheDocument();
  });

  it('sends message when send button is clicked', async () => {
    const mockOnSendMessage = vi.fn();
    render(<ChatInterface onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByPlaceholderText('Describe your symptoms or health concerns...');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'I have a headache' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith('I have a headache');
    });
    
    expect(screen.getByText('I have a headache')).toBeInTheDocument();
  });

  it('sends message when Enter key is pressed', async () => {
    const mockOnSendMessage = vi.fn();
    render(<ChatInterface onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByPlaceholderText('Describe your symptoms or health concerns...');
    
    fireEvent.change(input, { target: { value: 'I feel dizzy' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith('I feel dizzy');
    });
  });

  it('shows typing indicator when loading', () => {
    render(<ChatInterface isLoading={true} />);
    
    // Check for animated dots (typing indicator)
    const dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('animate-bounce')
    );
    expect(dots).toHaveLength(3);
  });

  it('disables input and send button when loading', () => {
    render(<ChatInterface isLoading={true} />);
    
    const input = screen.getByPlaceholderText('Describe your symptoms or health concerns...');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('does not send empty messages', () => {
    const mockOnSendMessage = vi.fn();
    render(<ChatInterface onSendMessage={mockOnSendMessage} />);
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.click(sendButton);
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('displays timestamps for messages', () => {
    render(<ChatInterface />);
    
    // The initial AI message should have a timestamp
    const timeElements = screen.getAllByText(/\d{1,2}:\d{2}/);
    expect(timeElements.length).toBeGreaterThan(0);
  });
});