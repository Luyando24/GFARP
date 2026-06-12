import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
  Loader2,
  Trash2,
  Lock,
  Unlock,
  CreditCard,
  Video,
  Share2,
  Camera,
  Globe,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  MessageCircle,
  X as XIcon,
  Link as LinkIcon,
  Image as ImageIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Api, Player } from '@/lib/api';
import { NetworkError } from "@/lib/errors";
import { uploadPlayerDocument, getPlayerDocuments, deletePlayerDocument, type PlayerDocument } from '@/lib/document-upload';
import { countryCodes, formatPhoneDisplay, parsePhoneNumber } from '@/lib/countryCodes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import jsPDF from 'jspdf';

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
  // Rich profile fields (replicated from individual players)
  bio?: string;
  career_history?: string;
  honours?: string;
  education?: string;
  video_links?: string[];
  transfermarket_link?: string;
  gallery_images?: string[];
  cover_image_url?: string;
  contact_email?: string;
  whatsapp_number?: string;
  social_links?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    facebook?: string;
  };
  slug?: string;
  display_name?: string;
  profile_image_url?: string;
}

// Helper to convert image URL to Base64 for PDF embedding
const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (url.startsWith('data:')) {
        resolve(url);
        return;
    }

    const img = new window.Image();
    const cacheBuster = url.includes('?') ? `&t=${new Date().getTime()}` : `?t=${new Date().getTime()}`;
    img.crossOrigin = 'anonymous'; 
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        try {
            const dataURL = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataURL);
        } catch (e) {
            console.error("Canvas export failed (likely CORS)", e);
            reject(new Error("Canvas export failed"));
        }
      } else {
        reject(new Error("Canvas context failed"));
      }
    };
    img.onerror = (e) => {
      console.error("Image loading failed:", url, e);
      reject(new Error("Image failed to load"));
    };
    
    if (url.startsWith('http')) {
        img.src = url + cacheBuster;
    } else {
        img.src = url;
    }
  });
};

const PlayerDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [player, setPlayer] = useState<DetailedPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
  const [formData, setFormData] = useState<Partial<DetailedPlayer>>({});
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState("scouting");

  // Slug Verification State
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null); // null = not checked, true = available, false = taken
  const [slugMessage, setSlugMessage] = useState("");

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

  const [deleting, setDeleting] = useState(false);

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

  // Slug check effect
  useEffect(() => {
    const checkSlug = async () => {
      const slug = formData.slug;
      
      if (!slug || (player && slug === player.slug)) {
        setSlugAvailable(null);
        setSlugMessage("");
        return;
      }

      setIsCheckingSlug(true);
      try {
        const response = await Api.checkAcademySlugAvailability(slug, player?.id);
        setSlugAvailable(response.available);
        setSlugMessage(response.message);
      } catch (error) {
        console.error("Failed to check slug", error);
        setSlugAvailable(null);
      } finally {
        setIsCheckingSlug(false);
      }
    };

    const timer = setTimeout(checkSlug, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [formData.slug, player]);

  const fetchPlayerDetails = async () => {
    try {
      console.log('[PlayerDetails] Fetching player with ID:', id);
      setLoading(true);
      setError(null);

      if (!id) {
        const errorMsg = 'No player ID provided';
        console.error('[PlayerDetails]', errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      const response = await Api.getPlayer(id);
      console.log('[PlayerDetails] API response:', { success: response.success, hasData: !!response.data });

      if (response.success && response.data) {
        // Parse the combined phone number
        const { countryCode, phoneNumber } = parsePhoneNumber(response.data.phone || '');

        // Set player data with parsed phone and mapped guardian fields
        const playerData = mapGuardianToParentFields({
          ...response.data,
          phoneCountryCode: countryCode,
          phone: phoneNumber
        });

        console.log('[PlayerDetails] Player data loaded successfully:', playerData.firstName, playerData.lastName);
        setPlayer(playerData);
        setFormData(playerData);
        // Load existing documents
        await loadPlayerDocuments(response.data.id);
      } else {
        const errorMsg = response.message || 'Failed to load player details';
        console.error('[PlayerDetails] API returned error:', errorMsg);
        setError(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to load player details';
      console.error('[PlayerDetails] Error fetching player details:', error);
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPlayerDocuments = async (playerId: string) => {
    try {
      console.log('[PlayerDetails] Loading documents for player:', playerId, 'isAdmin:', isAdmin);
      setDocumentLoading(true);
      const result = await getPlayerDocuments(playerId, isAdmin);
      console.log('[PlayerDetails] Documents loaded:', result.success, 'count:', result.documents?.length);
      if (result.success) {
        setSavedDocuments(result.documents);
      } else {
        console.warn('[PlayerDetails] Failed to load documents');
      }
    } catch (error) {
      console.error('[PlayerDetails] Error loading player documents:', error);
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

  const handleSocialLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      social_links: {
        ...(prev.social_links || {}),
        [name]: value
      }
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string, index?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (field === 'profile_image_url') {
          setFormData(prev => ({ ...prev, profile_image_url: result }));
        } else if (field === 'cover_image_url') {
          setFormData(prev => ({ ...prev, cover_image_url: result }));
        } else if (field === 'gallery_images' && index !== undefined) {
          const newGallery = [...(formData.gallery_images || ['', '', ''])];
          newGallery[index] = result;
          setFormData(prev => ({ ...prev, gallery_images: newGallery }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!player) return;

    if (slugAvailable === false) {
      toast({
        title: "Invalid custom link",
        description: "Please choose a different link name before saving.",
        variant: "destructive"
      });
      return;
    }

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
        fetchPlayerDetails();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to update player details",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error updating player details:", error);

      if (error instanceof NetworkError || error.message === 'Unable to connect to server' || error.message?.includes('fetch')) {
        toast({
          title: "Network Error",
          description: "Unable to save changes. Please check your internet connection.",
          variant: "destructive"
        });
        setSaving(false);
        return;
      }

      // Fallback update
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
          const apiDocType = docType === 'passportId' ? 'passport_id' : 
                            docType === 'playerPhoto' ? 'player_photo' : 
                            docType === 'proofOfTraining' ? 'proof_of_training' : 
                            'birth_certificate';
          const result = await uploadPlayerDocument(player.id, file, apiDocType as any);
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
    if (!dateOfBirth) return 0;
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
      const maxSize = 5 * 1024 * 1024; // 5MB limit
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

  const handleDeleteAccount = async () => {
    if (!player) return;

    if (!window.confirm(`Are you sure you want to delete ${player.firstName} ${player.lastName}'s account? This action is permanent and will delete all associated data.`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/individual-players/${player.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Player Deleted",
          description: "The player account has been removed successfully."
        });
        navigate('/admin-dashboard');
      } else {
        throw new Error(data.error || 'Failed to delete player');
      }
    } catch (error: any) {
      console.error("Error deleting player:", error);
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdatePlan = async (planType: 'pro') => {
    if (!player) return;

    try {
      const response = await fetch(`/api/individual-players/${player.id}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType })
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Plan Updated",
          description: `Player plan has been updated to Pro`
        });
        fetchPlayerDetails();
      } else {
        throw new Error(data.error || 'Failed to update plan');
      }
    } catch (error: any) {
      console.error("Error updating plan:", error);
      toast({
        title: "Update Failed",
        description: error.message,
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
    return savedDocuments.find(doc => doc.document_type === documentType && doc.is_active !== false);
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

  const getPublicUrl = () => {
    if (!player) return "";
    
    if (player.slug) {
       const hostname = window.location.hostname;
       if (hostname.includes('soccercircular.com')) {
           return `${window.location.protocol}//${player.slug}.soccercircular.com`;
       }
       return `${window.location.origin}/${player.slug}`;
    }
    
    return `${window.location.origin}/player/public/${player.id}`;
  };

  const copyPublicLink = () => {
    if (!player) return;
    const url = getPublicUrl();
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Profile link copied to clipboard!"
    });
  };

  const generatePDF = async () => {
    if (!player) return;
    const toastId = toast({
      title: "Generating PDF",
      description: "Please wait while we compile the scouting report...",
    });

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      let y = 0;

      // Helper for text wrapping
      const printText = (text: string, x: number, yPos: number, size: number = 12, font: string = "helvetica", style: string = "normal", color: [number, number, number] = [0, 0, 0], maxWidth?: number) => {
        doc.setFont(font, style);
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
        if (maxWidth) {
          const splitText = doc.splitTextToSize(text, maxWidth);
          doc.text(splitText, x, yPos);
          return splitText.length * (size * 0.5); // Approx height
        } else {
          doc.text(text, x, yPos);
          return size * 0.5;
        }
      };

      // --- HEADER ---
      doc.setFillColor(34, 197, 94); // Green-500
      doc.rect(0, 0, pageWidth, 50, 'F');

      printText("SOCCER CIRCULAR", margin, 15, 10, "helvetica", "bold", [255, 255, 255]);
      printText("SCOUTING REPORT", margin, 20, 8, "helvetica", "normal", [220, 220, 220]);

      const displayName = player.display_name || `${player.firstName} ${player.lastName}`.trim();
      printText(displayName, margin, 35, 24, "helvetica", "bold", [255, 255, 255]);
      
      if (player.position) {
         printText(player.position.toUpperCase(), margin, 42, 12, "helvetica", "bold", [255, 255, 255]);
      }

      // --- PROFILE IMAGE ---
      y = 60;
      const profilePhoto = player.profile_image_url || getSavedDocument('player_photo')?.file_url;
      if (profilePhoto) {
        try {
           const base64Img = await getBase64ImageFromURL(profilePhoto);
           doc.addImage(base64Img, 'JPEG', pageWidth - margin - 35, 8, 35, 35);
        } catch (e) {
           console.error("Could not load profile image", e);
        }
      }

      // --- INFO GRID ---
      const col1X = margin;
      const col2X = pageWidth / 2 + 10;
      
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y); // Separator
      y += 10;

      const addInfoRow = (label: string, value: string | number | undefined | null, x: number, currentY: number) => {
         if (!value) return 0;
         doc.setFont("helvetica", "bold");
         doc.setFontSize(10);
         doc.setTextColor(100, 100, 100);
         doc.text(label.toUpperCase(), x, currentY);
         
         doc.setFont("helvetica", "bold");
         doc.setFontSize(12);
         doc.setTextColor(0, 0, 0);
         doc.text(String(value), x, currentY + 5);
         return 15; // row height
      };

      let leftY = y;
      let rightY = y;

      const ageVal = player.dateOfBirth ? `${calculateAge(player.dateOfBirth)} Years` : "-";
      leftY += addInfoRow("Age", ageVal, col1X, leftY);
      leftY += addInfoRow("Nationality", player.nationality, col1X, leftY);
      leftY += addInfoRow("Current Club", player.currentClub, col1X, leftY);

      rightY += addInfoRow("Height", player.height ? `${player.height} cm` : "-", col2X, rightY);
      rightY += addInfoRow("Weight", player.weight ? `${player.weight} kg` : "-", col2X, rightY);
      rightY += addInfoRow("Preferred Foot", player.preferredFoot, col2X, rightY);

      y = Math.max(leftY, rightY) + 5;

      // Contact Info
      const contactEmail = player.contact_email || player.email;
      const whatsappNumber = player.whatsapp_number || player.phone;
      if (contactEmail || whatsappNumber) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, pageWidth - (margin * 2), 25, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.rect(margin, y, pageWidth - (margin * 2), 25, 'S');
        
        let contactX = margin + 5;
        const contactY = y + 8;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text("CONTACT DETAILS", contactX, contactY);
        
        let detailsY = contactY + 8;
        if (contactEmail) {
           doc.setFont("helvetica", "normal");
           doc.text(`Email: ${contactEmail}`, contactX, detailsY);
           detailsY += 6;
        }
        if (whatsappNumber) {
           doc.setFont("helvetica", "normal");
           doc.text(`WhatsApp: ${whatsappNumber}`, contactX, detailsY);
        }
        y += 35;
      }

      // --- SECTIONS ---
      const addSection = (title: string, content: string | undefined | null) => {
         if (!content) return;
         
         if (y > pageHeight - 40) {
            doc.addPage();
            y = 20;
         }

         doc.setFont("helvetica", "bold");
         doc.setFontSize(14);
         doc.setTextColor(34, 197, 94);
         doc.text(title, margin, y);
         y += 2;
         doc.setDrawColor(34, 197, 94);
         doc.line(margin, y, margin + 20, y);
         y += 8;

         doc.setFont("helvetica", "normal");
         doc.setFontSize(11);
         doc.setTextColor(50, 50, 50);
         
         const splitContent = doc.splitTextToSize(content, pageWidth - (margin * 2));
         doc.text(splitContent, margin, y);
         y += (splitContent.length * 5) + 10;
      };

      addSection("Professional Bio", player.bio);
      addSection("Career History", player.career_history);
      addSection("Honours & Achievements", player.honours);
      addSection("Education", player.education);

      // --- LINKS ---
      if ((player.video_links && player.video_links.length > 0) || player.transfermarket_link) {
         if (y > pageHeight - 40) {
            doc.addPage();
            y = 20;
         }
         
         doc.setFont("helvetica", "bold");
         doc.setFontSize(14);
         doc.setTextColor(34, 197, 94);
         doc.text("Links & Media", margin, y);
         y += 10;

         doc.setFont("helvetica", "normal");
         doc.setFontSize(11);
         doc.setTextColor(0, 0, 255);

         if (player.transfermarket_link) {
            doc.textWithLink("TransferMarket Profile", margin, y, { url: player.transfermarket_link });
            y += 8;
         }

         if (player.video_links) {
            player.video_links.forEach((link, i) => {
               if (link) {
                  doc.textWithLink(`Video Highlight #${i+1}`, margin, y, { url: link });
                  y += 8;
               }
            });
         }
      }

      // --- GALLERY ---
      if (player.gallery_images && player.gallery_images.some(img => img)) {
         doc.addPage();
         y = 20;
         doc.setFont("helvetica", "bold");
         doc.setFontSize(14);
         doc.setTextColor(0, 0, 0);
         doc.text("Image Gallery", margin, y);
         y += 15;

         const validImages = player.gallery_images.filter(img => img);
         let xPos = margin;
         const imgW = (pageWidth - (margin * 3)) / 2;
         const imgH = imgW * 0.75;

         for (let i = 0; i < validImages.length; i++) {
            const imgUrl = validImages[i];
            if (!imgUrl) continue;

            try {
               if (y + imgH > pageHeight - 20) {
                  doc.addPage();
                  y = 20;
               }

               const base64 = await getBase64ImageFromURL(imgUrl);
               doc.addImage(base64, 'JPEG', xPos, y, imgW, imgH);
               
               if (xPos === margin) {
                  xPos += imgW + margin;
               } else {
                  xPos = margin;
                  y += imgH + 10;
               }
            } catch (e) {
               console.warn("Failed to load gallery image for PDF", e);
            }
         }
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated by Soccer Circular - Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      doc.save(`${displayName.replace(/\s+/g, '_')}_Profile.pdf`);
      toast({
        title: "Success",
        description: "PDF Scouting Report downloaded successfully!",
      });

    } catch (err) {
      console.error("PDF Generation Error", err);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!player && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-2xl shadow-xl border">
          <h2 className="text-2xl font-bold mb-2">Player Not Found</h2>
          <p className="text-gray-600 mb-2">The requested player could not be found.</p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 mt-4">
              <p className="text-sm text-red-800 font-medium mb-1">Error Details:</p>
              <p className="text-sm text-red-700">{error}</p>
              {id && <p className="text-xs text-red-600 mt-2">Player ID: {id}</p>}
            </div>
          )}
          <Button onClick={() => navigate(-1)} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${(firstName?.[0] || 'P')}${(lastName?.[0] || 'L')}`.toUpperCase().slice(0, 2);
  };

  const displayName = player.display_name || `${player.firstName} ${player.lastName}`.trim();
  const profilePhotoUrl = formData.profile_image_url || player.profile_image_url || getSavedDocument('player_photo')?.file_url;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200 dark:border-slate-800 py-4 mb-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="hover:bg-slate-100 dark:hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tight text-slate-900 dark:text-white">{displayName}</h1>
              <p className="text-slate-500 text-sm font-medium">Academy Scouting Profile</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setFormData(mapGuardianToParentFields(player));
                }} className="border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Persistent Sidebar Overview Card */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-slate-100 dark:border-slate-800 overflow-hidden sticky top-24">
              {/* Profile Card Header Image (Green Gradient) */}
              <div className="h-24 bg-gradient-to-br from-green-500 to-green-600 w-full relative" />
              <CardContent className="pt-0 flex flex-col items-center relative -mt-12">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-900 shadow-lg relative bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {profilePhotoUrl ? (
                      <img
                        src={profilePhotoUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-black text-slate-400">
                        {getInitials(player.firstName, player.lastName)}
                      </span>
                    )}
                  </div>
                  {isEditing && (
                    <label
                      htmlFor="profile-pic-upload"
                      className="absolute bottom-0 right-0 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full cursor-pointer shadow-md transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                      <input
                        id="profile-pic-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'profile_image_url')}
                      />
                    </label>
                  )}
                </div>

                <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white mt-4 text-center">
                  {displayName}
                </h3>
                <p className="text-slate-500 font-bold text-sm tracking-wider uppercase mt-1">{player.position}</p>
                <p className="text-slate-400 text-xs mt-0.5">{player.currentClub || 'No Club'}</p>

                <div className="w-full mt-6 space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800/50">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Age</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {player.dateOfBirth ? `${calculateAge(player.dateOfBirth)} Years` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800/50">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Nationality</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{player.nationality || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800/50">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Height</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {player.height ? `${player.height} cm` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800/50">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Weight</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {player.weight ? `${player.weight} kg` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800/50">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Preferred Foot</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{player.preferredFoot || '-'}</span>
                  </div>
                  {player.jerseyNumber && (
                    <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800/50">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Jersey</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">#{player.jerseyNumber}</span>
                    </div>
                  )}
                </div>

                <Badge variant={player.isActive ? 'default' : 'destructive'} className="mt-6 px-3 py-1 text-xs uppercase tracking-widest font-black">
                  {player.isActive ? 'Active Member' : 'Inactive'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Main Area with Tabs */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-3 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm h-12">
                <TabsTrigger value="scouting" className="rounded-lg font-bold tracking-wide text-sm data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800">Scouting Profile</TabsTrigger>
                <TabsTrigger value="academy" className="rounded-lg font-bold tracking-wide text-sm data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800">Academy Details</TabsTrigger>
                <TabsTrigger value="documents" className="rounded-lg font-bold tracking-wide text-sm data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800">Documents & Notes</TabsTrigger>
              </TabsList>

              {/* TABS VIEW MODE */}
              {!isEditing && (
                <>
                  {/* scouting profile view */}
                  <TabsContent value="scouting" className="space-y-6 outline-none">
                    {/* Cover photo banner */}
                    <div className="relative aspect-[3/1] bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm flex items-end">
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent z-10" />
                      {player.cover_image_url ? (
                        <img
                          src={player.cover_image_url}
                          alt="Cover banner"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-green-500/20 to-blue-600/30 opacity-60" />
                      )}
                      <div className="relative z-20 p-6 w-full flex items-center justify-between text-white">
                        <div>
                          <Badge className="bg-green-500 text-white font-black uppercase text-[10px] tracking-wider mb-2">Verified Scouting Profile</Badge>
                          <h2 className="text-3xl font-black uppercase italic tracking-tight">{displayName}</h2>
                        </div>
                      </div>
                    </div>

                    {/* Scouting Report & Share widgets */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                        <CardHeader>
                          <CardTitle className="text-lg font-black uppercase italic text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-green-500" />
                            Scouting Report
                          </CardTitle>
                          <CardDescription>Download compiled scouting resume profile as PDF.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button onClick={generatePDF} className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md">
                            <Upload className="h-4 w-4 mr-2 rotate-180" />
                            Download Scouting Report (PDF)
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                        <CardHeader>
                          <CardTitle className="text-lg font-black uppercase italic text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Share2 className="h-5 w-5 text-blue-500" />
                            Digital Profile Link
                          </CardTitle>
                          <CardDescription>Share this scouting link with scouts, coaches, and agents.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex gap-2">
                            <Button onClick={copyPublicLink} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                              <Share2 className="h-4 w-4 mr-2" />
                              Copy Profile Link
                            </Button>
                            {player.slug && (
                              <Button variant="outline" asChild className="p-3 border-slate-200">
                                <a href={getPublicUrl()} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                          
                          <div className="flex gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2 border-slate-100 hover:bg-green-50 dark:hover:bg-green-900/10 text-xs font-bold"
                              onClick={() => {
                                const url = getPublicUrl();
                                window.open(`https://wa.me/?text=Check out this professional scouting profile: ${url}`, '_blank');
                              }}
                            >
                              <MessageCircle className="h-4 w-4 text-[#25D366]" />
                              WhatsApp
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2 border-slate-100 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-xs font-bold"
                              onClick={() => {
                                const url = getPublicUrl();
                                window.open(`https://twitter.com/intent/tweet?text=Check out this football scouting profile on Soccer Circular: ${url}`, '_blank');
                              }}
                            >
                              <Twitter className="h-4 w-4 text-[#1DA1F2]" />
                              Twitter/X
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Bio & Career history */}
                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider">Professional Bio</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                          {player.bio || "No bio added yet. Click 'Edit Profile' to add a professional bio."}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider">Career History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                          {player.career_history || "No career history recorded yet."}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Honours & Education */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                        <CardHeader>
                          <CardTitle className="text-md font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Honours & Achievements</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line text-sm">
                            {player.honours || "No honours recorded."}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                        <CardHeader>
                          <CardTitle className="text-md font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Education</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line text-sm">
                            {player.education || "No education history recorded."}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Links & Video highlights */}
                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider">Links & Media</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {player.transfermarket_link && (
                          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">TransferMarket Profile</span>
                            <Button variant="link" asChild className="text-blue-600 font-bold">
                              <a href={player.transfermarket_link} target="_blank" rel="noopener noreferrer">
                                Open Link
                              </a>
                            </Button>
                          </div>
                        )}

                        {player.video_links && player.video_links.some(link => link) ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {player.video_links.map((link, idx) => link && (
                              <a
                                key={idx}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative h-36 rounded-2xl overflow-hidden bg-slate-950 border border-slate-100 dark:border-slate-800 block"
                              >
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent z-10" />
                                <div className="absolute inset-0 flex items-center justify-center z-20">
                                  <div className="h-10 w-10 bg-red-600 rounded-full flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
                                    <Video className="h-5 w-5" />
                                  </div>
                                </div>
                                <div className="absolute bottom-4 left-4 z-20">
                                  <p className="text-white font-bold text-sm">Video Reel #{idx + 1}</p>
                                  <p className="text-slate-400 text-[10px] truncate max-w-[180px]">{link}</p>
                                </div>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm italic">No video highlight links added yet.</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Image gallery */}
                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider">Action Gallery</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {player.gallery_images && player.gallery_images.some(img => img) ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {player.gallery_images.map((img, index) => (
                              img && (
                                <div key={index} className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border shadow-sm">
                                  <img src={img} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                </div>
                              )
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No action gallery images uploaded yet.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Social Media links */}
                    {player.social_links && Object.values(player.social_links).some(link => link) && (
                      <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                        <CardHeader>
                          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Social Presence</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-4 justify-center">
                          {player.social_links.instagram && (
                            <a href={player.social_links.instagram} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full hover:text-pink-600 transition-colors border shadow-sm">
                              <Instagram className="h-5 w-5" />
                            </a>
                          )}
                          {player.social_links.twitter && (
                            <a href={player.social_links.twitter} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full hover:text-blue-400 transition-colors border shadow-sm">
                              <Twitter className="h-5 w-5" />
                            </a>
                          )}
                          {player.social_links.linkedin && (
                            <a href={player.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full hover:text-blue-600 transition-colors border shadow-sm">
                              <Linkedin className="h-5 w-5" />
                            </a>
                          )}
                          {player.social_links.facebook && (
                            <a href={player.social_links.facebook} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full hover:text-blue-700 transition-colors border shadow-sm">
                              <Facebook className="h-5 w-5" />
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* academy details view */}
                  <TabsContent value="academy" className="space-y-6 outline-none">
                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider">Personal Information</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">First Name</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{player.firstName}</p>
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">Last Name</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{player.lastName}</p>
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">Date of Birth</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{player.dateOfBirth}</p>
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">Nationality</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{player.nationality || 'Not specified'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
                          <Phone className="h-5 w-5 text-slate-500" />
                          Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">Email</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{player.email || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">Phone Number</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">
                            {formatPhoneDisplay(player.phoneCountryCode || '+260', player.phone || '')}
                          </p>
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">Address</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{player.address || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">City / State</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{player.city || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">Country</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{player.country || '-'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-slate-500" />
                          Training Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">Training Start Date</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{player.trainingStartDate || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">Training End Date</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{player.trainingEndDate || '-'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
                          <User className="h-5 w-5 text-slate-500" />
                          Parent / Guardian Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">Guardian Name</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{player.parentName || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">Guardian Phone</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{player.parentPhone || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">Guardian Email</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{player.parentEmail || '-'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* documents and notes view */}
                  <TabsContent value="documents" className="space-y-6 outline-none">
                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
                          <Shield className="h-5 w-5 text-red-500" />
                          Emergency Contact
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">Emergency Contact Name</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{player.emergencyContact || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs font-bold uppercase">Emergency Contact Phone</Label>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{player.emergencyPhone || '-'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
                          <Heart className="h-5 w-5 text-rose-500" />
                          Medical Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Label className="text-slate-400 text-xs font-bold uppercase">Medical Notes & Allergies</Label>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1 whitespace-pre-line leading-relaxed">
                          {player.medicalInfo || 'No medical issues recorded.'}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-500" />
                          Internal Staff Notes
                        </CardTitle>
                        <CardDescription>Only visible to academy and admin users.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                          {player.internalNotes || 'No internal staff notes recorded.'}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Document Management */}
                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
                          <Upload className="h-5 w-5 text-slate-500" />
                          Document Cloud
                        </CardTitle>
                        <CardDescription>View official player identification and verification documents.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {savedDocuments.length > 0 ? (
                          <div className="space-y-2">
                            {savedDocuments.map((doc) => (
                              <div key={doc.id} className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50 dark:bg-slate-800/50`}>
                                <div className="flex-1">
                                  <p className="font-bold text-sm capitalize">
                                    {doc.document_type.replace(/_/g, ' ')}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate max-w-[300px]">{doc.original_filename}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openPreview(null, doc.document_type, doc.file_url)}
                                    className="border-slate-200"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm italic">No documents uploaded.</p>
                        )}
                      </CardContent>
                    </Card>

                    {player.notes && (
                      <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                        <CardHeader>
                          <CardTitle className="text-md font-bold uppercase tracking-wider text-slate-500">General Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line text-sm">
                            {player.notes}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Admin Actions */}
                    {isAdmin && (
                      <Card className="border-red-100 bg-red-50/10">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-red-700">
                            <Shield className="h-5 w-5" />
                            Admin Control Board
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex flex-wrap gap-3">
                            <div className="w-full space-y-2">
                              <Label className="text-xs font-bold uppercase text-slate-400">Subscription Control</Label>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-white hover:bg-slate-50"
                                  onClick={() => handleUpdatePlan('pro')}
                                >
                                  <CreditCard className="h-4 w-4 mr-2 text-blue-600" />
                                  Activate Pro Access
                                </Button>
                              </div>
                            </div>
                            <div className="w-full pt-4 border-t border-red-100/55">
                              <Label className="text-xs font-bold uppercase text-red-500">Danger Zone</Label>
                              <div className="mt-2">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={handleDeleteAccount}
                                  disabled={deleting}
                                >
                                  {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                  Delete Player Account
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </>
              )}

              {/* TABS EDIT MODE */}
              {isEditing && (
                <>
                  {/* Edit scouting profile */}
                  <TabsContent value="scouting" className="space-y-6 outline-none">
                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider">Scouting Media & Details</CardTitle>
                        <CardDescription>Setup Cover and Profile Images, and Custom public link name.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Cover Image Upload */}
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700 dark:text-slate-300">Scouting Banner Cover Image</Label>
                          <div className="relative aspect-[3/1] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center">
                            {formData.cover_image_url ? (
                              <>
                                <img src={formData.cover_image_url} alt="Cover Banner" className="w-full h-full object-cover" />
                                <label
                                  htmlFor="cover-pic-upload"
                                  className="absolute bottom-2 right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full cursor-pointer shadow-md transition-colors"
                                >
                                  <Camera className="h-4 w-4" />
                                  <input
                                    id="cover-pic-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleImageUpload(e, 'cover_image_url')}
                                  />
                                </label>
                              </>
                            ) : (
                              <label htmlFor="cover-pic-upload" className="cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-blue-500">
                                <ImageIcon className="h-8 w-8 mb-1" />
                                <span className="text-xs">Upload Banner Cover (Base64)</span>
                                <input
                                  id="cover-pic-upload"
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleImageUpload(e, 'cover_image_url')}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Custom Slug Name */}
                        <div className="space-y-2">
                          <Label htmlFor="slug" className="font-bold">Public Scouting Custom Link</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400 font-mono">https://</span>
                            <div className="relative max-w-[240px] w-full">
                              <Input
                                id="slug"
                                name="slug"
                                value={formData.slug || ''}
                                onChange={handleInputChange}
                                placeholder="messi-10"
                                className={`font-mono pr-8 ${slugAvailable === false ? 'border-red-500 focus-visible:ring-red-500' : slugAvailable === true ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                {isCheckingSlug ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                ) : slugAvailable === true ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : slugAvailable === false ? (
                                  <XIcon className="h-4 w-4 text-red-500" />
                                ) : null}
                              </div>
                            </div>
                            <span className="text-sm text-slate-400 font-mono">.{window.location.host}</span>
                          </div>
                          {slugMessage ? (
                            <p className={`text-xs ${slugAvailable === false ? 'text-red-500' : 'text-green-600'}`}>
                              {slugMessage}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400">URL path suffix. Use only lowercase letters, numbers, and hyphens.</p>
                          )}
                        </div>

                        {/* Display Name */}
                        <div className="space-y-2">
                          <Label htmlFor="display_name" className="font-bold">Scouting Display Name</Label>
                          <Input
                            id="display_name"
                            name="display_name"
                            value={formData.display_name || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. L. Messi"
                          />
                        </div>

                        {/* Contact Email & Whatsapp */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="contact_email" className="font-bold">Contact Email for Scouts</Label>
                            <Input
                              id="contact_email"
                              name="contact_email"
                              value={formData.contact_email || ''}
                              onChange={handleInputChange}
                              placeholder="scout-contact@email.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="whatsapp_number" className="font-bold">WhatsApp for Scouts</Label>
                            <Input
                              id="whatsapp_number"
                              name="whatsapp_number"
                              value={formData.whatsapp_number || ''}
                              onChange={handleInputChange}
                              placeholder="+260..."
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Scouting Details Bio, Career, Honours, Edu */}
                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider">Scouting Texts</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="bio" className="font-bold">Professional Bio</Label>
                          <Textarea
                            id="bio"
                            name="bio"
                            value={formData.bio || ''}
                            onChange={handleInputChange}
                            placeholder="Write a brief professional summary about the player's background, qualities, and aspirations..."
                            rows={4}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="career_history" className="font-bold">Career History</Label>
                          <Textarea
                            id="career_history"
                            name="career_history"
                            value={formData.career_history || ''}
                            onChange={handleInputChange}
                            placeholder="Detail previous clubs, seasons played, appearances, goals, and positions..."
                            rows={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="honours" className="font-bold">Honours & Achievements</Label>
                          <Textarea
                            id="honours"
                            name="honours"
                            value={formData.honours || ''}
                            onChange={handleInputChange}
                            placeholder="E.g. League Champion 2024, Top Scorer..."
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="education" className="font-bold">Education</Label>
                          <Textarea
                            id="education"
                            name="education"
                            value={formData.education || ''}
                            onChange={handleInputChange}
                            placeholder="Academic achievements, school/college names, degrees..."
                            rows={3}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* scouting links */}
                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider">Scouting Media Links</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="transfermarket_link" className="font-bold">TransferMarket Profile URL</Label>
                          <Input
                            id="transfermarket_link"
                            name="transfermarket_link"
                            value={formData.transfermarket_link || ''}
                            onChange={handleInputChange}
                            placeholder="https://www.transfermarkt.com/..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold">Video Highlight Link #1</Label>
                          <Input
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={formData.video_links?.[0] || ''}
                            onChange={(e) => {
                              const newLinks = [...(formData.video_links || ['', ''])];
                              newLinks[0] = e.target.value;
                              setFormData(prev => ({ ...prev, video_links: newLinks }));
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold">Video Highlight Link #2</Label>
                          <Input
                            placeholder="https://vimeo.com/..."
                            value={formData.video_links?.[1] || ''}
                            onChange={(e) => {
                              const newLinks = [...(formData.video_links || ['', ''])];
                              newLinks[1] = e.target.value;
                              setFormData(prev => ({ ...prev, video_links: newLinks }));
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* scouting gallery */}
                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider">Scouting Image Gallery (Max 3)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {[0, 1, 2].map((index) => (
                            <div key={index} className="space-y-2">
                              <div className="relative aspect-video bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center group hover:border-blue-500 transition-colors">
                                {formData.gallery_images?.[index] ? (
                                  <>
                                    <img
                                      src={formData.gallery_images[index]}
                                      alt={`Gallery image ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <label
                                        htmlFor={`gallery-file-upload-${index}`}
                                        className="p-1.5 bg-white text-slate-800 rounded-full cursor-pointer hover:bg-slate-100"
                                        title="Change Image"
                                      >
                                        <Camera className="h-4 w-4" />
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newGallery = [...(formData.gallery_images || [])];
                                          newGallery[index] = '';
                                          setFormData(prev => ({ ...prev, gallery_images: newGallery }));
                                        }}
                                        className="p-1.5 bg-white text-red-600 rounded-full hover:bg-red-50"
                                        title="Remove Image"
                                      >
                                        <XIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <label
                                    htmlFor={`gallery-file-upload-${index}`}
                                    className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-blue-500"
                                  >
                                    <ImageIcon className="h-8 w-8 mb-1" />
                                    <span className="text-xs">Upload Photo</span>
                                  </label>
                                )}
                                <input
                                  id={`gallery-file-upload-${index}`}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleImageUpload(e, 'gallery_images', index)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* social media inputs */}
                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider">Social Links</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Instagram className="h-4 w-4" />
                          </div>
                          <Input
                            name="instagram"
                            value={formData.social_links?.instagram || ''}
                            onChange={handleSocialLinkChange}
                            placeholder="Instagram Profile URL"
                            className="pl-10"
                          />
                        </div>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Twitter className="h-4 w-4" />
                          </div>
                          <Input
                            name="twitter"
                            value={formData.social_links?.twitter || ''}
                            onChange={handleSocialLinkChange}
                            placeholder="Twitter/X Profile URL"
                            className="pl-10"
                          />
                        </div>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Linkedin className="h-4 w-4" />
                          </div>
                          <Input
                            name="linkedin"
                            value={formData.social_links?.linkedin || ''}
                            onChange={handleSocialLinkChange}
                            placeholder="LinkedIn Profile URL"
                            className="pl-10"
                          />
                        </div>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Facebook className="h-4 w-4" />
                          </div>
                          <Input
                            name="facebook"
                            value={formData.social_links?.facebook || ''}
                            onChange={handleSocialLinkChange}
                            placeholder="Facebook Profile URL"
                            className="pl-10"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Edit academy details */}
                  <TabsContent value="academy" className="space-y-6 outline-none">
                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider">Personal Information</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            name="firstName"
                            value={formData.firstName || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            name="lastName"
                            value={formData.lastName || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dateOfBirth">Date of Birth</Label>
                          <Input
                            id="dateOfBirth"
                            name="dateOfBirth"
                            type="date"
                            value={formData.dateOfBirth || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nationality">Nationality</Label>
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
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="position">Position</Label>
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
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="jerseyNumber">Jersey Number</Label>
                          <Input
                            id="jerseyNumber"
                            name="jerseyNumber"
                            type="number"
                            value={formData.jerseyNumber || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="preferredFoot">Preferred Foot</Label>
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
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
                          <Phone className="h-5 w-5 text-slate-500" />
                          Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <div className="relative">
                            <Select
                              value={formData.phoneCountryCode || '+260'}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, phoneCountryCode: value }))}
                            >
                              <SelectTrigger className="w-20 absolute left-0 top-0 h-full border-r-0 rounded-r-none z-10 bg-slate-50 dark:bg-slate-800">
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
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currentClub">Current Club</Label>
                          <Input
                            id="currentClub"
                            name="currentClub"
                            value={formData.currentClub || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          <Input
                            id="address"
                            name="address"
                            value={formData.address || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">City / State</Label>
                          <Input
                            id="city"
                            name="city"
                            value={formData.city || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Input
                            id="country"
                            name="country"
                            value={formData.country || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-slate-500" />
                          Training Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="trainingStartDate">Training Start Date</Label>
                          <Input
                            id="trainingStartDate"
                            name="trainingStartDate"
                            type="date"
                            value={formData.trainingStartDate || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="trainingEndDate">Training End Date</Label>
                          <Input
                            id="trainingEndDate"
                            name="trainingEndDate"
                            type="date"
                            value={formData.trainingEndDate || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
                          <User className="h-5 w-5 text-slate-500" />
                          Parent / Guardian Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="parentName">Guardian Name</Label>
                          <Input
                            id="parentName"
                            name="parentName"
                            value={formData.parentName || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="parentPhone">Guardian Phone</Label>
                          <Input
                            id="parentPhone"
                            name="parentPhone"
                            value={formData.parentPhone || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="parentEmail">Guardian Email</Label>
                          <Input
                            id="parentEmail"
                            name="parentEmail"
                            type="email"
                            value={formData.parentEmail || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Edit documents & notes */}
                  <TabsContent value="documents" className="space-y-6 outline-none">
                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
                          <Shield className="h-5 w-5 text-red-500" />
                          Emergency Contact
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                          <Input
                            id="emergencyContact"
                            name="emergencyContact"
                            value={formData.emergencyContact || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                          <Input
                            id="emergencyPhone"
                            name="emergencyPhone"
                            value={formData.emergencyPhone || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
                          <Heart className="h-5 w-5 text-rose-500" />
                          Medical Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Label htmlFor="medicalInfo">Medical Information & Allergies</Label>
                        <Textarea
                          id="medicalInfo"
                          name="medicalInfo"
                          rows={4}
                          value={formData.medicalInfo || ''}
                          onChange={handleInputChange}
                          placeholder="Any medical conditions, allergies, or important health information..."
                        />
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-500" />
                          Internal Notes
                        </CardTitle>
                        <CardDescription>Internal staff notes about training, conduct, etc.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Label htmlFor="internalNotes">Staff Internal Notes</Label>
                        <Textarea
                          id="internalNotes"
                          name="internalNotes"
                          rows={4}
                          value={formData.internalNotes || ''}
                          onChange={handleInputChange}
                          placeholder="Internal observations, comments, or notes for coaches..."
                        />
                      </CardContent>
                    </Card>

                    {/* Document uploads */}
                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
                          <Upload className="h-5 w-5 text-slate-500" />
                          Upload Documents
                        </CardTitle>
                        <CardDescription>Select documents to upload. They will be processed when you save changes.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Passport / ID */}
                        <div className="flex items-center justify-between p-3 border rounded-xl bg-slate-50 dark:bg-slate-800/20">
                          <div className="flex-1">
                            <p className="font-bold text-sm">Passport or ID</p>
                            <p className="text-xs text-slate-500">Official government ID document</p>
                            {getDocumentDisplayInfo('passportId', 'passport_id') && (
                              <p className="text-xs text-blue-600 mt-1 font-semibold">
                                Selected: {getDocumentDisplayInfo('passportId', 'passport_id')?.name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
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
                              className="border-slate-200"
                            >
                              {getDocumentStatus('passportId', 'passport_id') !== 'pending' ? 'Change' : 'Upload'}
                            </Button>
                          </div>
                        </div>

                        {/* Player Photo */}
                        <div className="flex items-center justify-between p-3 border rounded-xl bg-slate-50 dark:bg-slate-800/20">
                          <div className="flex-1">
                            <p className="font-bold text-sm">Player Photo</p>
                            <p className="text-xs text-slate-500">Headshot portrait photo</p>
                            {getDocumentDisplayInfo('playerPhoto', 'player_photo') && (
                              <p className="text-xs text-blue-600 mt-1 font-semibold">
                                Selected: {getDocumentDisplayInfo('playerPhoto', 'player_photo')?.name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
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
                              className="border-slate-200"
                            >
                              {getDocumentStatus('playerPhoto', 'player_photo') !== 'pending' ? 'Change' : 'Upload'}
                            </Button>
                          </div>
                        </div>

                        {/* Proof of Training */}
                        <div className="flex items-center justify-between p-3 border rounded-xl bg-slate-50 dark:bg-slate-800/20">
                          <div className="flex-1">
                            <p className="font-bold text-sm">Proof of Training</p>
                            <p className="text-xs text-slate-500">Official certificate or registration proof</p>
                            {getDocumentDisplayInfo('proofOfTraining', 'proof_of_training') && (
                              <p className="text-xs text-blue-600 mt-1 font-semibold">
                                Selected: {getDocumentDisplayInfo('proofOfTraining', 'proof_of_training')?.name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
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
                              className="border-slate-200"
                            >
                              {getDocumentStatus('proofOfTraining', 'proof_of_training') !== 'pending' ? 'Change' : 'Upload'}
                            </Button>
                          </div>
                        </div>

                        {/* Birth Certificate */}
                        <div className="flex items-center justify-between p-3 border rounded-xl bg-slate-50 dark:bg-slate-800/20">
                          <div className="flex-1">
                            <p className="font-bold text-sm">Birth Certificate</p>
                            <p className="text-xs text-slate-500">Age verification certificate</p>
                            {getDocumentDisplayInfo('birthCertificate', 'birth_certificate') && (
                              <p className="text-xs text-blue-600 mt-1 font-semibold">
                                Selected: {getDocumentDisplayInfo('birthCertificate', 'birth_certificate')?.name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
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
                              className="border-slate-200"
                            >
                              {getDocumentStatus('birthCertificate', 'birth_certificate') !== 'pending' ? 'Change' : 'Upload'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-wider">General Notes</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          name="notes"
                          rows={4}
                          value={formData.notes || ''}
                          onChange={handleInputChange}
                          placeholder="General notes or observations..."
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewModal.isOpen && (previewModal.file || previewModal.url) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden shadow-2xl border dark:border-slate-800">
            <div className="flex items-center justify-between p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <h3 className="text-lg font-bold uppercase italic text-slate-800 dark:text-slate-200">{previewModal.title.replace(/_/g, ' ')}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePreview}
                className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
              >
                ✕
              </Button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-120px)] bg-slate-100 dark:bg-slate-950 flex justify-center items-center">
              {previewModal.file ? (
                <>
                  {previewModal.file.type.startsWith('image/') ? (
                    <div className="flex justify-center p-4">
                      <img
                        src={getFilePreviewUrl(previewModal.file)}
                        alt={previewModal.title}
                        className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                      />
                    </div>
                  ) : previewModal.file.type === 'application/pdf' ? (
                    <div className="flex flex-col items-center space-y-4 w-full">
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
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Download PDF
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">File Preview Not Available</p>
                      <Button
                        onClick={() => {
                          const url = getFilePreviewUrl(previewModal.file!);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = previewModal.file!.name;
                          link.click();
                        }}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Download File
                      </Button>
                    </div>
                  )}
                </>
              ) : previewModal.url ? (
                <>
                  {previewModal.url.toLowerCase().includes('.pdf') ? (
                    <iframe
                      src={previewModal.url}
                      className="w-full h-96 border rounded-lg"
                      title={previewModal.title}
                    />
                  ) : (
                    <div className="flex justify-center p-4">
                      <img
                        src={previewModal.url}
                        alt={previewModal.title}
                        className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden text-center py-8">
                        <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-slate-800 dark:text-slate-200">Document</p>
                        <Button
                          onClick={() => window.open(previewModal.url!, '_blank')}
                          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
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