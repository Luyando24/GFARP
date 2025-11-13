import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Phone, 
  Calendar, 
  FileText, 
  Upload,
  Loader2,
  Check,
  Eye,
  Download
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countryCodes } from '@/lib/countryCodes';
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const playerPositions = [
  "Goalkeeper",
  "Defender", 
  "Midfielder",
  "Forward",
  "Winger",
  "Striker",
  "Center Back",
  "Full Back",
  "Defensive Midfielder",
  "Attacking Midfielder"
];

const nationalities = [
  "Zambian", "South African", "Kenyan", "Nigerian", "Ghanaian", "Tanzanian", 
  "Ugandan", "Zimbabwean", "Botswanan", "Malawian", "Mozambican", "Other"
];

interface PlayerFormData {
  // Personal Information
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  position: string;
  height: string;
  weight: string;
  
  // Contact & Club Info
  email: string;
  phoneCountryCode: string;
  phone: string;
  currentClub: string;
  
  // Training Info
  trainingStartDate: string;
  trainingEndDate: string;
  
  // Internal Notes
  internalNotes: string;
  
  // Additional fields
  jerseyNumber: string;
  
  // Document status (optional)
  documentsUploaded?: boolean;
  uploadedDocuments?: {
    passportId: File | null;
    playerPhoto: File | null;
    proofOfTraining: File | null;
    birthCertificate: File | null;
  };
}

interface AddPlayerStepFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (playerData: PlayerFormData) => Promise<void>;
  loading: boolean;
}

