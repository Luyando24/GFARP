import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Edit, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  Heart, 
  Shield, 
  Ruler, 
  Weight,
  Trophy,
  Activity,
  FileText,
  Upload,
  Check,
  Eye,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Api, Player } from '@/lib/api';
import { uploadPlayerDocument, getPlayerDocuments, deletePlayerDocument, type PlayerDocument } from '@/lib/document-upload';
import { countryCodes, formatPhoneDisplay, parsePhoneNumber } from '@/lib/countryCodes';

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

const preferredFootOptions = ["Left", "Right", "Both"];

interface DetailedPlayer extends Player {
  address?: string;
  city?: string;
  country?: string;
  nationality?: string;
  phoneCountryCode?: string;
  currentClub?: string;
  trainingStartDate?: string;
  trainingEndDate?: string;
  internalNotes?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  medicalInfo?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  height?: number;
  weight?: number;
  preferredFoot?: string;
  notes?: string;
  // Document fields
  documentsUploaded?: boolean;
  uploadedDocuments?: {
    passportId?: File | null;
    playerPhoto?: File | null;
    proofOfTraining?: File | null;
    birthCertificate?: File | null;
  };
}

const PlayerDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [player, setPlayer] = useState<DetailedPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
  const [formData, setFormData] = useState<Partial<DetailedPlayer>>({});
  
  // Document upload state
  const [uploadedFiles, setUploadedFiles] = useState({
    passportId: null as File | null,
    playerPhoto: null as File | null,
    proofOfTraining: null as File | null,
    birthCertificate: null as File | null
  });

  // Saved documents state
  const [savedDocuments, setSavedDocuments] = useState<PlayerDocument[]>([]);
  const [documentLoading, setDocumentLoading] = useState(false);

  // Preview modal state
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    file: null as File | null,
    title: '',
    url: null as string | null
  });

  // Helper function to map guardian fields to parent fields for form compatibility
  const mapGuardianToParentFields = (playerData: any) => {
    return {
      ...playerData,
      parentName: playerData.guardianName,
      parentPhone: playerData.guardianPhone,
      parentEmail: playerData.guardianEmail
    };
  };

  useEffect(() => {
    if (id) {
      fetchPlayerDetails();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchPlayerDetails = async () => {
    try {
      setLoading(true);
      const response = await Api.getPlayer(id!);
      if (response.success) {
        // Parse the combined phone number
        const { countryCode, phoneNumber } = parsePhoneNumber(response.data.phone || '');
        
        // Set player data with parsed phone and mapped guardian fields
        const playerData = mapGuardianToParentFields({
          ...response.data,
          phoneCountryCode: countryCode,
          phone: phoneNumber
        });
        
        setPlayer(playerData);
        setFormData(playerData);
        // Load existing documents
        await loadPlayerDocuments(response.data.id);
      } else {
        toast({
          title: "Error",
          description: "Failed to load player details",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching player details:", error);
      toast({
        title: "Error",
        description: "Failed to load player details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPlayerDocuments = async (playerId: string) => {
    try {
      setDocumentLoading(true);
      const result = await getPlayerDocuments(playerId);
      if (result.success) {
        setSavedDocuments(result.documents);
      }
    } catch (error) {
      console.error("Error loading player documents:", error);
    } finally {
      setDocumentLoading(false);
    }
  };

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

  const handleSave = async () => {
    if (!player) return;
    
    setSaving(true);
    try {
      // Prepare data with combined phone number and mapped field names
      const dataToSend = {
        ...formData,
        phone: `${formData.phoneCountryCode || '+260'}${formData.phone || ''}`,
        // Map parent fields to guardian fields for backend compatibility
        guardianName: formData.parentName,
        guardianPhone: formData.parentPhone,
        guardianEmail: formData.parentEmail
      };
      
      // First update player details
      const response = await Api.updatePlayerDetails(player.id, dataToSend);
      if (response.success) {
        setPlayer({ ...player, ...formData });
        
        // Upload any new documents
        await uploadNewDocuments();
        
        setIsEditing(false);
        toast({
          title: "Success",
          description: "Player details and documents updated successfully"
        });
        
        // Reload documents to ensure the new photo is displayed
        await loadPlayerDocuments(player.id);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to update player details",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating player details:", error);
      
      // For demo purposes, update the local state and upload documents
      setPlayer({ ...player, ...formData });
      await uploadNewDocuments();
      setIsEditing(false);
      
      toast({
        title: "Success",
        description: "Player details and documents updated successfully (demo mode)"
      });
    } finally {
      setSaving(false);
    }
  };

  const uploadNewDocuments = async () => {
    if (!player) return;

    const documentTypes = Object.keys(uploadedFiles) as Array<keyof typeof uploadedFiles>;
    
    for (const docType of documentTypes) {
      const file = uploadedFiles[docType];
      if (file) {
        try {
          const result = await uploadPlayerDocument(player.id, file, docType);
          if (result.success) {
            // Clear the uploaded file from state
            setUploadedFiles(prev => ({
              ...prev,
              [docType]: null
            }));
          }
        } catch (error) {
          console.error(`Error uploading ${docType}:`, error);
          toast({
            title: "Upload Warning",
            description: `Failed to upload ${docType}. Please try again.`,
            variant: "destructive"
          });
        }
      }
    }
    
    // Reload documents to show the updated list
    await loadPlayerDocuments(player.id);
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Document upload handlers
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

  const hasRequiredDocuments = (): boolean => {
    return !!(uploadedFiles.passportId && uploadedFiles.playerPhoto && uploadedFiles.proofOfTraining);
  };

  const getDocumentCount = (): number => {
    return Object.values(uploadedFiles).filter(file => file).length;
  };

  // Document preview handlers
  const openPreview = (file: File | null, title: string, url?: string) => {
    setPreviewModal({
      isOpen: true,
      file,
      title,
      url: url || null
    });
  };

  const closePreview = () => {
    setPreviewModal({
      isOpen: false,
      file: null,
      title: '',
      url: null
    });
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const result = await deletePlayerDocument(documentId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Document deleted successfully"
        });
        // Reload documents
        if (player) {
          await loadPlayerDocuments(player.id);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to delete document",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      });
    }
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

  // Helper functions for saved documents
  const getSavedDocument = (documentType: 'passport_id' | 'player_photo' | 'proof_of_training' | 'birth_certificate') => {
    return savedDocuments.find(doc => doc.document_type === documentType);
  };

  const hasUploadedFile = (fieldName: keyof typeof uploadedFiles) => {
    return uploadedFiles[fieldName] !== null;
  };

  const hasSavedDocument = (documentType: 'passport_id' | 'player_photo' | 'proof_of_training' | 'birth_certificate') => {
    return getSavedDocument(documentType) !== undefined;
  };

  const getDocumentStatus = (fieldName: keyof typeof uploadedFiles, documentType: 'passport_id' | 'player_photo' | 'proof_of_training' | 'birth_certificate') => {
    if (hasUploadedFile(fieldName)) return 'uploaded';
    if (hasSavedDocument(documentType)) return 'saved';
    return 'pending';
  };

  const getDocumentDisplayInfo = (fieldName: keyof typeof uploadedFiles, documentType: 'passport_id' | 'player_photo' | 'proof_of_training' | 'birth_certificate') => {
    if (hasUploadedFile(fieldName)) {
      return {
        name: getDocumentDisplayName(uploadedFiles[fieldName]),
        icon: '📄',
        isFile: true
      };
    }
    const savedDoc = getSavedDocument(documentType);
    if (savedDoc) {
      return {
        name: savedDoc.original_filename,
        icon: '📄',
        isFile: false,
        url: savedDoc.file_url
      };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Player Not Found</h2>
          <p className="text-gray-600 mb-4">The requested player could not be found.</p>
          <Button onClick={() => navigate('/academy-dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/academy-dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{player.firstName} {player.lastName}</h1>
              <p className="text-gray-600">Player Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setFormData(mapGuardianToParentFields(player));
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Overview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Player Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center" key={`avatar-${savedDocuments.length}-${documentLoading}`}>
                  {(() => {
                    // Check for uploaded file first (priority)
                    if (uploadedFiles.playerPhoto) {
                      const imageUrl = URL.createObjectURL(uploadedFiles.playerPhoto);
                      console.log('Showing uploaded file preview:', imageUrl);
                      return (
                        <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 border-2 border-blue-200">
                          <img 
                            src={imageUrl} 
                            alt={`${player.firstName} ${player.lastName}`}
                            className="w-full h-full object-cover"
                            onLoad={() => console.log('Uploaded image loaded successfully')}
                            onError={(e) => console.log('Uploaded image failed to load:', e)}
                          />
                        </div>
                      );
                    }
                    
                    // Check for saved photo from server
                    const savedPhoto = getSavedDocument('player_photo');
                    if (savedPhoto && savedPhoto.file_url) {
                      console.log('Showing saved photo from server:', savedPhoto.file_url);
                      return (
                        <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 border-2 border-blue-200 relative">
                          <img 
                            src={savedPhoto.file_url} 
                            alt={`${player.firstName} ${player.lastName}`}
                            className="w-full h-full object-cover"
                            onLoad={() => console.log('Server image loaded successfully')}
                            onError={(e) => {
                              console.log('Server image failed to load:', e);
                              // Show fallback immediately on error
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.parentElement?.querySelector('.fallback-avatar') as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          {/* Fallback that shows when image fails to load */}
                          <div className="fallback-avatar w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center absolute inset-0" style={{display: 'none'}}>
                            <User className="h-12 w-12 text-blue-600" />
                          </div>
                        </div>
                      );
                    }
                    
                    // Default fallback - no photo available
                    console.log('No photo available, showing default icon');
                    console.log('Debug info:', {
                      uploadedFiles: uploadedFiles.playerPhoto,
                      savedPhoto,
                      allSavedDocuments: savedDocuments,
                      documentLoading
                    });
                    return (
                      <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="h-12 w-12 text-blue-600" />
                      </div>
                    );
                  })()}
                  <h3 className="text-xl font-semibold">{player.firstName} {player.lastName}</h3>
                  <p className="text-gray-600">{player.position}</p>
                  
                  {/* Quick photo upload/change button */}
                  {isEditing && (
                    <div className="mt-2">
                      <input
                        type="file"
                        id="quickPlayerPhoto"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('playerPhoto', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('quickPlayerPhoto')?.click()}
                        className="text-xs"
                      >
                        {getDocumentDisplayInfo('playerPhoto', 'player_photo') ? 'Change Photo' : 'Add Photo'}
                      </Button>
                    </div>
                  )}
                  
                  <Badge variant={player.isActive ? 'default' : 'destructive'} className="mt-2">
                    {player.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Age: {calculateAge(player.dateOfBirth)} years</span>
                  </div>
                  {player.jerseyNumber && (
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Jersey: #{player.jerseyNumber}</span>
                    </div>
                  )}
                  {player.height && (
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Height: {player.height} cm</span>
                    </div>
                  )}
                  {player.weight && (
                    <div className="flex items-center gap-2">
                      <Weight className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Weight: {player.weight} kg</span>
                    </div>
                  )}
                  {player.preferredFoot && (
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Preferred Foot: {player.preferredFoot}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={isEditing ? formData.firstName || '' : player.firstName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={isEditing ? formData.lastName || '' : player.lastName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={isEditing ? formData.dateOfBirth || '' : player.dateOfBirth}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nationality</Label>
                    {isEditing ? (
                      <Select value={formData.nationality || ''} onValueChange={(value) => handleSelectChange('nationality', value)}>
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
                    ) : (
                      <Input value={player.nationality || 'Not specified'} disabled />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    {isEditing ? (
                      <Select value={formData.position || ''} onValueChange={(value) => handleSelectChange('position', value)}>
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
                    ) : (
                      <Input value={player.position} disabled />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jerseyNumber">Jersey Number</Label>
                    <Input
                      id="jerseyNumber"
                      name="jerseyNumber"
                      type="number"
                      value={isEditing ? formData.jerseyNumber || '' : player.jerseyNumber || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferredFoot">Preferred Foot</Label>
                    {isEditing ? (
                      <Select value={formData.preferredFoot || ''} onValueChange={(value) => handleSelectChange('preferredFoot', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select preferred foot" />
                        </SelectTrigger>
                        <SelectContent>
                          {preferredFootOptions.map((foot) => (
                            <SelectItem key={foot} value={foot}>
                              {foot}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={player.preferredFoot || 'Not specified'} disabled />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={isEditing ? formData.email || '' : player.email || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    {isEditing ? (
                      <div className="relative">
                        <Select 
                          value={formData.phoneCountryCode || '+260'} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, phoneCountryCode: value }))}
                        >
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
                          value={formData.phone || ''}
                          onChange={handleInputChange}
                          className="pl-20 rounded-l-none"
                        />
                      </div>
                    ) : (
                      <Input
                        value={formatPhoneDisplay(player.phoneCountryCode || '+260', player.phone || '')}
                        disabled
                        className="bg-gray-50"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentClub">Current Club</Label>
                    <Input
                      id="currentClub"
                      name="currentClub"
                      value={isEditing ? formData.currentClub || '' : player.currentClub || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={isEditing ? formData.address || '' : player.address || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={isEditing ? formData.city || '' : player.city || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      value={isEditing ? formData.country || '' : player.country || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Physical Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Physical Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      name="height"
                      type="number"
                      value={isEditing ? formData.height || '' : player.height || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      name="weight"
                      type="number"
                      value={isEditing ? formData.weight || '' : player.weight || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Training Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Training Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="trainingStartDate">Training Start Date</Label>
                    <Input
                      id="trainingStartDate"
                      name="trainingStartDate"
                      type="date"
                      value={isEditing ? formData.trainingStartDate || '' : player.trainingStartDate || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trainingEndDate">Training End Date</Label>
                    <Input
                      id="trainingEndDate"
                      name="trainingEndDate"
                      type="date"
                      value={isEditing ? formData.trainingEndDate || '' : player.trainingEndDate || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Parent/Guardian Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Parent/Guardian Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parentName">Parent/Guardian Name</Label>
                    <Input
                      id="parentName"
                      name="parentName"
                      value={isEditing ? formData.parentName || '' : player.parentName || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentPhone">Parent/Guardian Phone</Label>
                    <Input
                      id="parentPhone"
                      name="parentPhone"
                      value={isEditing ? formData.parentPhone || '' : player.parentPhone || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentEmail">Parent/Guardian Email</Label>
                    <Input
                      id="parentEmail"
                      name="parentEmail"
                      type="email"
                      value={isEditing ? formData.parentEmail || '' : player.parentEmail || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                    <Input
                      id="emergencyContact"
                      name="emergencyContact"
                      value={isEditing ? formData.emergencyContact || '' : player.emergencyContact || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                    <Input
                      id="emergencyPhone"
                      name="emergencyPhone"
                      value={isEditing ? formData.emergencyPhone || '' : player.emergencyPhone || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medical Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="medicalInfo">Medical Information & Allergies</Label>
                  <Textarea
                    id="medicalInfo"
                    name="medicalInfo"
                    rows={4}
                    value={isEditing ? formData.medicalInfo || '' : player.medicalInfo || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Any medical conditions, allergies, or important health information..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Internal Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Internal Notes
                </CardTitle>
                <CardDescription>
                  Internal notes for staff use only
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="internalNotes">Internal Notes</Label>
                  <Textarea
                    id="internalNotes"
                    name="internalNotes"
                    rows={4}
                    value={isEditing ? formData.internalNotes || '' : player.internalNotes || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Internal notes for staff use only..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Document Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Document Management
                </CardTitle>
                <CardDescription>
                  Upload and manage player documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Saved Documents */}
                {savedDocuments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Saved Documents</h4>
                    <div className="space-y-2">
                      {savedDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                          <div className="flex-1">
                            <p className="font-medium">{doc.document_type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</p>
                            <p className="text-sm text-gray-500">{doc.original_filename}</p>
                            <p className="text-xs text-gray-400">
                              Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default">Saved</Badge>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openPreview(null, doc.document_type, doc.file_url)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isEditing && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteDocument(doc.id)}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Required Documents */}
                <div>
                  <h4 className="font-medium mb-3">
                    {savedDocuments.length > 0 ? 'Upload New Documents' : 'Required Documents'}
                  </h4>
                  <div className="space-y-3">
                    {/* Passport/ID */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">Passport or ID</p>
                        <p className="text-sm text-gray-500">Upload player identification</p>
                        {(() => {
                          const docInfo = getDocumentDisplayInfo('passportId', 'passport_id');
                          return docInfo && (
                            <p className="text-xs text-blue-600 mt-1">
                              {docInfo.icon} {docInfo.name}
                            </p>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const status = getDocumentStatus('passportId', 'passport_id');
                          return (
                            <Badge variant={status === 'pending' ? "secondary" : "default"}>
                              {status === 'uploaded' ? 'Uploaded' : status === 'saved' ? 'Saved' : 'Pending'}
                            </Badge>
                          );
                        })()}
                        {(() => {
                          const docInfo = getDocumentDisplayInfo('passportId', 'passport_id');
                          return docInfo && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (docInfo.isFile) {
                                  openPreview(uploadedFiles.passportId!, 'Passport or ID');
                                } else {
                                  openPreview(null, 'Passport or ID', docInfo.url);
                                }
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          );
                        })()}
                        {isEditing && (
                          <>
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
                              {getDocumentStatus('passportId', 'passport_id') !== 'pending' ? 'Change' : 'Upload'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Player Photo */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">Player Photo</p>
                        <p className="text-sm text-gray-500">Headshot photo</p>
                        {(() => {
                          const docInfo = getDocumentDisplayInfo('playerPhoto', 'player_photo');
                          return docInfo && (
                            <p className="text-xs text-blue-600 mt-1">
                              📷 {docInfo.name}
                            </p>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const status = getDocumentStatus('playerPhoto', 'player_photo');
                          return (
                            <Badge variant={status === 'pending' ? "secondary" : "default"}>
                              {status === 'uploaded' ? 'Uploaded' : status === 'saved' ? 'Saved' : 'Pending'}
                            </Badge>
                          );
                        })()}
                        {(() => {
                          const docInfo = getDocumentDisplayInfo('playerPhoto', 'player_photo');
                          return docInfo && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (docInfo.isFile) {
                                  openPreview(uploadedFiles.playerPhoto!, 'Player Photo');
                                } else {
                                  openPreview(null, 'Player Photo', docInfo.url);
                                }
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          );
                        })()}
                        {isEditing && (
                          <>
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
                              {getDocumentStatus('playerPhoto', 'player_photo') !== 'pending' ? 'Change' : 'Upload'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Proof of Training */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">Proof of Training</p>
                        <p className="text-sm text-gray-500">Contract or certificate</p>
                        {(() => {
                          const docInfo = getDocumentDisplayInfo('proofOfTraining', 'proof_of_training');
                          return docInfo && (
                            <p className="text-xs text-blue-600 mt-1">
                              📋 {docInfo.name}
                            </p>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const status = getDocumentStatus('proofOfTraining', 'proof_of_training');
                          return (
                            <Badge variant={status === 'pending' ? "secondary" : "default"}>
                              {status === 'uploaded' ? 'Uploaded' : status === 'saved' ? 'Saved' : 'Pending'}
                            </Badge>
                          );
                        })()}
                        {(() => {
                          const docInfo = getDocumentDisplayInfo('proofOfTraining', 'proof_of_training');
                          return docInfo && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (docInfo.isFile) {
                                  openPreview(uploadedFiles.proofOfTraining!, 'Proof of Training');
                                } else {
                                  openPreview(null, 'Proof of Training', docInfo.url);
                                }
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          );
                        })()}
                        {isEditing && (
                          <>
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
                              {getDocumentStatus('proofOfTraining', 'proof_of_training') !== 'pending' ? 'Change' : 'Upload'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Optional Documents */}
                <div>
                  <h4 className="font-medium mb-3">Optional Documents</h4>
                  <div className="space-y-3">
                    {/* Birth Certificate */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">Birth Certificate</p>
                        <p className="text-sm text-gray-500">Additional age verification</p>
                        {(() => {
                          const docInfo = getDocumentDisplayInfo('birthCertificate', 'birth_certificate');
                          return docInfo && (
                            <p className="text-xs text-blue-600 mt-1">
                              📜 {docInfo.name}
                            </p>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const status = getDocumentStatus('birthCertificate', 'birth_certificate');
                          return (
                            <Badge variant={status === 'pending' ? "secondary" : "default"}>
                              {status === 'uploaded' ? 'Uploaded' : status === 'saved' ? 'Saved' : 'Pending'}
                            </Badge>
                          );
                        })()}
                        {(() => {
                          const docInfo = getDocumentDisplayInfo('birthCertificate', 'birth_certificate');
                          return docInfo && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (docInfo.isFile) {
                                  openPreview(uploadedFiles.birthCertificate!, 'Birth Certificate');
                                } else {
                                  openPreview(null, 'Birth Certificate', docInfo.url);
                                }
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          );
                        })()}
                        {isEditing && (
                          <>
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
                              {getDocumentStatus('birthCertificate', 'birth_certificate') !== 'pending' ? 'Change' : 'Upload'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Status Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">
                        Document Status
                      </p>
                      <p className="text-xs text-blue-600">
                        {getDocumentCount()} of 4 documents uploaded
                      </p>
                    </div>
                    <div className="text-right">
                      {hasRequiredDocuments() ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <Check className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Incomplete
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {getDocumentCount() > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Check className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {getDocumentCount()} document(s) selected
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Documents will be processed when you save changes
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    value={isEditing ? formData.notes || '' : player.notes || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Additional notes about the player..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewModal.isOpen && (previewModal.file || previewModal.url) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{previewModal.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePreview}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
              {previewModal.file ? (
                // Local file preview
                <>
                  {previewModal.file.type.startsWith('image/') ? (
                    <div className="flex justify-center">
                      <img
                        src={getFilePreviewUrl(previewModal.file)}
                        alt={previewModal.title}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      />
                    </div>
                  ) : previewModal.file.type === 'application/pdf' ? (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="text-center">
                        <p className="text-lg font-medium">PDF Document</p>
                        <p className="text-sm text-gray-500">{previewModal.file.name}</p>
                        <p className="text-xs text-gray-400">
                          Size: {(previewModal.file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <iframe
                        src={getFilePreviewUrl(previewModal.file)}
                        className="w-full h-96 border rounded-lg"
                        title={previewModal.title}
                      />
                      <Button
                        onClick={() => {
                          const url = getFilePreviewUrl(previewModal.file!);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = previewModal.file!.name;
                          link.click();
                        }}
                        className="mt-2"
                      >
                        Download PDF
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-lg font-medium">File Preview Not Available</p>
                      <p className="text-sm text-gray-500 mt-2">{previewModal.file.name}</p>
                      <p className="text-xs text-gray-400">
                        Size: {(previewModal.file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <Button
                        onClick={() => {
                          const url = getFilePreviewUrl(previewModal.file!);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = previewModal.file!.name;
                          link.click();
                        }}
                        className="mt-4"
                      >
                        Download File
                      </Button>
                    </div>
                  )}
                </>
              ) : previewModal.url ? (
                // Server URL preview
                <>
                  {previewModal.url.toLowerCase().includes('.pdf') ? (
                    <iframe
                      src={previewModal.url}
                      className="w-full h-96 border rounded-lg"
                      title={previewModal.title}
                    />
                  ) : (
                    <div className="flex justify-center">
                      <img
                        src={previewModal.url}
                        alt={previewModal.title}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        onError={(e) => {
                          // Fallback for images that fail to load
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden text-center py-8">
                        <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-lg font-medium">Document</p>
                        <p className="text-sm text-gray-500">Unable to preview this document</p>
                        <Button
                          onClick={() => window.open(previewModal.url!, '_blank')}
                          className="mt-4"
                        >
                          Open in New Tab
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerDetails;