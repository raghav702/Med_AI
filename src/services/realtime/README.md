# Real-time Features Documentation

This document describes the real-time features implementation using Supabase subscriptions.

## Overview

The real-time system provides live updates for user profiles and medical records, ensuring that data changes are immediately reflected across all connected clients. The implementation includes connection management, error handling, retry logic, and fallback mechanisms.

## Architecture

### Core Components

1. **RealtimeService** (`src/services/realtime.ts`)
   - Manages Supabase real-time subscriptions
   - Handles connection status and retry logic
   - Provides subscription lifecycle management

2. **React Hooks** (`src/hooks/useRealtime.ts`)
   - `useRealtime()` - Main hook for real-time subscriptions
   - `useRealtimeUserProfile()` - Specialized hook for user profile updates
   - `useRealtimeMedicalRecords()` - Specialized hook for medical record updates
   - `useRealtimeConnectionStatus()` - Connection status monitoring

3. **Data Integration** (`src/hooks/useRealtimeData.ts`)
   - Integrates real-time updates with React Query cache
   - Provides optimistic updates functionality
   - Handles data synchronization

4. **UI Components** (`src/components/realtime/`)
   - `ConnectionStatus` - Visual connection status indicator
   - `RealtimeFallback` - Fallback UI for offline scenarios
   - Connection quality indicators

5. **Context Provider** (`src/contexts/RealtimeContext.tsx`)
   - Application-wide real-time state management
   - Event handler registration
   - Connection management

## Usage

### Basic Setup

1. **Wrap your app with RealtimeProvider:**

```tsx
import { RealtimeProvider } from '@/contexts/RealtimeContext';

function App() {
  return (
    <RealtimeProvider>
      {/* Your app components */}
    </RealtimeProvider>
  );
}
```

2. **Use real-time hooks in components:**

```tsx
import { useRealtimeDataSync } from '@/hooks/useRealtimeData';

function MyComponent() {
  const { isConnected, connectionStatus } = useRealtimeDataSync();
  
  return (
    <div>
      Status: {connectionStatus}
      {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  );
}
```

### Advanced Usage

#### Custom Event Handlers

```tsx
import { useRealtime } from '@/hooks/useRealtime';

function ProfileComponent() {
  const { isConnected } = useRealtime({
    enableUserProfile: true,
    enableMedicalRecords: false,
    onUserProfileChange: (profile, eventType) => {
      console.log('Profile updated:', profile, eventType);
      // Handle profile change
    },
    onConnectionStatusChange: (status) => {
      console.log('Connection status:', status);
    }
  });
  
  return <div>Profile component</div>;
}
```

#### React Query Integration

```tsx
import { useRealtimeUserProfileData } from '@/hooks/useRealtimeData';
import { useQuery } from '@tanstack/react-query';

function UserProfile() {
  // This hook automatically updates React Query cache
  useRealtimeUserProfileData();
  
  const { data: profile } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => databaseService.getUserProfile(userId)
  });
  
  return <div>{profile?.first_name}</div>;
}
```

### Connection Status UI

```tsx
import { ConnectionStatus, RealtimeFallback } from '@/components/realtime';

function Dashboard() {
  return (
    <div>
      <header>
        <ConnectionStatus showText size="sm" />
      </header>
      
      <main>
        <RealtimeFallback 
          enablePolling 
          pollingInterval={30000}
          showRefreshButton 
        />
        {/* Your content */}
      </main>
    </div>
  );
}
```

## Configuration

### Environment Variables

The real-time features use the same Supabase configuration as the rest of the application:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Subscription Options

```tsx
interface SubscriptionConfig {
  userId: string;
  onUserProfileChange?: UserProfileChangeCallback;
  onMedicalRecordChange?: MedicalRecordChangeCallback;
  onConnectionStatusChange?: ConnectionStatusCallback;
  enableRetry?: boolean;        // Default: true
  retryInterval?: number;       // Default: 5000ms
  maxRetries?: number;          // Default: 3
}
```

### Provider Options

```tsx
<RealtimeProvider
  autoConnect={true}           // Auto-connect when user is available
  enableRetry={true}           // Enable retry on connection failures
  retryInterval={5000}         // Retry interval in milliseconds
  maxRetries={3}               // Maximum retry attempts
>
  {children}
</RealtimeProvider>
```

## Database Setup

### Row Level Security (RLS) Policies