const AddPlayerStepForm: React.FC<AddPlayerStepFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PlayerFormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: '',
    position: '',
    height: '',
    weight: '',
    email: '',
    phoneCountryCode: '+260',
    phone: '',
    currentClub: '',
    trainingStartDate: '',
    trainingEndDate: '',
    internalNotes: '',
    jerseyNumber: ''
  });

  const [uploadedFiles, setUploadedFiles] = useState({
    passportId: null as File | null,
    playerPhoto: null as File | null,
    proofOfTraining: null as File | null,
    birthCertificate: null as File | null
  });

  // Preview modal state
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    file: null as File | null,
    title: ''
  });

  const totalSteps = 5;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = (fileType: keyof typeof uploadedFiles, file: File | null) => {
    if (file) {
      // Check file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: `File size must be less than 5MB. Current file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
          variant: "destructive"
        });
        return;
      }
    }

    setUploadedFiles(prev => ({
      ...prev,
      [fileType]: file
    }));

    if (file) {
      toast({
        title: "File Selected",
        description: `${file.name} selected for upload (${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
        variant: "default"
      });
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Personal Information
        return !!(formData.firstName && formData.lastName && formData.dateOfBirth && formData.nationality && formData.position);
      case 2: // Physical Information
        return true; // Height and weight are optional
      case 3: // Contact & Club Info
        return true; // All fields are optional
      case 4: // Training Info
        return true; // Training dates are optional
      case 5: // Documents
        return true; // Documents are optional - can be added later
      default:
        return true;
    }
  };

  const hasRequiredDocuments = (): boolean => {
    return !!(uploadedFiles.passportId && uploadedFiles.playerPhoto && uploadedFiles.proofOfTraining);
  };

  // Document preview handlers
  const openPreview = (file: File, title: string) => {
    setPreviewModal({
      isOpen: true,
      file,
      title
    });
  };

  const closePreview = () => {
    setPreviewModal({
      isOpen: false,
      file: null,
      title: ''
    });
  };

  const getFilePreviewUrl = (file: File): string => {
    return URL.createObjectURL(file);
  };

  const getDocumentDisplayName = (file: File | null): string => {
    if (!file) return '';
    const maxLength = 20;
    if (file.name.length <= maxLength) return file.name;
    const extension = file.name.split('.').pop();
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - 3 - (extension?.length || 0));
    return `${truncated}...${extension ? '.' + extension : ''}`;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    } else {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive"
      });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(1)) {
      toast({
        title: "Validation Error", 
        description: "Please fill in all required personal information.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create player data with document status
      const playerDataWithDocuments = {
        ...formData,
        documentsUploaded: hasRequiredDocuments(),
        uploadedDocuments: uploadedFiles
      };

      await onSubmit(playerDataWithDocuments);
      
      // Show success message based on document status
      if (hasRequiredDocuments()) {
        toast({
          title: "Player Added Successfully",
          description: "Player has been registered with all documents.",
          variant: "default"
        });
      } else {
        toast({
          title: "Player Added Successfully",
          description: "Player has been registered. Documents can be added later from the player's profile.",
          variant: "default"
        });
      }

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        nationality: '',
        position: '',
        height: '',
        weight: '',
        email: '',
        phone: '',
        currentClub: '',
        trainingStartDate: '',
        trainingEndDate: '',
        internalNotes: '',
        jerseyNumber: ''
      });
      setUploadedFiles({
        passportId: null,
        playerPhoto: null,
        proofOfTraining: null,
        birthCertificate: null
      });
      setCurrentStep(1);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to add player. Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Personal Information</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality *</Label>
              <Select value={formData.nationality} onValueChange={(value) => handleSelectChange('nationality', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select nationality" />
                </SelectTrigger>
                <SelectContent>
                  {nationalities.map((nationality) => (
                    <SelectItem key={nationality} value={nationality}>
                      {nationality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Select value={formData.position} onValueChange={(value) => handleSelectChange('position', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {playerPositions.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Physical Information</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  name="height"
                  type="number"
                  placeholder="175"
                  value={formData.height}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  name="weight"
                  type="number"
                  placeholder="70"
                  value={formData.weight}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jerseyNumber">Jersey Number</Label>
              <Input
                id="jerseyNumber"
                name="jerseyNumber"
                type="number"
                placeholder="10"
                value={formData.jerseyNumber}
                onChange={handleInputChange}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Contact & Club Information</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="player@example.com"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Select value={formData.phoneCountryCode} onValueChange={(val) => handleSelectChange('phoneCountryCode', val)}>
                  <SelectTrigger className="w-20 absolute left-0 top-0 h-full border-r-0 rounded-r-none z-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {countryCodes.map((country) => (
                      <SelectItem key={`${country.code}-${country.country}`} value={country.code}>
                        {country.flag} {country.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="XXX XXX XXX"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="pl-20 rounded-l-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentClub">Current Club</Label>
              <Input
                id="currentClub"
                name="currentClub"
                placeholder="Previous club name (optional)"
                value={formData.currentClub}
                onChange={handleInputChange}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Training Information</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trainingStartDate">Training Start Date</Label>
                <Input
                  id="trainingStartDate"
                  name="trainingStartDate"
                  type="date"
                  value={formData.trainingStartDate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainingEndDate">Training End Date</Label>
                <Input
                  id="trainingEndDate"
                  name="trainingEndDate"
                  type="date"
                  value={formData.trainingEndDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="internalNotes">Internal Notes</Label>
              <Textarea
                id="internalNotes"
                name="internalNotes"
                placeholder="Internal notes for academy use only..."
                value={formData.internalNotes}
                onChange={handleInputChange}
                rows={4}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Document Uploads</h3>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Required Documents</CardTitle>
                  <CardDescription className="text-xs">
                    You can upload these documents now or add them later from the player profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">Passport or ID</p>
                      <p className="text-sm text-gray-500">Upload player identification</p>
                      {uploadedFiles.passportId && (
                        <p className="text-xs text-blue-600 mt-1">
                          📄 {getDocumentDisplayName(uploadedFiles.passportId)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={uploadedFiles.passportId ? "default" : "secondary"}>
                        {uploadedFiles.passportId ? "Uploaded" : "Pending"}
                      </Badge>
                      {uploadedFiles.passportId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openPreview(uploadedFiles.passportId!, 'Passport or ID')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <input
                        type="file"
                        id="passportId"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload('passportId', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('passportId')?.click()}
                      >
                        {uploadedFiles.passportId ? 'Change' : 'Upload'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">Player Photo</p>
                      <p className="text-sm text-gray-500">Headshot photo</p>
                      {uploadedFiles.playerPhoto && (
                        <p className="text-xs text-blue-600 mt-1">
                          📷 {getDocumentDisplayName(uploadedFiles.playerPhoto)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={uploadedFiles.playerPhoto ? "default" : "secondary"}>
                        {uploadedFiles.playerPhoto ? "Uploaded" : "Pending"}
                      </Badge>
                      {uploadedFiles.playerPhoto && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openPreview(uploadedFiles.playerPhoto!, 'Player Photo')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <input
                        type="file"
                        id="playerPhoto"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('playerPhoto', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('playerPhoto')?.click()}
                      >
                        {uploadedFiles.playerPhoto ? 'Change' : 'Upload'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">Proof of Training</p>
                      <p className="text-sm text-gray-500">Contract or certificate</p>
                      {uploadedFiles.proofOfTraining && (
                        <p className="text-xs text-blue-600 mt-1">
                          📋 {getDocumentDisplayName(uploadedFiles.proofOfTraining)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={uploadedFiles.proofOfTraining ? "default" : "secondary"}>
                        {uploadedFiles.proofOfTraining ? "Uploaded" : "Pending"}
                      </Badge>
                      {uploadedFiles.proofOfTraining && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openPreview(uploadedFiles.proofOfTraining!, 'Proof of Training')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <input
                        type="file"
                        id="proofOfTraining"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload('proofOfTraining', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('proofOfTraining')?.click()}
                      >
                        {uploadedFiles.proofOfTraining ? 'Change' : 'Upload'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Optional Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">Birth Certificate</p>
                      <p className="text-sm text-gray-500">Additional age verification</p>
                      {uploadedFiles.birthCertificate && (
                        <p className="text-xs text-blue-600 mt-1">
                          📜 {getDocumentDisplayName(uploadedFiles.birthCertificate)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={uploadedFiles.birthCertificate ? "default" : "secondary"}>
                        {uploadedFiles.birthCertificate ? "Uploaded" : "Pending"}
                      </Badge>
                      {uploadedFiles.birthCertificate && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openPreview(uploadedFiles.birthCertificate!, 'Birth Certificate')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <input
                        type="file"
                        id="birthCertificate"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload('birthCertificate', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('birthCertificate')?.click()}
                      >
                        {uploadedFiles.birthCertificate ? 'Change' : 'Upload'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* File Upload Status */}
              {Object.values(uploadedFiles).some(file => file) && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-blue-700">
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {Object.values(uploadedFiles).filter(file => file).length} document(s) selected
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Documents will be processed after player registration
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Skip Documents Option */}
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <FileText className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                    <p className="text-sm text-amber-700 font-medium mb-2">
                      Don't have documents ready?
                    </p>
                    <p className="text-xs text-amber-600 mb-3">
                      You can add documents later from the player's profile page
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs text-amber-600 mb-3">
                      <Check className="h-3 w-3" />
                      <span>Continue without documents</span>
                    </div>
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Proceed without documents
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Document Status Summary */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">
                        Document Status
                      </p>
                      <p className="text-xs text-blue-600">
                        {Object.values(uploadedFiles).filter(file => file).length} of 4 documents uploaded
                      </p>
                    </div>
                    <div className="text-right">
                      {hasRequiredDocuments() ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Incomplete
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepIcon = (step: number) => {
    if (step < currentStep) {
      return <Check className="h-4 w-4" />;
    }
    return <span className="text-sm font-medium">{step}</span>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Player</DialogTitle>
          <DialogDescription>
            Complete all steps to register a new player in your academy.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2 
                ${step <= currentStep 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-gray-300 text-gray-400'
                }
              `}>
                {getStepIcon(step)}
              </div>
              {step < 5 && (
                <div className={`
                  w-12 h-0.5 mx-2
                  ${step < currentStep ? 'bg-blue-600' : 'bg-gray-300'}
                `} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            
            {currentStep === totalSteps ? (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {hasRequiredDocuments() ? 'Add Player with Documents' : 'Add Player (Documents Later)'}
              </Button>
            ) : (
              <Button onClick={nextStep}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Document Preview Modal */}
      {previewModal.isOpen && (
        <Dialog open={previewModal.isOpen} onOpenChange={closePreview}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{previewModal.title}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-4">
              {previewModal.file && (
                <>
                  {previewModal.file.type.startsWith('image/') ? (
                    <img
                      src={getFilePreviewUrl(previewModal.file)}
                      alt={previewModal.title}
                      className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    />
                  ) : previewModal.file.type === 'application/pdf' ? (
                    <div className="w-full h-[60vh] border rounded-lg">
                      <iframe
                        src={getFilePreviewUrl(previewModal.file)}
                        className="w-full h-full rounded-lg"
                        title={previewModal.title}
                      />
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">{previewModal.file.name}</p>
                      <p className="text-sm text-gray-500 mb-4">
                        File type: {previewModal.file.type || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-500">
                        This file type cannot be previewed directly.
                      </p>
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const url = getFilePreviewUrl(previewModal.file!);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = previewModal.file!.name;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" onClick={closePreview}>
                      Close
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default AddPlayerStepForm;