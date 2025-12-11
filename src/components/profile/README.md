# User Profile Management Components

This directory contains React components for managing user profiles in the medical application. The components provide a complete solution for displaying, editing, and managing user profile information including personal details, medical conditions, allergies, and medications.

## Components Overview

### 1. UserProfile
The main component that displays user profile information with edit capabilities.

**Features:**
- Displays user personal information (name, phone, emergency contact)
- Shows medical information (conditions, allergies, medications)
- Handles loading and error states
- Provides edit mode toggle
- Shows create profile CTA for new users

**Usage:**
```tsx
import { UserProfile } from '@/components/profile';

function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <UserProfile />
    </div>
  );
}
```

### 2. ProfileEditForm
A comprehensive form component for editing user profile information.

**Features:**
- Form validation for all fields
- Dynamic arrays for medical conditions, allergies, and medications
- Profile picture upload integration
- Loading states and error handling
- Supports both create and update operations

**Usage:**
```tsx
import { ProfileEditForm } from '@/components/profile';

function EditProfile() {
  const handleSave = async (data: UpdateUserProfile) => {
    // Handle profile save
    await databaseService.updateUserProfile(userId, data);
  };

  return (
    <ProfileEditForm
      profile={existingProfile}
      onSave={handleSave}
      onCancel={() => setEditing(false)}
    />
  );
}
```

### 3. ProfilePictureUpload
A specialized component for handling profile picture uploads.

**Features:**
- File validation (type, size)
- Image preview
- Upload to Supabase Storage
- Remove image functionality
- Multiple size options (sm, md, lg)
- Loading states and error handling

**Usage:**
```tsx
import { ProfilePictureUpload } from '@/components/profile';

function ProfilePicture() {
  const handleImageUpdate = (imageUrl: string | null) => {
    // Handle image URL update
    console.log('New image URL:', imageUrl);
  };

  return (
    <ProfilePictureUpload
      currentImageUrl={currentImage}
      userId={user.id}
      userName={user.name}
      onImageUpdate={handleImageUpdate}
      size="lg"
    />
  );
}
```

## Data Types

The components work with the following TypeScript interfaces:

```typescript
interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  phone_number?: string;
  emergency_contact?: string;
  medical_conditions?: string[];
  allergies?: string[];
  medications?: string[];
  created_at: string;
  updated_at: string;
}

interface UpdateUserProfile {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  phone_number?: string;
  emergency_contact?: string;
  medical_conditions?: string[];
  allergies?: string[];
  medications?: string[];
}
```

## Dependencies

The components require the following dependencies:

- **React 18+** - Core React functionality
- **@/contexts/AuthContext** - Authentication context for user information
- **@/services/database** - Database service for CRUD operations
- **@/components/ui/** - shadcn/ui components (Button, Input, Card, etc.)
- **@/lib/supabase** - Supabase client for file uploads
- **lucide-react** - Icons
- **react-router-dom** - Navigation (for redirects)

## Features

### Form Validation
- Required field validation
- Phone number format validation
- Email format validation (inherited from auth)
- File type and size validation for images

### Medical Information Management
- Dynamic addition/removal of medical conditions
- Allergy management with warning indicators
- Current medications tracking
- Visual badges for different types of medical information

### File Upload
- Profile picture upload to Supabase Storage
- Image preview before upload
- File type validation (JPG, PNG, GIF, WebP)
- File size validation (5MB limit)
- Error handling for upload failures

### User Experience
- Loading states for all async operations
- Error boundaries and graceful error handling
- Responsive design for mobile and desktop
- Accessibility features (ARIA labels, keyboard navigation)
- Toast notifications for user feedback

## Integration Examples

### Basic Integration
```tsx
// Simple profile page
import { UserProfile } from '@/components/profile';

export function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <UserProfile />
    </div>
  );
}
```

### With React Query
```tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { ProfileEditForm } from '@/components/profile';

export function ProfileWithQuery() {
  const { data: profile } = useQuery({
    queryKey: ['profile', user.id],
    queryFn: () => databaseService.getUserProfile(user.id)
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserProfile) => 
      databaseService.updateUserProfile(user.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['profile', user.id]);
    }
  });

  return (
    <ProfileEditForm
      profile={profile}
      onSave={updateMutation.mutate}
      onCancel={() => setEditing(false)}
    />
  );
}
```

### Custom Styling
```tsx
// With custom CSS classes
<UserProfile className="max-w-2xl mx-auto shadow-lg" />

// With custom styling
<ProfileEditForm
  profile={profile}
  onSave={handleSave}
  onCancel={handleCancel}
  // The form automatically inherits your theme colors
/>
```

## Error Handling

The components handle various error scenarios:

- **Network errors** - Displays user-friendly messages
- **Validation errors** - Shows field-specific error messages
- **Authentication errors** - Redirects to login when needed
- **Database errors** - Graceful degradation with retry options
- **File upload errors** - Clear feedback on upload failures

## Accessibility

The components follow accessibility best practices:

- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility
- High contrast color schemes
- Focus management

## Testing

The components include comprehensive tests:

```bash
# Run profile component tests
npm run test src/components/profile

# Run specific test file
npm run test src/components/profile/__tests__/UserProfile.test.tsx
```

Test coverage includes:
- Component rendering
- User interactions
- Error states
- Loading states
- Form validation
- API integration

## Customization

### Theming
The components use CSS custom properties and can be themed using your design system:

```css
:root {
  --primary: your-primary-color;
  --secondary: your-secondary-color;
  --destructive: your-error-color;
  /* etc. */
}
```

### Custom Fields
To add custom fields to the profile form:

1. Update the `UserProfile` and `UpdateUserProfile` types
2. Add the field to the database schema
3. Update the `ProfileEditForm` component
4. Add validation logic if needed

### Custom Validation
```tsx
const customValidation = (data: UpdateUserProfile) => {
  const errors: Record<string, string> = {};
  
  if (data.phone_number && !isValidPhoneNumber(data.phone_number)) {
    errors.phone_number = 'Please enter a valid phone number';
  }
  
  return errors;
};
```

## Performance Considerations

- Components use React.memo for optimization where appropriate
- Large lists (medical conditions, etc.) are virtualized if needed
- Images are optimized and compressed before upload
- Database queries are cached using React Query
- Lazy loading for non-critical components

## Security

- All user inputs are sanitized
- File uploads are validated on both client and server
- Profile data is protected by Row Level Security (RLS)
- Images are stored in secure Supabase Storage buckets
- Authentication is required for all operations

## Browser Support

The components support all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

When contributing to these components:

1. Follow the existing code style
2. Add tests for new functionality
3. Update documentation
4. Ensure accessibility compliance
5. Test on multiple devices and browsers

## Troubleshooting

### Common Issues

**Profile not loading:**
- Check authentication status
- Verify database connection
- Check browser console for errors

**Image upload failing:**
- Verify Supabase Storage configuration
- Check file size and type
- Ensure proper permissions

**Form validation errors:**
- Check required field validation
- Verify data types match schema
- Review custom validation logic

### Debug Mode
Enable debug logging:
```tsx
// Add to your app's root
if (process.env.NODE_ENV === 'development') {
  window.DEBUG_PROFILE = true;
}
```

## License

These components are part of the medical application and follow the same license terms.