Ensure your Supabase database has proper RLS policies:

```sql
-- User profiles policy
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Medical records policy
CREATE POLICY "Users can view own records" ON medical_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records" ON medical_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records" ON medical_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records" ON medical_records
  FOR DELETE USING (auth.uid() = user_id);
```

### Real-time Configuration

Enable real-time for your tables in Supabase:

```sql
-- Enable real-time for user_profiles
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;

-- Enable real-time for medical_records
ALTER PUBLICATION supabase_realtime ADD TABLE medical_records;
```

## Error Handling

### Connection Errors

The system handles various connection scenarios:

- **Network disconnection**: Automatic retry with exponential backoff
- **Supabase service issues**: Fallback to polling mode
- **Authentication errors**: Automatic re-authentication
- **Rate limiting**: Respect rate limits and retry appropriately

### Error Recovery

```tsx
import { useRealtime } from '@/hooks/useRealtime';

function MyComponent() {
  const { hasError, reconnect } = useRealtime();
  
  if (hasError) {
    return (
      <div>
        <p>Connection error occurred</p>
        <button onClick={reconnect}>Retry Connection</button>
      </div>
    );
  }
  
  return <div>Normal content</div>;
}
```

## Performance Considerations

### Subscription Management

- Only subscribe to data you need
- Unsubscribe when components unmount
- Use specific filters to reduce data transfer

### Caching Strategy

- Real-time updates integrate with React Query cache
- Optimistic updates for better UX
- Automatic cache invalidation on data changes

### Network Optimization

- Connection pooling through Supabase client
- Efficient payload sizes with selective subscriptions
- Automatic reconnection with backoff strategy

## Testing

### Unit Tests

```bash
npm test src/services/__tests__/realtime.test.ts
npm test src/hooks/__tests__/useRealtime.test.tsx
```

### Integration Testing

Use the `RealtimeExample` component to test real-time features:

1. Open the example component
2. Make changes to user profile or medical records
3. Observe real-time updates
4. Test connection scenarios (disconnect/reconnect)

### Manual Testing Scenarios

1. **Basic Functionality**
   - Subscribe to updates
   - Make data changes
   - Verify real-time updates

2. **Connection Issues**
   - Disconnect network
   - Verify fallback behavior
   - Reconnect and verify recovery

3. **Multiple Clients**
   - Open app in multiple tabs/devices
   - Make changes in one client
   - Verify updates in other clients

4. **Error Scenarios**
   - Invalid authentication
   - Network timeouts
   - Service unavailability

## Troubleshooting

### Common Issues

1. **Real-time not working**
   - Check Supabase configuration
   - Verify RLS policies
   - Ensure real-time is enabled for tables

2. **Connection keeps dropping**
   - Check network stability
   - Verify Supabase service status
   - Review retry configuration

3. **Updates not appearing**
   - Check user authentication
   - Verify subscription filters
   - Review database permissions

### Debug Mode

Enable debug logging:

```tsx
// In development, the service logs connection events
console.log('Real-time connection status:', connectionStatus);
```

### Monitoring

Monitor real-time performance:

- Connection status indicators
- Update frequency metrics
- Error rate tracking
- Network quality assessment

## Best Practices

1. **Subscription Lifecycle**
   - Subscribe only when needed
   - Clean up subscriptions properly
   - Handle component unmounting

2. **Error Handling**
   - Always handle connection errors
   - Provide fallback UI
   - Implement retry logic

3. **Performance**
   - Use specific subscription filters
   - Batch updates when possible
   - Optimize re-render frequency

4. **User Experience**
   - Show connection status
   - Provide manual refresh options
   - Handle offline scenarios gracefully

5. **Security**
   - Implement proper RLS policies
   - Validate user permissions
   - Sanitize real-time data

## Future Enhancements

Potential improvements for the real-time system:

1. **Advanced Filtering**
   - More granular subscription filters
   - Dynamic filter updates
   - Complex query support

2. **Conflict Resolution**
   - Automatic conflict detection
   - Merge strategies for concurrent updates
   - User-guided conflict resolution

3. **Offline Support**
   - Local data persistence
   - Sync queue for offline changes
   - Conflict resolution on reconnection

4. **Performance Monitoring**
   - Real-time metrics dashboard
   - Connection quality analytics
   - Performance optimization suggestions

5. **Advanced Features**
   - Presence indicators (who's online)
   - Collaborative editing
   - Real-time notifications