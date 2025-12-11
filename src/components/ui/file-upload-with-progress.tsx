import React, { useState, useCallback } from 'react';
import { Button } from './button';
import { Progress } from './progress';
import { Card, CardContent } from './card';
import { useFileUpload } from '@/hooks/useLoadingState';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Image as ImageIcon,
  FileVideo,
  Music
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadWithProgressProps {
  onUpload: (file: File, onProgress: (progress: number) => void) => Promise<any>;
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  result?: any;
  error?: string;
  id: string;
}

export const FileUploadWithProgress: React.FC<FileUploadWithProgressProps> = ({
  onUpload,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  className,
  disabled = false,
  children
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileUpload = useFileUpload();
  const { showError, showUploadSuccess } = useNotifications();

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (type.startsWith('video/')) return <FileVideo className="w-4 h-4" />;
    if (type.startsWith('audio/')) return <Music className="w-4 h-4" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)} limit`;
    }
    return null;
  };

  const handleFileUpload = useCallback(async (files: FileList) => {
    const filesToUpload = Array.from(files);
    
    for (const file of filesToUpload) {
      const validationError = validateFile(file);
      if (validationError) {
        showError(validationError);
        continue;
      }

      const fileId = `${file.name}-${Date.now()}-${Math.random()}`;
      const uploadingFile: UploadingFile = {
        file,
        progress: 0,
        status: 'uploading',
        id: fileId
      };

      setUploadingFiles(prev => [...prev, uploadingFile]);

      try {
        const result = await fileUpload.uploadFile(
          file,
          onUpload,
          {
            onSuccess: (result) => {
              setUploadingFiles(prev => 
                prev.map(f => 
                  f.id === fileId 
                    ? { ...f, status: 'completed' as const, result, progress: 100 }
                    : f
                )
              );
              showUploadSuccess(file.name);
            },
            onError: (error) => {
              setUploadingFiles(prev => 
                prev.map(f => 
                  f.id === fileId 
                    ? { ...f, status: 'error' as const, error: error.message }
                    : f
                )
              );
            }
          }
        );
      } catch (error) {
        // Error handling is done in the onError callback above
      }
    }
  }, [onUpload, fileUpload, maxSize, showError, showUploadSuccess]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFileUpload]);

  const removeFile = useCallback((fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const clearCompleted = useCallback(() => {
    setUploadingFiles(prev => prev.filter(f => f.status !== 'completed'));
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          dragOver && !disabled ? 'border-primary bg-primary/5' : 'border-border',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'
        )}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
          id="file-upload"
        />
        
        {children || (
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum file size: {formatFileSize(maxSize)}
            </p>
          </label>
        )}
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">
                Uploading {uploadingFiles.length} file{uploadingFiles.length > 1 ? 's' : ''}
              </h4>
              {uploadingFiles.some(f => f.status === 'completed') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCompleted}
                  className="text-xs"
                >
                  Clear completed
                </Button>
              )}
            </div>
            
            <div className="space-y-3">
              {uploadingFiles.map((uploadingFile) => (
                <div key={uploadingFile.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {getFileIcon(uploadingFile.file)}
                      <span className="text-sm font-medium truncate">
                        {uploadingFile.file.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({formatFileSize(uploadingFile.file.size)})
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {uploadingFile.status === 'uploading' && (
                        <span className="text-xs text-muted-foreground">
                          {uploadingFile.progress}%
                        </span>
                      )}
                      
                      {uploadingFile.status === 'completed' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      
                      {uploadingFile.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadingFile.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {uploadingFile.status === 'uploading' && (
                    <Progress value={uploadingFile.progress} className="h-2" />
                  )}
                  
                  {uploadingFile.status === 'error' && uploadingFile.error && (
                    <p className="text-xs text-red-600">{uploadingFile.error}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};