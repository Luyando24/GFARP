import { useState, useEffect, useRef, useCallback } from 'react';

interface AutoSaveOptions<T> {
  storageKey: string;
  formData: T;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  debounceMs?: number;
  excludeKeys?: (keyof T)[];
  enabled?: boolean;
}

export interface AutoSaveReturn {
  hasRestoredDraft: boolean;
  lastSavedAt: Date | null;
  clearDraft: () => void;
  discardRestoredDraft: () => void;
}

export function useAutoSaveForm<T extends Record<string, any>>({
  storageKey,
  formData,
  setFormData,
  debounceMs = 800,
  excludeKeys = [],
  enabled = true,
}: AutoSaveOptions<T>): AutoSaveReturn {
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const isInitialMount = useRef(true);
  const originalFormDataRef = useRef<T | null>(null);

  // Sanitize helper to remove sensitive fields like passwords
  const sanitizeData = useCallback((data: T): Partial<T> => {
    if (!excludeKeys.length) return data;
    const sanitized = { ...data };
    for (const key of excludeKeys) {
      delete sanitized[key];
    }
    return sanitized;
  }, [excludeKeys]);

  // Restore draft on initial mount
  useEffect(() => {
    if (!enabled || !storageKey) return;

    try {
      const savedRaw = localStorage.getItem(storageKey);
      if (savedRaw) {
        const savedData = JSON.parse(savedRaw);
        if (savedData && typeof savedData === 'object' && Object.keys(savedData).length > 0) {
          originalFormDataRef.current = formData;
          setFormData(prev => {
            // Merge saved data over initial/fetched form data
            return typeof prev === 'object' && prev !== null
              ? { ...prev, ...savedData }
              : savedData;
          });
          setHasRestoredDraft(true);
        }
      }
    } catch (err) {
      console.warn(`[AutoSave] Failed to restore draft for key "${storageKey}":`, err);
    }
  }, [storageKey, enabled]);

  // Debounced auto-save on formData changes
  useEffect(() => {
    if (!enabled || !storageKey) return;

    // Skip saving on the very first mount cycle to allow restoration first
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      try {
        const toSave = sanitizeData(formData);
        // Only save if there is data
        if (toSave && Object.keys(toSave).length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(toSave));
          setLastSavedAt(new Date());
        }
      } catch (err) {
        console.warn(`[AutoSave] Failed to save draft for key "${storageKey}":`, err);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [formData, storageKey, debounceMs, enabled, sanitizeData]);

  const clearDraft = useCallback(() => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
      setHasRestoredDraft(false);
      setLastSavedAt(null);
    } catch (err) {
      console.warn(`[AutoSave] Failed to clear draft for key "${storageKey}":`, err);
    }
  }, [storageKey]);

  const discardRestoredDraft = useCallback(() => {
    if (originalFormDataRef.current) {
      setFormData(originalFormDataRef.current);
    }
    clearDraft();
  }, [clearDraft, setFormData]);

  return {
    hasRestoredDraft,
    lastSavedAt,
    clearDraft,
    discardRestoredDraft,
  };
}
