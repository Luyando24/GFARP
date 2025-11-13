import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  FileText,
  Plus,
  X,
  Calendar,
  Save,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Api } from '@/lib/api';

interface ComplianceDocument {
  id: string;
  compliance_id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  expiry_date?: string;
  status: 'active' | 'expired' | 'review_needed';
  description?: string;
}

interface ComplianceDocumentsProps {
  onBack: () => void;
}

const ComplianceDocuments: React.FC<ComplianceDocumentsProps> = ({ onBack }) => {
  console.log('ComplianceDocuments component is rendering');
  
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingDocument, setEditingDocument] = useState<ComplianceDocument | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [newDocument, setNewDocument] = useState({
    document_name: "",
    document_type: "",
    description: "",
    expiry_date: ""
  });

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await Api.getFifaComplianceDocuments();
      if (response.success) {
        setDocuments(response.data);
      } else {
        setError('Failed to load compliance documents');
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Failed to load compliance documents');
    } finally {
      setLoading(false);
    }
  };

  const documentTypes = ["Manual", "Forms", "Guidelines", "Policy", "Handbook", "Certificate", "Report"];

  // Required FIFA compliance documents that must always be present
  const requiredDocuments = [
    {
      id: 'req-1',
      document_name: 'FIFA Statutes and Regulations',
      document_type: 'Manual',
      description: 'Official FIFA statutes and regulations document',
      required: true
    },
    {
      id: 'req-2', 
      document_name: 'Player Registration System Manual',
      document_type: 'Manual',
      description: 'Guidelines for player registration and transfer procedures',
      required: true
    },
    {
      id: 'req-3',
      document_name: 'Anti-Doping Policy',
      document_type: 'Policy',
      description: 'FIFA anti-doping regulations and procedures',
      required: true
    },
    {
      id: 'req-4',
      document_name: 'Financial Fair Play Guidelines',
      document_type: 'Guidelines',
      description: 'Financial regulations and compliance requirements',
      required: true
    },
    {
      id: 'req-5',
      document_name: 'Referee Guidelines and Laws',
      document_type: 'Guidelines', 
      description: 'Official laws of the game and referee guidelines',
      required: true
    },
    {
      id: 'req-6',
      document_name: 'Stadium Safety and Security Standards',
      document_type: 'Guidelines',
      description: 'Safety and security requirements for football stadiums',
      required: true
    },
    {
      id: 'req-7',
      document_name: 'Medical Regulations',
      document_type: 'Guidelines',
      description: 'Medical examination and health requirements',
      required: true
    },
    {
      id: 'req-8',
      document_name: 'Disciplinary Code',
      document_type: 'Manual',
      description: 'FIFA disciplinary procedures and sanctions',
      required: true
    }
  ];

  // Merge required documents with existing documents
  const allDocuments = React.useMemo(() => {
    const existingIds = documents.map(doc => doc.id);
    const missingRequired = requiredDocuments.filter(req => !existingIds.includes(req.id));
    
    return [
      ...documents,
      ...missingRequired.map(req => ({
        ...req,
        compliance_id: '',
        file_path: '',
        file_size: 0,
        uploaded_by: '',
        uploaded_at: '',
        status: 'review_needed' as const
      }))
    ];
  }, [documents]);

  const filteredDocuments = allDocuments.filter(doc => {
    const matchesSearch = doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === "all" || doc.document_type === filterCategory;
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>;
      case 'review_needed':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Review Needed</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getVerificationBadge = (document: ComplianceDocument) => {
    // Mock verification logic - in real app this would come from backend
    const isVerified = document.status === 'active' && document.file_size > 0;
    const isPending = document.status === 'review_needed';
    
    if (isVerified) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Verified
      </Badge>;
    } else if (isPending) {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>;
    } else {
      return <Badge variant="outline" className="text-slate-600">
        <XCircle className="h-3 w-3 mr-1" />
        Not Verified
      </Badge>;
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      try {
        const response = await Api.deleteFifaComplianceDocument(documentId);
        if (response.success) {
          setDocuments(documents.filter(doc => doc.id !== documentId));
        } else {
          setError('Failed to delete document');
        }
      } catch (err) {
        console.error('Error deleting document:', err);
        setError('Failed to delete document');
      }
    }
  };

  const handleUploadDocument = async () => {
    if (newDocument.document_name && newDocument.document_type && selectedFile) {
      try {
        // In a real app, you would upload the file first and get the file path and size
        const documentData = {
          document_name: newDocument.document_name,
          document_type: newDocument.document_type,
          description: newDocument.description,
          expiry_date: newDocument.expiry_date || null,
          file_path: `/uploads/${selectedFile.name}`,
          file_size: selectedFile.size,
          uploaded_by: 'Current User', // This would come from auth context
          status: 'active' as const
        };

        const response = await Api.createFifaComplianceDocument(documentData);
        if (response.success) {
          await loadDocuments(); // Reload documents
          // Reset form
          setNewDocument({ document_name: "", document_type: "", description: "", expiry_date: "" });
          setSelectedFile(null);
        } else {
          setError('Failed to upload document');
        }
      } catch (err) {
        console.error('Error uploading document:', err);
        setError('Failed to upload document');
      }
    }
  };

  const handleEditDocument = (document: ComplianceDocument) => {
    setEditingDocument(document);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, document: ComplianceDocument) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_id', document.id.toString());
      formData.append('document_name', document.document_name);
      formData.append('document_type', document.document_type);

      // Update the document with file information
      const documentData = {
        document_name: document.document_name,
        document_type: document.document_type,
        description: document.description || '',
        expiry_date: document.expiry_date || null,
        file_path: `/uploads/${file.name}`,
        file_size: file.size,
        uploaded_by: 'Current User',
        status: 'active' as const
      };

      const response = await Api.updateFifaComplianceDocument(document.id, documentData);
      if (response.success) {
        await loadDocuments(); // Reload documents
      } else {
        setError('Failed to upload document');
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      setError('Failed to upload document');
    }

    // Reset the input
    event.target.value = '';
  };

  const handleSaveEdit = async () => {
    if (editingDocument) {
      try {
        const response = await Api.updateFifaComplianceDocument(editingDocument.id, {
          document_name: editingDocument.document_name,
          document_type: editingDocument.document_type,
          description: editingDocument.description,
          expiry_date: editingDocument.expiry_date
        });
        
        if (response.success) {
          await loadDocuments(); // Reload documents
          setEditingDocument(null);
        } else {
          setError('Failed to update document');
        }
      } catch (err) {
        console.error('Error updating document:', err);
        setError('Failed to update document');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Compliance
            </Button>
          </div>
          
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              FIFA Compliance Documents
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Manage all FIFA compliance documents and information
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-700 dark:text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading documents...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Filters and Search */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {documentTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="review_needed">Review Needed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Document Library</CardTitle>
            <CardDescription>
              {filteredDocuments.length} of {documents.length} documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {document.document_name}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {document.document_type}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{document.document_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(document.status)}
                    </TableCell>
                    <TableCell>
                      {getVerificationBadge(document)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {document.updated_at ? new Date(document.updated_at).toLocaleDateString() : 'Not uploaded'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {document.expiry_date ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {new Date(document.expiry_date).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-slate-400">No expiry</span>
                      )}
                    </TableCell>
                    <TableCell>{document.file_size ? formatFileSize(document.file_size) : 'Not uploaded'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {document.file_path ? (
                          <>
                            <Button variant="ghost" size="sm" title="Preview Document">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Download Document">
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                        <label className="cursor-pointer">
                          <Button variant="ghost" size="sm" title="Upload Document" asChild>
                            <span>
                              <Upload className="h-4 w-4" />
                            </span>
                          </Button>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(e, document)}
                          />
                        </label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditingDocument(document)}
                          title="Edit Document Details"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Document Dialog */}
        {editingDocument && (
          <Dialog open={!!editingDocument} onOpenChange={() => setEditingDocument(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Document</DialogTitle>
                <DialogDescription>
                  Update document information
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Document Name</Label>
                  <Input
                    id="edit-name"
                    value={editingDocument.document_name}
                    onChange={(e) => setEditingDocument({...editingDocument, document_name: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingDocument.description || ''}
                    onChange={(e) => setEditingDocument({...editingDocument, description: e.target.value})}
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-expiry">Expiry Date</Label>
                  <Input
                    id="edit-expiry"
                    type="date"
                    value={editingDocument.expiry_date ? new Date(editingDocument.expiry_date).toISOString().split('T')[0] : ""}
                    onChange={(e) => setEditingDocument({...editingDocument, expiry_date: e.target.value})}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditingDocument(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        </>
        )}

        {/* Status Alerts */}
        <div className="mt-6 space-y-4">
          {documents.some(doc => doc.status === 'expired') && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                You have {documents.filter(doc => doc.status === 'expired').length} expired document(s) that need immediate attention.
              </AlertDescription>
            </Alert>
          )}
          
          {documents.some(doc => doc.status === 'review_needed') && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                {documents.filter(doc => doc.status === 'review_needed').length} document(s) require review before the next FIFA inspection.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplianceDocuments;