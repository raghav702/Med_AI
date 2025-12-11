import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import type { UserProfile, MedicalRecord } from '@/types/database';

/**
 * Hook for real-time user profile data with React Query integration
 */
export function useRealtimeUserProfileData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  /**
   * Handle user profile changes and update React Query cache
   */
  const handleUserProfileChange = useCallback(
    (profile: UserProfile, eventType: string) => {
      if (!user?.id) return;

      const queryKey = ['userProfile', user.id];

      switch (eventType) {
        case 'INSERT':
        case 'UPDATE':
          // Update the cached profile data
          queryClient.setQueryData(queryKey, profile);
          
          // Also update the profile summary if it exists
          const summaryQueryKey = ['userProfileSummary', user.id];
          queryClient.invalidateQueries({ queryKey: summaryQueryKey });
          break;
        
        case 'DELETE':
          // Remove from cache
          queryClient.removeQueries({ queryKey });
          break;
        
        default:
          // For unknown events, invalidate to refetch
          queryClient.invalidateQueries({ queryKey });
          break;
      }

      // Show notification for profile updates
      if (eventType === 'UPDATE') {
        console.log('Profile updated in real-time');
      }
    },
    [user?.id, queryClient]
  );

  const realtimeResult = useRealtime({
    enableUserProfile: true,
    enableMedicalRecords: false,
    onUserProfileChange: handleUserProfileChange,
  });

  return realtimeResult;
}

/**
 * Hook for real-time medical records data with React Query integration
 */
export function useRealtimeMedicalRecordsData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  /**
   * Handle medical record changes and update React Query cache
   */
  const handleMedicalRecordChange = useCallback(
    (record: MedicalRecord, eventType: string) => {
      if (!user?.id) return;

      // Update medical records list queries
      const listQueryKeys = [
        ['medicalRecords', user.id],
        ['medicalRecords', user.id, 'paginated'],
      ];

      switch (eventType) {
        case 'INSERT':
          // Add new record to existing lists
          listQueryKeys.forEach(queryKey => {
            queryClient.setQueryData(queryKey, (oldData: any) => {
              if (!oldData) return oldData;
              
              if (Array.isArray(oldData)) {
                // Simple array
                return [record, ...oldData];
              } else if (oldData.data && Array.isArray(oldData.data)) {
                // Paginated response
                return {
                  ...oldData,
                  data: [record, ...oldData.data],
                  count: oldData.count + 1,
                };
              }
              
              return oldData;
            });
          });

          // Update individual record cache
          queryClient.setQueryData(['medicalRecord', record.id, user.id], record);
          
          // Invalidate stats
          queryClient.invalidateQueries({ 
            queryKey: ['medicalRecordStats', user.id] 
          });
          
          console.log('New medical record added in real-time');
          break;
        
        case 'UPDATE':
          // Update record in lists
          listQueryKeys.forEach(queryKey => {
            queryClient.setQueryData(queryKey, (oldData: any) => {
              if (!oldData) return oldData;
              
              const updateRecord = (records: MedicalRecord[]) =>
                records.map(r => r.id === record.id ? record : r);
              
              if (Array.isArray(oldData)) {
                return updateRecord(oldData);
              } else if (oldData.data && Array.isArray(oldData.data)) {
                return {
                  ...oldData,
                  data: updateRecord(oldData.data),
                };
              }
              
              return oldData;
            });
          });

          // Update individual record cache
          queryClient.setQueryData(['medicalRecord', record.id, user.id], record);
          
          console.log('Medical record updated in real-time');
          break;
        
        case 'DELETE':
          // Remove record from lists
          listQueryKeys.forEach(queryKey => {
            queryClient.setQueryData(queryKey, (oldData: any) => {
              if (!oldData) return oldData;
              
              const filterRecord = (records: MedicalRecord[]) =>
                records.filter(r => r.id !== record.id);
              
              if (Array.isArray(oldData)) {
                return filterRecord(oldData);
              } else if (oldData.data && Array.isArray(oldData.data)) {
                return {
                  ...oldData,
                  data: filterRecord(oldData.data),
                  count: Math.max(0, oldData.count - 1),
                };
              }
              
              return oldData;
            });
          });

          // Remove individual record cache
          queryClient.removeQueries({ 
            queryKey: ['medicalRecord', record.id, user.id] 
          });
          
          // Invalidate stats
          queryClient.invalidateQueries({ 
            queryKey: ['medicalRecordStats', user.id] 
          });
          
          console.log('Medical record deleted in real-time');
          break;
        
        default:
          // For unknown events, invalidate all related queries
          queryClient.invalidateQueries({ 
            queryKey: ['medicalRecords', user.id] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ['medicalRecordStats', user.id] 
          });
          break;
      }
    },
    [user?.id, queryClient]
  );

  const realtimeResult = useRealtime({
    enableUserProfile: false,
    enableMedicalRecords: true,
    onMedicalRecordChange: handleMedicalRecordChange,
  });

  return realtimeResult;
}

