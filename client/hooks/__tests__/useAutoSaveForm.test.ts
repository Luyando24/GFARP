import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useState } from 'react';
import { useAutoSaveForm } from '../useAutoSaveForm';

const createMemoryStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, String(value)); },
  };
};

describe('useAutoSaveForm hook', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
    vi.useFakeTimers();
  });

  it('restores draft from localStorage on mount', () => {
    const draftData = { bio: 'Restored bio text', position: 'Midfielder' };
    localStorage.setItem('test_form_key', JSON.stringify(draftData));

    const { result } = renderHook(() => {
      const [formData, setFormData] = useState({ bio: '', position: '' });
      const autoSave = useAutoSaveForm({
        storageKey: 'test_form_key',
        formData,
        setFormData,
      });
      return { formData, autoSave };
    });

    expect(result.current.formData.bio).toBe('Restored bio text');
    expect(result.current.formData.position).toBe('Midfielder');
    expect(result.current.autoSave.hasRestoredDraft).toBe(true);
  });

  it('saves formData to localStorage after debounce timer', () => {
    const { result } = renderHook(() => {
      const [formData, setFormData] = useState({ name: 'John' });
      const autoSave = useAutoSaveForm({
        storageKey: 'test_save_key',
        formData,
        setFormData,
        debounceMs: 500,
      });
      return { formData, setFormData, autoSave };
    });

    act(() => {
      result.current.setFormData({ name: 'John Doe' });
    });

    // Before timer fires, localStorage is empty
    expect(localStorage.getItem('test_save_key')).toBeNull();

    // Advance timer past 500ms
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(localStorage.getItem('test_save_key')).toBe(JSON.stringify({ name: 'John Doe' }));
  });

  it('excludes sensitive keys specified in excludeKeys option', () => {
    const { result } = renderHook(() => {
      const [formData, setFormData] = useState({ email: 'user@test.com', password: 'secretpassword' });
      const autoSave = useAutoSaveForm({
        storageKey: 'test_exclude_key',
        formData,
        setFormData,
        excludeKeys: ['password'],
        debounceMs: 300,
      });
      return { setFormData, autoSave };
    });

    act(() => {
      result.current.setFormData({ email: 'user@test.com', password: 'updatedpassword' });
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    const saved = JSON.parse(localStorage.getItem('test_exclude_key') || '{}');
    expect(saved.email).toBe('user@test.com');
    expect(saved.password).toBeUndefined();
  });

  it('clears draft when clearDraft is called', () => {
    localStorage.setItem('test_clear_key', JSON.stringify({ bio: 'Saved' }));

    const { result } = renderHook(() => {
      const [formData, setFormData] = useState({ bio: 'Saved' });
      const autoSave = useAutoSaveForm({
        storageKey: 'test_clear_key',
        formData,
        setFormData,
      });
      return { autoSave };
    });

    act(() => {
      result.current.autoSave.clearDraft();
    });

    expect(localStorage.getItem('test_clear_key')).toBeNull();
    expect(result.current.autoSave.hasRestoredDraft).toBe(false);
  });
});
