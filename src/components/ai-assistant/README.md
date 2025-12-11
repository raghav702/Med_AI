# AI Medical Assistant Components

This directory contains the components for the AI Medical Assistant feature.

## Components

### ChatInterface

The main chat interface component that provides a conversational UI for users to interact with the AI medical assistant.

#### Features

- **Message Bubbles**: Distinct styling for user (blue, right-aligned) and AI (gray, left-aligned) messages
- **Typing Indicator**: Animated dots showing when the AI is processing/responding
- **Loading States**: Disables input and send button during AI processing
- **Message Input**: Text input with send button and Enter key support
- **Auto-scroll**: Automatically scrolls to show new messages
- **Timestamps**: Shows time for each message
- **Medical Disclaimer**: Includes appropriate medical disclaimers

#### Props

```typescript
interface ChatInterfaceProps {
  className?: string;
  onSendMessage?: (message: string) => void;
  isLoading?: boolean;
}
```

#### Usage

```tsx
import { ChatInterface } from '@/components/ai-assistant';

const MyComponent = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (message: string) => {
    setIsLoading(true);
    // Process message with AI
    // ...
    setIsLoading(false);
  };

  return (
    <ChatInterface 
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
    />
  );
};
```

#### Initial Message

The component starts with a default AI greeting message:
> "Hello! I'm your AI medical assistant. I can help you understand your symptoms and find the right doctor. What brings you here today?"

#### Styling

- Uses Tailwind CSS classes
- Follows the existing design system
- Responsive design with max-width constraints
- Consistent with other UI components in the project

#### Testing

Comprehensive test suite covering:
- Message rendering and display
- User input handling
- Send functionality (button and Enter key)
- Loading states and disabled states
- Typing indicator display
- Timestamp functionality

## Demo

A demo page is available at `/ai-assistant-demo` to test the chat interface functionality.

## Future Enhancements

The ChatInterface is designed to be extended with:
- AI response integration
- Doctor card display within chat
- Quick reply buttons
- Voice input/output
- Message history persistence
- Conversation context management