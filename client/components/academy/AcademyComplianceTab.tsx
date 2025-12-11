import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
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
    Loader2,
    Star
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
    rejection_reason?: string;
}

interface AcademyComplianceTabProps {
    academyId: string;
}

export default function AcademyComplianceTab({ academyId }: AcademyComplianceTabProps) {
    const { t } = useLanguage();
    const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [editingDocument, setEditingDocument] = useState<ComplianceDocument | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const { toast } = useToast();

    const [newDocument, setNewDocument] = useState({
        document_name: "",
        document_type: "other",
        description: "",
        expiry_date: ""
    });

    const documentTypes = [
        "contract",
        "medical_certificate",
        "fifa_clearance",
        "international_clearance",
        "age_verification",
        "transfer_agreement",
        "fifa_tms_certificate",
        "academy_license",
        "facility_inspection_report",
        "coach_certifications",
        "financial_statements",
        "audit_report",
        "transaction_records",
        "safeguarding_policy",
        "background_checks",
        "training_certificates",
        "other"
    ];

    // Required FIFA compliance documents - Global Standard
    const highlyValuableDocuments = [
        { name: 'Official rosters', type: 'roster' },
        { name: 'Registration forms', type: 'registration' },
        { name: 'League match lists', type: 'match_list' },
        { name: 'Training attendance sheets', type: 'attendance' },
        { name: 'Tournament rosters', type: 'roster' },
        { name: 'Photos/videos with visible timestamps', type: 'media' },
        { name: 'Coach evaluations', type: 'evaluation' },
        { name: 'Player ID records', type: 'id_record' },
        { name: 'Tryout acceptance documents', type: 'acceptance' },
        { name: 'Emails confirming registration', type: 'email' },
        { name: 'National association registration history', type: 'history' }
    ];

    const supportingDocuments = [
        { name: 'Press releases', type: 'press' },
        { name: 'Website archives', type: 'archive' },
        { name: 'Payment receipts', type: 'receipt' },
        { name: 'Social-media posts showing training', type: 'social' }
    ];
    
    // Combine for total count calculation
    const allRequiredDocs = [...highlyValuableDocuments, ...supportingDocuments];

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
                    title: t('common.error'),
                    description: "Failed to load compliance documents",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            toast({
                title: t('common.error'),
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
                    title: t('common.success'),
                    description: "Document uploaded successfully",
                });
                await loadDocuments();
                setShowUploadDialog(false);
                setNewDocument({ document_name: "", document_type: "other", description: "", expiry_date: "" });
                setSelectedFile(null);
            } else {
                toast({
                    title: t('common.error'),
                    description: result.message || "Failed to upload document",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            toast({
                title: t('common.error'),
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
                    title: t('common.success'),
                    description: "Document deleted successfully",
                });
                await loadDocuments();
            } else {
                toast({
                    title: t('common.error'),
                    description: result.message || "Failed to delete document",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            toast({
                title: t('common.error'),
                description: "Failed to delete document",
                variant: "destructive",
            });
        }
    };

    const getStatusBadge = (doc: ComplianceDocument) => {
        switch (doc.status) {
            case 'verified':
                return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
            case 'rejected':
                return (
                    <div className="flex flex-col items-start gap-1">
                        <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                        {doc.rejection_reason && (
                            <span className="text-xs text-red-600 max-w-[200px] truncate" title={doc.rejection_reason}>
                                Reason: {doc.rejection_reason}
                            </span>
                        )}
                    </div>
                );
            case 'expired':
                return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
            default:
                return <Badge variant="secondary">{doc.status}</Badge>;
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
                        {t('dash.compliance.documentsTitle')}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {t('dash.compliance.documentsDesc')}
                    </p>
                </div>
                <Button onClick={() => setShowUploadDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('dash.compliance.upload')}
                </Button>
            </div>

            {/* Documentation Checklist for Clubs (Global Standard) */}
            <Card>
                <CardHeader>
                    <CardTitle>Documentation Checklist for Clubs (Global Standard)</CardTitle>
                    <CardDescription>
                        The more documentation, the stronger the claim.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Highly Valuable Evidence */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-500 fill-current" />
                            Highly Valuable Evidence
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {highlyValuableDocuments.map((req, index) => {
                                const uploaded = documents.find(doc =>
                                    doc.document_name.toLowerCase().includes(req.name.toLowerCase().split(' ')[0])
                                );
                                return (
                                    <div key={index} className="flex items-center gap-2 p-2 rounded border bg-slate-50 dark:bg-slate-900/50">
                                        {uploaded ? (
                                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                        )}
                                        <span className="text-sm font-medium">{req.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Supporting Evidence */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            Supporting Evidence
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {supportingDocuments.map((req, index) => {
                                const uploaded = documents.find(doc =>
                                    doc.document_name.toLowerCase().includes(req.name.toLowerCase().split(' ')[0])
                                );
                                return (
                                    <div key={index} className="flex items-center gap-2 p-2 rounded border bg-slate-50 dark:bg-slate-900/50">
                                        {uploaded ? (
                                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                        )}
                                        <span className="text-sm font-medium">{req.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Documents Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('dash.compliance.uploadedTitle')}</CardTitle>
                    <CardDescription>
                        {documents.length} documents
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {documents.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                            <p className="text-slate-600">{t('dash.compliance.noDocs')}</p>
                            <Button onClick={() => setShowUploadDialog(true)} className="mt-4">
                                {t('dash.compliance.uploadFirst')}
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
                                            <Badge variant="outline">
                                                {document.document_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(document)}
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
                        <DialogTitle>{t('dash.compliance.dialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('dash.compliance.dialog.desc')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="doc-name">{t('dash.compliance.dialog.name')} *</Label>
                            <Input
                                id="doc-name"
                                value={newDocument.document_name}
                                onChange={(e) => setNewDocument({ ...newDocument, document_name: e.target.value })}
                                placeholder="e.g., FIFA Statutes 2024"
                            />
                        </div>

                        <div>
                            <Label htmlFor="doc-type">{t('dash.compliance.dialog.type')} *</Label>
                            <Select
                                value={newDocument.document_type}
                                onValueChange={(value) => setNewDocument({ ...newDocument, document_type: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {documentTypes.map(type => (
                                        <SelectItem key={type} value={type}>
                                            {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="description">{t('dash.compliance.dialog.descLabel')}</Label>
                            <Textarea
                                id="description"
                                value={newDocument.description}
                                onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                                rows={3}
                                placeholder="Brief description of the document"
                            />
                        </div>

                        <div>
                            <Label htmlFor="expiry">{t('dash.compliance.dialog.expiry')}</Label>
                            <Input
                                id="expiry"
                                type="date"
                                value={newDocument.expiry_date}
                                onChange={(e) => setNewDocument({ ...newDocument, expiry_date: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="file">{t('dash.compliance.dialog.file')} * (Max 10MB)</Label>
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
                                {t('common.cancel')}
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
