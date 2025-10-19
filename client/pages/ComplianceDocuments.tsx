import React, { useState } from 'react';
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
  Save
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

interface ComplianceDocument {
  id: number;
  name: string;
  type: string;
  category: string;
  lastUpdated: string;
  status: 'current' | 'review_needed' | 'expired' | 'pending';
  size: string;
  uploadedBy: string;
  expiryDate?: string;
  description: string;
}

interface ComplianceDocumentsProps {
  onBack: () => void;
}

const ComplianceDocuments: React.FC<ComplianceDocumentsProps> = ({ onBack }) => {
  console.log('ComplianceDocuments component is rendering');
  
  const [documents, setDocuments] = useState<ComplianceDocument[]>([
    {
      id: 1,
      name: "FIFA Compliance Manual 2024",
      type: "Manual",
      category: "General",
      lastUpdated: "2024-01-01",
      status: "current",
      size: "2.4 MB",
      uploadedBy: "Admin",
      expiryDate: "2024-12-31",
      description: "Comprehensive FIFA compliance manual for 2024 season"
    },
    {
      id: 2,
      name: "Player Registration Forms",
      type: "Forms",
      category: "Player Management",
      lastUpdated: "2024-01-15",
      status: "current",
      size: "1.8 MB",
      uploadedBy: "Registration Officer",
      description: "Standard player registration forms and templates"
    },
    {
      id: 3,
      name: "Training Compensation Guidelines",
      type: "Guidelines",
      category: "Financial",
      lastUpdated: "2023-12-20",
      status: "review_needed",
      size: "956 KB",
      uploadedBy: "Legal Team",
      expiryDate: "2024-02-01",
      description: "Guidelines for training compensation calculations"
    },
    {
      id: 4,
      name: "Youth Protection Policy",
      type: "Policy",
      category: "Youth Development",
      lastUpdated: "2024-01-10",
      status: "current",
      size: "1.2 MB",
      uploadedBy: "Youth Coordinator",
      expiryDate: "2025-01-10",
      description: "Comprehensive youth protection and safeguarding policy"
    },
    {
      id: 5,
      name: "Transfer Regulation Handbook",
      type: "Handbook",
      category: "Transfers",
      lastUpdated: "2023-11-15",
      status: "expired",
      size: "3.1 MB",
      uploadedBy: "Transfer Manager",
      expiryDate: "2024-01-01",
      description: "Detailed handbook on FIFA transfer regulations"
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<ComplianceDocument | null>(null);

  const [newDocument, setNewDocument] = useState({
    name: "",
    type: "",
    category: "",
    description: "",
    expiryDate: ""
  });

  const categories = ["General", "Player Management", "Financial", "Youth Development", "Transfers", "Legal"];
  const documentTypes = ["Manual", "Forms", "Guidelines", "Policy", "Handbook", "Certificate", "Report"];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || doc.category === filterCategory;
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Current</Badge>;
      case 'review_needed':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Review Needed</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Expired</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleUploadDocument = () => {
    if (newDocument.name && newDocument.type && newDocument.category) {
      const document: ComplianceDocument = {
        id: documents.length + 1,
        name: newDocument.name,
        type: newDocument.type,
        category: newDocument.category,
        description: newDocument.description,
        lastUpdated: new Date().toISOString().split('T')[0],
        status: 'pending',
        size: "0 KB",
        uploadedBy: "Current User",
        expiryDate: newDocument.expiryDate || undefined
      };

      setDocuments([...documents, document]);
      setNewDocument({ name: "", type: "", category: "", description: "", expiryDate: "" });
      setIsUploadDialogOpen(false);
    }
  };

  const handleDeleteDocument = (id: number) => {
    setDocuments(documents.filter(doc => doc.id !== id));
  };

  const handleEditDocument = (document: ComplianceDocument) => {
    setEditingDocument(document);
  };

  const handleSaveEdit = () => {
    if (editingDocument) {
      setDocuments(documents.map(doc => 
        doc.id === editingDocument.id ? editingDocument : doc
      ));
      setEditingDocument(null);
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
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                FIFA Compliance Documents
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Manage all FIFA compliance documents and information
              </p>
            </div>
            
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload New Document</DialogTitle>
                  <DialogDescription>
                    Add a new FIFA compliance document to the system
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="doc-name">Document Name</Label>
                    <Input
                      id="doc-name"
                      value={newDocument.name}
                      onChange={(e) => setNewDocument({...newDocument, name: e.target.value})}
                      placeholder="Enter document name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="doc-type">Document Type</Label>
                    <Select value={newDocument.type} onValueChange={(value) => setNewDocument({...newDocument, type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="doc-category">Category</Label>
                    <Select value={newDocument.category} onValueChange={(value) => setNewDocument({...newDocument, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="doc-description">Description</Label>
                    <Textarea
                      id="doc-description"
                      value={newDocument.description}
                      onChange={(e) => setNewDocument({...newDocument, description: e.target.value})}
                      placeholder="Enter document description"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="doc-expiry">Expiry Date (Optional)</Label>
                    <Input
                      id="doc-expiry"
                      type="date"
                      value={newDocument.expiryDate}
                      onChange={(e) => setNewDocument({...newDocument, expiryDate: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUploadDocument}>
                      Upload Document
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

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
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="review_needed">Review Needed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
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
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {document.name}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {document.type}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{document.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(document.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {document.lastUpdated}
                      </div>
                    </TableCell>
                    <TableCell>
                      {document.expiryDate ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {document.expiryDate}
                        </div>
                      ) : (
                        <span className="text-slate-400">No expiry</span>
                      )}
                    </TableCell>
                    <TableCell>{document.size}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditDocument(document)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteDocument(document.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
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
                    value={editingDocument.name}
                    onChange={(e) => setEditingDocument({...editingDocument, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingDocument.description}
                    onChange={(e) => setEditingDocument({...editingDocument, description: e.target.value})}
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-expiry">Expiry Date</Label>
                  <Input
                    id="edit-expiry"
                    type="date"
                    value={editingDocument.expiryDate || ""}
                    onChange={(e) => setEditingDocument({...editingDocument, expiryDate: e.target.value})}
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