/**
 * Hook for comprehensive real-time data management
 */
export function useRealtimeDataSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  /**
   * Handle user profile changes
   */
  const handleUserProfileChange = useCallback(
    (profile: UserProfile, eventType: string) => {
      if (!user?.id) return;

      const queryKey = ['userProfile', user.id];

      switch (eventType) {
        case 'INSERT':
        case 'UPDATE':
          queryClient.setQueryData(queryKey, profile);
          queryClient.invalidateQueries({ 
            queryKey: ['userProfileSummary', user.id] 
          });
          break;
        
        case 'DELETE':
          queryClient.removeQueries({ queryKey });
          break;
        
        default:
          queryClient.invalidateQueries({ queryKey });
          break;
      }
    },
    [user?.id, queryClient]
  );

  /**
   * Handle medical record changes
   */
  const handleMedicalRecordChange = useCallback(
    (record: MedicalRecord, eventType: string) => {
      if (!user?.id) return;

      const listQueryKeys = [
        ['medicalRecords', user.id],
        ['medicalRecords', user.id, 'paginated'],
      ];

      switch (eventType) {
        case 'INSERT':
          listQueryKeys.forEach(queryKey => {
            queryClient.setQueryData(queryKey, (oldData: any) => {
              if (!oldData) return oldData;
              
              if (Array.isArray(oldData)) {
                return [record, ...oldData];
              } else if (oldData.data && Array.isArray(oldData.data)) {
                return {
                  ...oldData,
                  data: [record, ...oldData.data],
                  count: oldData.count + 1,
                };
              }
              
              return oldData;
            });
          });

          queryClient.setQueryData(['medicalRecord', record.id, user.id], record);
          queryClient.invalidateQueries({ 
            queryKey: ['medicalRecordStats', user.id] 
          });
          break;
        
        case 'UPDATE':
          listQueryKeys.forEach(queryKey => {
            queryClient.setQueryData(queryKey, (oldData: any) => {
              if (!oldData) return oldData;
              
              const updateRecord = (records: MedicalRecord[]) =>
                records.map(r => r.id === record.id ? record : r);
              
              if (Array.isArray(oldData)) {
                return updateRecord(oldData);
              } else if (oldData.data && Array.isArray(oldData.data)) {
                return {
                  ...oldData,
                  data: updateRecord(oldData.data),
                };
              }
              
              return oldData;
            });
          });

          queryClient.setQueryData(['medicalRecord', record.id, user.id], record);
          break;
        
        case 'DELETE':
          listQueryKeys.forEach(queryKey => {
            queryClient.setQueryData(queryKey, (oldData: any) => {
              if (!oldData) return oldData;
              
              const filterRecord = (records: MedicalRecord[]) =>
                records.filter(r => r.id !== record.id);
              
              if (Array.isArray(oldData)) {
                return filterRecord(oldData);
              } else if (oldData.data && Array.isArray(oldData.data)) {
                return {
                  ...oldData,
                  data: filterRecord(oldData.data),
                  count: Math.max(0, oldData.count - 1),
                };
              }
              
              return oldData;
            });
          });

          queryClient.removeQueries({ 
            queryKey: ['medicalRecord', record.id, user.id] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ['medicalRecordStats', user.id] 
          });
          break;
        
        default:
          queryClient.invalidateQueries({ 
            queryKey: ['medicalRecords', user.id] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ['medicalRecordStats', user.id] 
          });
          break;
      }
    },
    [user?.id, queryClient]
  );

  const realtimeResult = useRealtime({
    enableUserProfile: true,
    enableMedicalRecords: true,
    onUserProfileChange: handleUserProfileChange,
    onMedicalRecordChange: handleMedicalRecordChange,
  });

  return realtimeResult;
}

/**
 * Hook for optimistic updates with real-time sync
 */
export function useOptimisticRealtime() {
  const queryClient = useQueryClient();

  /**
   * Perform optimistic update with rollback on error
   */
  const optimisticUpdate = useCallback(
    async <T>(
      queryKey: any[],
      updateFn: (oldData: T) => T,
      mutationFn: () => Promise<T>
    ) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<T>(queryKey);

      // Optimistically update
      if (previousData) {
        queryClient.setQueryData(queryKey, updateFn(previousData));
      }

      try {
        // Perform actual mutation
        const result = await mutationFn();
        
        // Update with real result
        queryClient.setQueryData(queryKey, result);
        
        return result;
      } catch (error) {
        // Rollback on error
        if (previousData) {
          queryClient.setQueryData(queryKey, previousData);
        }
        throw error;
      }
    },
    [queryClient]
  );

  return { optimisticUpdate };
}