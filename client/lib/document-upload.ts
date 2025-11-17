import { Api } from './api';

// Helper functions for localStorage persistence
const STORAGE_KEY_PREFIX = 'player_documents_';

export interface DocumentUploadResult {
  success: boolean;
  document?: PlayerDocument;
  error?: string;
}

export interface PlayerDocument {
  id: string;
  documentType: 'passport_id' | 'player_photo' | 'proof_of_training' | 'birth_certificate';
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy?: string;
  fileUrl: string;
}

/**
 * Save document to localStorage
 */
const saveDocumentToLocalStorage = (playerId: string, document: PlayerDocument) => {
  try {
    const existingDocs = getDocumentsFromLocalStorage(playerId);
    // Replace any existing document of the same type with the new one
    const filtered = existingDocs.filter(doc => doc.documentType !== document.documentType);
    const updatedDocs = [...filtered, document];
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${playerId}`, JSON.stringify(updatedDocs));
  } catch (error) {
    console.error('Error saving document to localStorage:', error);
  }
};

/**
 * Get documents from localStorage
 */
const getDocumentsFromLocalStorage = (playerId: string): PlayerDocument[] => {
  try {
    const storedDocs = localStorage.getItem(`${STORAGE_KEY_PREFIX}${playerId}`);
    return storedDocs ? JSON.parse(storedDocs) : [];
  } catch (error) {
    console.error('Error retrieving documents from localStorage:', error);
    return [];
  }
};

/**
 * Remove document from localStorage
 */
const removeDocumentFromLocalStorage = (playerId: string, documentId: string) => {
  try {
    const existingDocs = getDocumentsFromLocalStorage(playerId);
    const updatedDocs = existingDocs.filter(doc => doc.id !== documentId);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${playerId}`, JSON.stringify(updatedDocs));
  } catch (error) {
    console.error('Error removing document from localStorage:', error);
  }
};

/**
 * Upload a document for a player
 */
export const uploadPlayerDocument = async (
  playerId: string,
  file: File,
  documentType: 'passport_id' | 'player_photo' | 'proof_of_training' | 'birth_certificate'
): Promise<DocumentUploadResult> => {
  try {
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size exceeds 10MB limit'
      };
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'application/pdf',
      'image/heic',
      'image/heif'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Only images and PDFs are allowed.'
      };
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('document', file);
    formData.append('playerId', playerId);
    formData.append('documentType', normalizeDocumentType(documentType));

    // Try regular endpoint first
    try {
      const response = await fetch('/api/player-documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      saveDocumentToLocalStorage(playerId, result.document);
      return {
        success: true,
        document: result.document
      };
    } catch (error) {
      console.log('Falling back to demo endpoint for document upload');
      // If regular endpoint fails, try demo endpoint
      try {
        const demoResponse = await fetch('/api/demo-player-documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!demoResponse.ok) {
          let errMsg = 'Upload failed';
          try {
            const errorData = await demoResponse.json();
            errMsg = errorData.error || errMsg;
          } catch {}
          return {
            success: false,
            error: errMsg
          };
        }

        const demoResult = await demoResponse.json();
        saveDocumentToLocalStorage(playerId, demoResult.document);
        return {
          success: true,
          document: demoResult.document
        };
      } catch (demoError) {
        return {
          success: false,
          error: 'Upload failed in both regular and demo modes'
        };
      }
    }

  } catch (error) {
    console.error('Document upload error:', error);
    return {
      success: false,
      error: 'Network error occurred during upload'
    };
  }
};

/**
 * Get all documents for a player
 */
export const getPlayerDocuments = async (
  playerId: string
): Promise<{ success: boolean; documents: PlayerDocument[] }> => {
  try {
    const cachedDocs = getDocumentsFromLocalStorage(playerId);
    
    // Always try the regular endpoint first for fresh data
    try {
      const response = await fetch(`/api/player-documents/${playerId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status}`);
      }
      
      const data = await response.json();
      const documents = data.documents || [];
      
      // Cache the documents in localStorage (replace per type)
      documents.forEach(doc => saveDocumentToLocalStorage(playerId, doc));
      
      return { success: true, documents };
    } catch (error) {
      // If regular endpoint fails, try the demo endpoint
      const demoResponse = await fetch(`/api/demo-player-documents/${playerId}`);
      
      if (!demoResponse.ok) {
        // If both API endpoints fail, return the cached documents if any
        if (cachedDocs && cachedDocs.length > 0) {
          return { success: true, documents: cachedDocs };
        }
        return { success: false, documents: [] };
      }
      
      const demoData = await demoResponse.json();
      const demoDocuments = demoData.documents || [];
      demoDocuments.forEach((doc: PlayerDocument) => saveDocumentToLocalStorage(playerId, doc));
      return { success: true, documents: demoDocuments };
    }
  } catch (error) {
    console.error('Error fetching player documents:', error);
    // Return cached documents as fallback if available
    const docs = getDocumentsFromLocalStorage(playerId);
    return { success: docs.length > 0, documents: docs };
  }
};

/**
 * Delete a player document
 */
export const deletePlayerDocument = async (
  documentId: string
): Promise<{ success: boolean }> => {
  try {
    // Extract playerId from document (needed for localStorage)
    let playerId = '';
    // Try to find the document in localStorage to get its playerId
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const pid = key.replace(STORAGE_KEY_PREFIX, '');
        const docs = getDocumentsFromLocalStorage(pid);
        const doc = docs.find(d => d.id === documentId);
        if (doc) {
          playerId = pid;
          break;
        }
      }
    }
    
    // Try regular endpoint first
    try {
      const response = await fetch(`/api/player-documents/${documentId}`, {
        method: 'DELETE'
      });
      
      // Remove from localStorage regardless of API success
      if (playerId) {
        removeDocumentFromLocalStorage(playerId, documentId);
      }
      
      if (response.ok) return { success: true };
      throw new Error(`Failed to delete document: ${response.status}`);
    } catch (error) {
      // If regular endpoint fails, try demo endpoint
      const demoResponse = await fetch(`/api/demo-player-documents/${documentId}`, {
        method: 'DELETE'
      });
      
      // Remove from localStorage regardless of API success
      if (playerId) {
        removeDocumentFromLocalStorage(playerId, documentId);
      }
      
      return { success: demoResponse.ok };
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    return { success: false };
  }
};

/**
 * Get document type display name
 */
export const getDocumentTypeDisplayName = (documentType: string): string => {
  const displayNames: Record<string, string> = {
    'passport_id': 'Passport or ID',
    'player_photo': 'Player Photo',
    'proof_of_training': 'Proof of Training',
    'birth_certificate': 'Birth Certificate'
  };
  
  return displayNames[documentType] || documentType;
};

/**
 * Check if a document type is required
 */
export const isDocumentRequired = (documentType: string): boolean => {
  const requiredTypes = ['passport_id', 'player_photo', 'proof_of_training'];
  return requiredTypes.includes(documentType);
};

const normalizeDocumentType = (docType: string): 'passport_id' | 'player_photo' | 'proof_of_training' | 'birth_certificate' => {
  const map: Record<string, 'passport_id' | 'player_photo' | 'proof_of_training' | 'birth_certificate'> = {
    passportId: 'passport_id',
    playerPhoto: 'player_photo',
    proofOfTraining: 'proof_of_training',
    birthCertificate: 'birth_certificate',
  };
  return map[docType] || 'passport_id';
};