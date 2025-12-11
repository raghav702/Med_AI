import React from 'react';
import { Progress } from './progress';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress?: number;
  errorMessage?: string;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  className?: string;
  showProgress?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  className,
  showProgress = true,
  orientation = 'vertical'
}) => {
  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'in-progress':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />;
    }
  };

  const getStepColor = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'in-progress':
        return 'text-blue-600';
      default:
        return 'text-muted-foreground';
    }
  };

  if (orientation === 'horizontal') {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center space-y-2">
                {getStepIcon(step)}
                <span className={cn('text-sm font-medium', getStepColor(step))}>
                  {step.label}
                </span>
                {step.status === 'in-progress' && showProgress && step.progress !== undefined && (
                  <div className="w-20">
                    <Progress value={step.progress} className="h-2" />
                    <span className="text-xs text-muted-foreground">{step.progress}%</span>
                  </div>
                )}
                {step.status === 'error' && step.errorMessage && (
                  <span className="text-xs text-red-600 text-center max-w-20">
                    {step.errorMessage}
                  </span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-px bg-border mx-4" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-start space-x-3">
          <div className="flex flex-col items-center">
            {getStepIcon(step)}
            {index < steps.length - 1 && (
              <div className="w-px h-8 bg-border mt-2" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className={cn('font-medium', getStepColor(step))}>
                {step.label}
              </span>
              {step.status === 'in-progress' && step.progress !== undefined && (
                <span className="text-sm text-muted-foreground">
                  {step.progress}%
                </span>
              )}
            </div>
            {step.status === 'in-progress' && showProgress && step.progress !== undefined && (
              <Progress value={step.progress} className="h-2" />
            )}
            {step.status === 'error' && step.errorMessage && (
              <p className="text-sm text-red-600">{step.errorMessage}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Simple file upload progress component
interface FileUploadProgressProps {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  errorMessage?: string;
  onCancel?: () => void;
  className?: string;
}

export const FileUploadProgress: React.FC<FileUploadProgressProps> = ({
  fileName,
  progress,
  status,
  errorMessage,
  onCancel,
  className
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium truncate flex-1 mr-2">
          {fileName}
        </span>
        <div className="flex items-center space-x-2">
          {status === 'uploading' && (
            <>
              <span className="text-sm text-muted-foreground">{progress}%</span>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              )}
            </>
          )}
          {status === 'completed' && (
            <CheckCircle className="w-4 h-4 text-green-600" />
          )}
          {status === 'error' && (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
        </div>
      </div>
      
      {status === 'uploading' && (
        <Progress value={progress} className="h-2" />
      )}
      
      {status === 'error' && errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
};

// Multi-step operation progress
interface MultiStepProgressProps {
  steps: Array<{
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
    progress?: number;
  }>;
  currentStep?: string;
  className?: string;
}

export const MultiStepProgress: React.FC<MultiStepProgressProps> = ({
  steps,
  currentStep,
  className
}) => {
  const currentStepIndex = currentStep ? steps.findIndex(s => s.id === currentStep) : -1;
  
  return (
    <div className={cn('space-y-4', className)}>
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.status === 'completed';
        const isError = step.status === 'error';
        const isPending = step.status === 'pending';
        
        return (
          <div key={step.id} className="flex items-start space-x-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                isCompleted && 'bg-green-100 text-green-700',
                isError && 'bg-red-100 text-red-700',
                isActive && 'bg-blue-100 text-blue-700',
                isPending && 'bg-gray-100 text-gray-500'
              )}>
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : isError ? (
                  <AlertCircle className="w-4 h-4" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  'w-px h-8 mt-2',
                  index < currentStepIndex ? 'bg-green-300' : 'bg-gray-200'
                )} />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className={cn(
                'text-sm font-medium',
                isCompleted && 'text-green-700',
                isError && 'text-red-700',
                isActive && 'text-blue-700',
                isPending && 'text-gray-500'
              )}>
                {step.title}
              </h4>
              
              {step.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {step.description}
                </p>
              )}
              
              {isActive && step.progress !== undefined && (
                <div className="mt-2">
                  <Progress value={step.progress} className="h-1" />
                  <span className="text-xs text-muted-foreground">
                    {step.progress}%
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Batch operation progress
interface BatchProgressProps {
  total: number;
  completed: number;
  failed: number;
  currentItem?: string;
  className?: string;
}

export const BatchProgress: React.FC<BatchProgressProps> = ({
  total,
  completed,
  failed,
  currentItem,
  className
}) => {
  const progress = total > 0 ? ((completed + failed) / total) * 100 : 0;
  const remaining = total - completed - failed;
  
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Processing {total} items
        </span>
        <span className="text-sm text-muted-foreground">
          {completed + failed} of {total}
        </span>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-4">
          <span className="text-green-600">
            ✓ {completed} completed
          </span>
          {failed > 0 && (
            <span className="text-red-600">
              ✗ {failed} failed
            </span>
          )}
          {remaining > 0 && (
            <span className="text-muted-foreground">
              {remaining} remaining
            </span>
          )}
        </div>
      </div>
      
      {currentItem && (
        <p className="text-xs text-muted-foreground">
          Currently processing: {currentItem}
        </p>
      )}
    </div>
  );
};