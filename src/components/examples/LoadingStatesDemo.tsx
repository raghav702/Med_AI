import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingButton } from '@/components/ui/loading-button';
import { FileUploadWithProgress } from '@/components/ui/file-upload-with-progress';
import { LoadingStateManager, DataLoadingManager, FormLoadingManager } from '@/components/ui/loading-state-manager';
import { SuccessFeedback, useSuccessFeedback } from '@/components/ui/success-feedback';
import { MultiStepProgress, BatchProgress } from '@/components/ui/progress-indicator';
import { 
  ProfileSkeleton, 
  MedicalRecordsListSkeleton, 
  DashboardSkeleton,
  ButtonSkeleton,
  NavigationSkeleton,
  CardListSkeleton,
  SearchResultsSkeleton,
  FileUploadSkeleton
} from '@/components/ui/skeleton-loaders';
import { useNotifications } from '@/hooks/useNotifications';
import { Upload, Download, Save, Send } from 'lucide-react';

export const LoadingStatesDemo: React.FC = () => {
  const [buttonLoading, setButtonLoading] = useState(false);
  const [buttonSuccess, setButtonSuccess] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ total: 0, completed: 0, failed: 0 });
  const [multiStepProgress, setMultiStepProgress] = useState([
    { id: '1', title: 'Initialize', status: 'completed' as const },
    { id: '2', title: 'Process Data', status: 'in-progress' as const, progress: 65 },
    { id: '3', title: 'Finalize', status: 'pending' as const },
  ]);

  const { showSuccess, showError } = useNotifications();
  const { showSuccess: showSuccessFeedback, hideSuccess, show: showingSuccess } = useSuccessFeedback();

  const simulateAsyncOperation = async (duration: number = 2000) => {
    return new Promise(resolve => setTimeout(resolve, duration));
  };

  const handleButtonDemo = async () => {
    setButtonLoading(true);
    setButtonSuccess(false);
    
    try {
      await simulateAsyncOperation();
      setButtonSuccess(true);
      showSuccess('Operation completed successfully!');
      
      // Reset after showing success
      setTimeout(() => {
        setButtonSuccess(false);
      }, 3000);
    } catch (error) {
      showError('Operation failed');
    } finally {
      setButtonLoading(false);
    }
  };

  const handleDataDemo = async () => {
    setDataLoading(true);
    setDataError(null);
    
    try {
      await simulateAsyncOperation();
      // Simulate success - in real app, this would set actual data
    } catch (error) {
      setDataError('Failed to load data');
    } finally {
      setDataLoading(false);
    }
  };

  const handleFormDemo = async () => {
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(false);
    
    try {
      await simulateAsyncOperation();
      setFormSuccess(true);
      showSuccessFeedback('Form submitted successfully!', 'Your data has been saved.');
    } catch (error) {
      setFormError('Form submission failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleFileUpload = async (file: File, onProgress: (progress: number) => void) => {
    // Simulate file upload with progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      onProgress(i);
    }
    return { url: `https://example.com/files/${file.name}`, id: Date.now() };
  };

  const handleBatchDemo = async () => {
    const total = 10;
    setBatchProgress({ total, completed: 0, failed: 0 });
    
    for (let i = 0; i < total; i++) {
      await simulateAsyncOperation(300);
      
      // Simulate some failures
      const failed = Math.random() > 0.8 ? 1 : 0;
      const completed = failed ? 0 : 1;
      
      setBatchProgress(prev => ({
        ...prev,
        completed: prev.completed + completed,
        failed: prev.failed + failed
      }));
    }
  };

  const handleMultiStepDemo = async () => {
    // Reset steps
    setMultiStepProgress([
      { id: '1', title: 'Initialize', status: 'in-progress', progress: 0 },
      { id: '2', title: 'Process Data', status: 'pending' },
      { id: '3', title: 'Finalize', status: 'pending' },
    ]);

    // Step 1
    for (let i = 0; i <= 100; i += 20) {
      await simulateAsyncOperation(200);
      setMultiStepProgress(prev => prev.map(step => 
        step.id === '1' ? { ...step, progress: i } : step
      ));
    }
    
    setMultiStepProgress(prev => prev.map(step => 
      step.id === '1' ? { ...step, status: 'completed' } :
      step.id === '2' ? { ...step, status: 'in-progress', progress: 0 } : step
    ));

    // Step 2
    for (let i = 0; i <= 100; i += 25) {
      await simulateAsyncOperation(250);
      setMultiStepProgress(prev => prev.map(step => 
        step.id === '2' ? { ...step, progress: i } : step
      ));
    }
    
    setMultiStepProgress(prev => prev.map(step => 
      step.id === '2' ? { ...step, status: 'completed' } :
      step.id === '3' ? { ...step, status: 'in-progress', progress: 0 } : step
    ));

    // Step 3
    for (let i = 0; i <= 100; i += 33) {
      await simulateAsyncOperation(200);
      setMultiStepProgress(prev => prev.map(step => 
        step.id === '3' ? { ...step, progress: i } : step
      ));
    }
    
    setMultiStepProgress(prev => prev.map(step => 
      step.id === '3' ? { ...step, status: 'completed' } : step
    ));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Loading States & User Feedback Demo</h1>
        <p className="text-muted-foreground">
          Comprehensive demonstration of all loading states and user feedback components
        </p>
      </div>

      <Tabs defaultValue="buttons" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="buttons">Buttons</TabsTrigger>
          <TabsTrigger value="data">Data Loading</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="skeletons">Skeletons</TabsTrigger>
        </TabsList>

        <TabsContent value="buttons" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Loading Buttons</CardTitle>
              <CardDescription>
                Buttons with loading states, success feedback, and icons
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LoadingButton
                  loading={buttonLoading}
                  success={buttonSuccess}
                  loadingText="Processing..."
                  successText="Done!"
                  onClick={handleButtonDemo}
                  icon={<Save className="w-4 h-4" />}
                >
                  Save Data
                </LoadingButton>

                <LoadingButton
                  loading={buttonLoading}
                  loadingText="Uploading..."
                  onClick={handleButtonDemo}
                  variant="outline"
                  icon={<Upload className="w-4 h-4" />}
                >
                  Upload File
                </LoadingButton>

                <LoadingButton
                  loading={buttonLoading}
                  loadingText="Downloading..."
                  onClick={handleButtonDemo}
                  variant="secondary"
                  icon={<Download className="w-4 h-4" />}
                >
                  Download Report
                </LoadingButton>

                <LoadingButton
                  loading={buttonLoading}
                  loadingText="Sending..."
                  onClick={handleButtonDemo}
                  variant="destructive"
                  icon={<Send className="w-4 h-4" />}
                >
                  Send Message
                </LoadingButton>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Loading States</CardTitle>
              <CardDescription>
                Different loading states for data fetching scenarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex space-x-4">
                <Button onClick={handleDataDemo} disabled={dataLoading}>
                  Load Data
                </Button>
                <Button 
                  onClick={() => setDataError('Simulated error')} 
                  variant="destructive"
                >
                  Simulate Error
                </Button>
                <Button onClick={() => { setDataError(null); setDataLoading(false); }}>
                  Reset
                </Button>
              </div>

              <LoadingStateManager
                loading={dataLoading}
                error={dataError}
                onRetry={handleDataDemo}
                skeleton={<ProfileSkeleton />}
                showSkeletonOnInitialLoad={true}
              >
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-2">Sample Data</h3>
                    <p className="text-muted-foreground">
                      This is the actual content that would be displayed when data is loaded successfully.
                    </p>
                  </CardContent>
                </Card>
              </LoadingStateManager>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Loading States</CardTitle>
              <CardDescription>
                Form submission with loading overlay and feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormLoadingManager
                loading={formLoading}
                error={formError}
                success={formSuccess}
              >
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleFormDemo(); }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">First Name</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-md"
                        placeholder="Enter first name"
                        disabled={formLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Last Name</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-md"
                        placeholder="Enter last name"
                        disabled={formLoading}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input 
                      type="email" 
                      className="w-full p-2 border rounded-md"
                      placeholder="Enter email"
                      disabled={formLoading}
                    />
                  </div>
                  <LoadingButton
                    type="submit"
                    loading={formLoading}
                    success={formSuccess}
                    loadingText="Submitting..."
                    successText="Submitted!"
                  >
                    Submit Form
                  </LoadingButton>
                </form>
              </FormLoadingManager>

              <SuccessFeedback
                show={showingSuccess}
                message="Form submitted successfully!"
                description="Your information has been saved and processed."
                onClose={hideSuccess}
                variant="inline"
                className="mt-4"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Upload with Progress</CardTitle>
              <CardDescription>
                Drag and drop file upload with progress tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadWithProgress
                onUpload={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx"
                maxSize={5 * 1024 * 1024} // 5MB
                multiple={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progress Indicators</CardTitle>
              <CardDescription>
                Multi-step and batch operation progress tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium">Multi-Step Process</h4>
                  <Button onClick={handleMultiStepDemo} size="sm">
                    Start Process
                  </Button>
                </div>
                <MultiStepProgress steps={multiStepProgress} currentStep="2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium">Batch Operation</h4>
                  <Button onClick={handleBatchDemo} size="sm">
                    Start Batch
                  </Button>
                </div>
                <BatchProgress
                  total={batchProgress.total}
                  completed={batchProgress.completed}
                  failed={batchProgress.failed}
                  currentItem={batchProgress.total > 0 ? `Item ${batchProgress.completed + batchProgress.failed + 1}` : undefined}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skeletons" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skeleton Loaders</CardTitle>
              <CardDescription>
                Various skeleton loading states for better perceived performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Profile Skeleton</h4>
                  <ProfileSkeleton />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-3">Dashboard Skeleton</h4>
                  <DashboardSkeleton />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-3">Medical Records Skeleton</h4>
                  <MedicalRecordsListSkeleton count={2} />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-3">Card List Skeleton</h4>
                  <CardListSkeleton count={2} />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-3">Search Results Skeleton</h4>
                  <SearchResultsSkeleton count={3} />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-3">Navigation Skeleton</h4>
                  <NavigationSkeleton />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};