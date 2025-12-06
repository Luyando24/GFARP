import React, { useState, useEffect } from 'react';
import {
    Upload,
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
    XCircle,
    Loader2
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

interface ComplianceDocument {
    id: string;
    document_name: string;
    document_type: string;
    file_path: string;
    file_size: number;
    uploaded_by: string;
    upload_date: string;
    expiry_date?: string;
    status: 'pending' | 'verified' | 'rejected' | 'expired';
    description?: string;
    url?: string;
}

interface AcademyComplianceTabProps {
    academyId: string;
}

export default function AcademyComplianceTab({ academyId }: AcademyComplianceTabProps) {
    const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [editingDocument, setEditingDocument] = useState<ComplianceDocument | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const { toast } = useToast();

    const [newDocument, setNewDocument] = useState({
        document_name: "",
        document_type: "Manual",
        description: "",
        expiry_date: ""
    });

    const documentTypes = ["Manual", "Forms", "Guidelines", "Policy", "Handbook", "Certificate", "Report"];

    // Required FIFA compliance documents
    const requiredDocuments = [
        { name: 'FIFA Statutes and Regulations', type: 'Manual' },
        { name: 'Player Registration System Manual', type: 'Manual' },
        { name: 'Anti-Doping Policy', type: 'Policy' },
        { name: 'Financial Fair Play Guidelines', type: 'Guidelines' },
        { name: 'Referee Guidelines and Laws', type: 'Guidelines' },
        { name: 'Stadium Safety Standards', type: 'Guidelines' },
        { name: 'Medical Regulations', type: 'Guidelines' },
        { name: 'Disciplinary Code', type: 'Manual' }
    ];

    useEffect(() => {
        loadDocuments();
    }, [academyId]);

    const loadDocuments = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/compliance-documents?academyId=${academyId}`);
            const result = await response.json();

            if (result.success) {
                setDocuments(result.data);
            } else {
                toast({
                    title: "Error",
                    description: "Failed to load compliance documents",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            toast({
                title: "Error",
                description: "Failed to load compliance documents",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) {
                toast({
                    title: "File too large",
                    description: "Maximum file size is 4MB",
                    variant: "destructive",
                });
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleUploadDocument = async () => {
        if (!newDocument.document_name || !newDocument.document_type || !selectedFile) {
            toast({
                title: "Missing fields",
                description: "Please fill in all required fields and select a file",
                variant: "destructive",
            });
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('academyId', academyId);
            formData.append('document_name', newDocument.document_name);
            formData.append('document_type', newDocument.document_type);
            formData.append('description', newDocument.description);
            if (newDocument.expiry_date) {
                formData.append('expiry_date', newDocument.expiry_date);
            }

            const response = await fetch('/api/compliance-documents/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: "Success",
                    description: "Document uploaded successfully",
                });
                await loadDocuments();
                setShowUploadDialog(false);
                setNewDocument({ document_name: "", document_type: "Manual", description: "", expiry_date: "" });
                setSelectedFile(null);
            } else {
                toast({
                    title: "Upload failed",
                    description: result.message || "Failed to upload document",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            toast({
                title: "Error",
                description: "Failed to upload document",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDocument = async (documentId: string) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;

        try {
            const response = await fetch(`/api/compliance-documents/${documentId}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: "Success",
                    description: "Document deleted successfully",
                });
                await loadDocuments();
            } else {
                toast({
                    title: "Delete failed",
                    description: result.message || "Failed to delete document",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            toast({
                title: "Error",
                description: "Failed to delete document",
                variant: "destructive",
            });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'verified':
                return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
            case 'rejected':
                return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
            case 'expired':
                return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        FIFA Compliance Documents
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Manage your academy's compliance documentation
                    </p>
                </div>
                <Button onClick={() => setShowUploadDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Document
                </Button>
            </div>

            {/* Required Documents Checklist */}
            <Card>
                <CardHeader>
                    <CardTitle>Required Documents</CardTitle>
                    <CardDescription>
                        {documents.length} of {requiredDocuments.length} required documents uploaded
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {requiredDocuments.map((req, index) => {
                            const uploaded = documents.find(doc =>
                                doc.document_name.toLowerCase().includes(req.name.toLowerCase().split(' ')[0])
                            );
                            return (
                                <div key={index} className="flex items-center gap-2 p-2 rounded border">
                                    {uploaded ? (
                                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                    ) : (
                                        <XCircle className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    )}
                                    <span className="text-sm">{req.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Documents Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Uploaded Documents</CardTitle>
                    <CardDescription>
                        {documents.length} documents
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {documents.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                            <p className="text-slate-600">No documents uploaded yet</p>
                            <Button onClick={() => setShowUploadDialog(true)} className="mt-4">
                                Upload Your First Document
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Document</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Uploaded</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {documents.map((document) => (
                                    <TableRow key={document.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                                <div>
                                                    <div className="font-medium">{document.document_name}</div>
                                                    {document.description && (
                                                        <div className="text-sm text-slate-500">{document.description}</div>
                                                    )}
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
                                            {new Date(document.upload_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>{formatFileSize(document.file_size)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {document.url && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(document.url, '_blank')}
                                                        title="View Document"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteDocument(document.id)}
                                                    title="Delete Document"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Upload Dialog */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Upload Compliance Document</DialogTitle>
                        <DialogDescription>
                            Upload a new FIFA compliance document
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="doc-name">Document Name *</Label>
                            <Input
                                id="doc-name"
                                value={newDocument.document_name}
                                onChange={(e) => setNewDocument({ ...newDocument, document_name: e.target.value })}
                                placeholder="e.g., FIFA Statutes 2024"
                            />
                        </div>

                        <div>
                            <Label htmlFor="doc-type">Document Type *</Label>
                            <Select
                                value={newDocument.document_type}
                                onValueChange={(value) => setNewDocument({ ...newDocument, document_type: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {documentTypes.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={newDocument.description}
                                onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                                rows={3}
                                placeholder="Brief description of the document"
                            />
                        </div>

                        <div>
                            <Label htmlFor="expiry">Expiry Date (Optional)</Label>
                            <Input
                                id="expiry"
                                type="date"
                                value={newDocument.expiry_date}
                                onChange={(e) => setNewDocument({ ...newDocument, expiry_date: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="file">File * (Max 10MB)</Label>
                            <Input
                                id="file"
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={handleFileSelect}
                            />
                            {selectedFile && (
                                <p className="text-sm text-slate-600 mt-1">
                                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleUploadDocument} disabled={uploading}>
                                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {uploading ? 'Uploading...' : 'Upload'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
