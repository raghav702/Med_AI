import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getUserFacingConfigErrors, showConfigurationHelp } from '@/lib/startup-validator';
import { getCurrentEnvironment } from '@/lib/config';

interface ConfigurationErrorProps {
  className?: string;
}

export function ConfigurationError({ className }: ConfigurationErrorProps) {
  const errors = getUserFacingConfigErrors();
  const environment = getCurrentEnvironment();
  
  if (errors.length === 0) {
    return null;
  }

  const hasBlockingErrors = errors.some(error => error.isBlocking);

  return (
    <div className={`space-y-4 ${className}`}>
      {errors.map((error, index) => (
        <Alert key={index} variant={error.isBlocking ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription className="mt-2">
            <p>{error.message}</p>
            {error.action && (
              <p className="mt-2 text-sm font-medium">{error.action}</p>
            )}
          </AlertDescription>
        </Alert>
      ))}
      
      <div className="flex flex-col sm:flex-row gap-3">
        {environment === 'development' && (
          <Button
            variant="outline"
            onClick={() => {
              showConfigurationHelp();
              console.info('💡 Check the browser console for detailed setup instructions');
            }}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Show Setup Guide
          </Button>
        )}
        
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry Configuration
        </Button>
        
        {environment === 'development' && (
          <Button
            variant="secondary"
            onClick={() => {
              // Navigate to a demo mode or show demo data
              console.info('🎭 Demo mode - some features will be limited');
            }}
            className="flex items-center gap-2"
          >
            Continue in Demo Mode
          </Button>
        )}
      </div>
      
      {!hasBlockingErrors && (
        <div className="text-sm text-muted-foreground">
          <p>
            The application will continue to work with limited functionality. 
            Some features may not be available until the configuration is fixed.
          </p>
        </div>
      )}
    </div>
  );
}

export default ConfigurationError;