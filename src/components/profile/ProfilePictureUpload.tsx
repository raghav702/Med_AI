import React, { useState, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  Camera, 
  Upload, 
  Trash2, 
  Loader2,
  AlertCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ProfilePictureUploadProps {
  currentImageUrl?: string;
  userId: string;
  userName: string;
  onImageUpdate: (imageUrl: string | null) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentImageUrl,
  userId,
  userName,
  onImageUpdate,
  disabled = false,
  size = 'md'
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);

  // Size configurations
  const sizeConfig = {
    sm: { avatar: 'h-12 w-12', button: 'text-xs' },
    md: { avatar: 'h-20 w-20', button: 'text-sm' },
    lg: { avatar: 'h-32 w-32', button: 'text-base' }
  };

  // Get user initials for fallback
  const getUserInitials = useCallback(() => {
    if (userName) {
      const names = userName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return 'U';
  }, [userName]);

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file (JPG, PNG, GIF, WebP)';
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return 'Image size must be less than 5MB';
    }

    // Check image dimensions (optional)
    return null;
  };

  // Upload file to Supabase Storage
  const uploadToStorage = async (file: File): Promise<string> => {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `profile-pictures/${fileName}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from('user-uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: "Invalid File",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const imageUrl = await uploadToStorage(file);
      
      // Update parent component
      onImageUpdate(imageUrl);
      setPreviewUrl(imageUrl);

      toast({
        title: "Upload Successful",
        description: "Your profile picture has been updated.",
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      // Reset preview on error
      setPreviewUrl(currentImageUrl || null);
      
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove profile picture
  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    try {
      setUploading(true);

      // If the image is stored in Supabase Storage, delete it
      if (currentImageUrl.includes('supabase') && supabase) {
        // Extract file path from URL
        const urlParts = currentImageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `profile-pictures/${fileName}`;

        const { error } = await supabase.storage
          .from('user-uploads')
          .remove([filePath]);

        if (error) {
          console.warn('Failed to delete file from storage:', error);
          // Continue anyway - the database update is more important
        }
      }

      // Update parent component
      onImageUpdate(null);
      setPreviewUrl(null);

      toast({
        title: "Image Removed",
        description: "Your profile picture has been removed.",
      });

    } catch (error) {
      console.error('Remove error:', error);
      toast({
        title: "Remove Failed",
        description: "Failed to remove profile picture",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      {/* Avatar */}
      <div className="relative">
        <Avatar className={sizeConfig[size].avatar}>
          <AvatarImage 
            src={previewUrl || undefined} 
            alt={`${userName}'s profile picture`} 
          />
          <AvatarFallback className="text-lg font-semibold">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        
        {/* Loading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className={sizeConfig[size].button}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                {previewUrl ? 'Change' : 'Upload'}
              </>
            )}
          </Button>

          {previewUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemoveImage}
              disabled={disabled || uploading}
              className={`text-destructive hover:text-destructive ${sizeConfig[size].button}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          JPG, PNG, GIF or WebP. Max 5MB.
        </p>

        {/* Error state */}
        {!supabase && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            Storage not configured
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />
    </div>
  );
};