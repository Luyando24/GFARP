import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

// Configure multer for file uploads
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
}).single('document');

// Demo document storage (in-memory)
const demoDocuments: Record<string, any[]> = {};
// Demo file storage (in-memory) - stores actual file data
const demoFiles: Record<string, { buffer: Buffer; mimeType: string; originalName: string }> = {};

/**
 * Upload a player document (demo mode)
 */
export const handleDemoUploadPlayerDocument = async (req: Request, res: Response) => {
  try {
    const { playerId, documentType } = req.body;
    const file = req.file;

    if (!playerId || !documentType || !file) {
      return res.status(400).json({
        error: 'Missing required fields: playerId, documentType, and file'
      });
    }

    // Generate unique ID and filename
    const id = uuidv4();
    const storedFilename = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    const filePath = `player-documents/${playerId}/${documentType}/${storedFilename}`;
    
    // Store document in demo storage
    if (!demoDocuments[playerId]) {
      demoDocuments[playerId] = [];
    }
    
    // Store the actual file data
    demoFiles[id] = {
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname
    };
    
    const document = {
      id,
      documentType,
      originalFilename: file.originalname,
      storedFilename,
      filePath,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadDate: new Date().toISOString(),
      url: `/demo-files/${id}`, // Demo URL
      isActive: true
    };
    
    demoDocuments[playerId].push(document);

    res.status(201).json({
      message: 'Document uploaded successfully (Demo Mode)',
      document
    });

  } catch (error) {
    console.error('Demo upload player document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Serve a demo file by ID
 */
export const handleServeDemoFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // Get file from demo storage
    const fileData = demoFiles[fileId];
    
    if (!fileData) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate headers
    res.set({
      'Content-Type': fileData.mimeType,
      'Content-Length': fileData.buffer.length.toString(),
      'Content-Disposition': `inline; filename="${fileData.originalName}"`
    });

    // Send the file buffer
    res.send(fileData.buffer);

  } catch (error) {
    console.error('Demo serve file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get player documents (demo mode)
 */
export const handleDemoGetPlayerDocuments = async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    // Get documents from demo storage
    const documents = demoDocuments[playerId] || [];
    
    res.json({ documents });

  } catch (error) {
    console.error('Demo get player documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a player document (demo mode)
 */
export const handleDemoDeletePlayerDocument = async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    // Find and remove document from all players
    let documentFound = false;
    
    Object.keys(demoDocuments).forEach(playerId => {
      const index = demoDocuments[playerId].findIndex(doc => doc.id === documentId);
      if (index !== -1) {
        demoDocuments[playerId].splice(index, 1);
        documentFound = true;
        // Also remove the file data
        delete demoFiles[documentId];
      }
    });

    if (!documentFound) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully (Demo Mode)' });

  } catch (error) {
    console.error('Demo delete document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};