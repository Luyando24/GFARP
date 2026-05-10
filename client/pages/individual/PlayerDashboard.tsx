import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PlayerApi, PlayerProfile } from "@/lib/api";
import { NetworkError } from "@/lib/errors";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import PlayerPaymentMethodSelector from "@/components/PlayerPaymentMethodSelector";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Download,
  Link as LinkIcon,
  Edit,
  Save,
  Check,
  User,
  Share2,
  Home,
  CreditCard,
  Menu,
  X,
  Search,
  LogOut,
  Settings,
  Bell,
  Trophy,
  Star,
  FileText,
  Image as ImageIcon,
  Upload,
  Camera,
  Eye,
  MessageCircle,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Globe,
  Lock,
  Shield,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import ThemeToggle from "@/components/navigation/ThemeToggle";
import LanguageToggle from "@/components/navigation/LanguageToggle";
import { useTranslation } from "@/lib/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePageTitle } from "@/hooks/usePageTitle";

// Helper to convert image URL to Base64 for PDF embedding
const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If it's already a data URL, return it directly
    if (url.startsWith('data:')) {
        resolve(url);
        return;
    }

    const img = new window.Image();
    // Cache buster to bypass browser cache which might lack CORS headers
    const cacheBuster = url.includes('?') ? `&t=${new Date().getTime()}` : `?t=${new Date().getTime()}`;
    img.crossOrigin = 'anonymous'; 
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw white background first to handle transparency
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
    
    // Only append cache buster for http(s) URLs to avoid breaking other schemes
    if (url.startsWith('http')) {
        img.src = url + cacheBuster;
    } else {
        img.src = url;
    }
  });
};

export default function PlayerDashboard() {
  const { session, logout } = useAuth();
  const { t, dir } = useTranslation();
  usePageTitle(t('dash.portal.player'));
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Layout State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [formData, setFormData] = useState<Partial<PlayerProfile>>({});
  
  // Slug Verification State
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null); // null = not checked, true = available, false = taken
  const [slugMessage, setSlugMessage] = useState("");

  // Subscription State
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlanForPurchase, setSelectedPlanForPurchase] = useState<any | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchPlans();
    checkPaymentStatus();
  }, []);

  // Slug check effect
  useEffect(() => {
    const checkSlug = async () => {
      const slug = formData.slug;
      
      // Don't check if empty or same as original (if we had the original stored separately, but here we assume if it matches profile.slug it's fine)
      if (!slug || (profile && slug === profile.slug)) {
        setSlugAvailable(null);
        setSlugMessage("");
        return;
      }

      setIsCheckingSlug(true);
      try {
        const response = await PlayerApi.checkSlugAvailability(slug);
        setSlugAvailable(response.available);
        setSlugMessage(response.message);
      } catch (error) {
        console.error("Failed to check slug", error);
        setSlugAvailable(null); // Treat as unchecked on error
      } finally {
        setIsCheckingSlug(false);
      }
    };

    const timer = setTimeout(checkSlug, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [formData.slug, profile]);

  const fetchPlans = async () => {
    try {
      const response = await PlayerApi.getPlans();
      if (response.success && response.data) {
        setPlans(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch plans", error);
    }
  };

  // Helper to check if current plan has a feature
  const hasFeature = (featureName: string) => {
    if (currentPlan === 'pro') return true; // Legacy/Exempted
    if (!currentPlan || currentPlan === 'free') {
       // Default free features
       const freeFeatures = ["Basic player profile", "Public profile link", "Document storage (500MB)"];
       return freeFeatures.some(f => f.toLowerCase().includes(featureName.toLowerCase()));
    }
    const plan = plans.find(p => p.id === currentPlan);
    if (!plan) return false;
    const features = Array.isArray(plan.features) ? plan.features : [];
    return features.some((f: string) => f.toLowerCase().includes(featureName.toLowerCase()));
  };

  const checkPaymentStatus = async () => {
    const paymentSuccess = searchParams.get('payment_success');
    const sessionId = searchParams.get('session_id');
    const paymentCancelled = searchParams.get('payment_cancelled');

    if (paymentSuccess === 'true' && sessionId) {
      try {
        await PlayerApi.verifyPayment(sessionId);
        toast.success("Subscription activated successfully!");
        // Refresh profile to get updated plan status
        fetchProfile();
        // Clean up URL
        setSearchParams(prev => {
          prev.delete('payment_success');
          prev.delete('session_id');
          return prev;
        });
      } catch (error) {
        console.error("Payment verification failed", error);
        toast.error("Failed to verify payment. Please contact support.");
      }
    } else if (paymentCancelled === 'true') {
      toast.info("Payment cancelled.");
      setSearchParams(prev => {
        prev.delete('payment_cancelled');
        return prev;
      });
    }
  };

  const fetchProfile = async () => {
    try {
      const data = await PlayerApi.getProfile();
      setProfile(data);
      setFormData(data);
      if (data.active_plan) {
        setCurrentPlan(data.active_plan);
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSocialLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [name]: value
      }
    }));
  };

  const handleSaveProfile = async () => {
    // Prevent save if slug is invalid (and explicitly checked as false)
    if (slugAvailable === false) {
      toast.error("Please choose a different link name before saving.");
      return;
    }

    setSaving(true);
    try {
      await PlayerApi.updateProfile(formData);
      // Safely merge profile to ensure state updates
      setProfile(prev => prev ? { ...prev, ...formData } as PlayerProfile : formData as PlayerProfile);
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Failed to update profile", error);
      
      // Handle Network Errors specifically
      if (error instanceof NetworkError || error.message === 'Unable to connect to server' || error.message?.includes('fetch')) {
        toast.error("Network Error: Unable to save changes. Please check your internet connection and try again.");
        return;
      }

      // If server still returns a slug error (e.g. race condition), handle it
      if (error.message && error.message.includes("Link Name")) {
        setSlugAvailable(false);
        setSlugMessage(error.message);
        toast.error(error.message);
      } else {
        toast.error("Failed to update profile. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const openPaymentModal = (plan: any) => {
    setSelectedPlanForPurchase(plan);
    setIsPaymentModalOpen(true);
  };

  const generatePDF = async () => {
    if (!profile) return;
    const toastId = toast.loading("Generating PDF...");

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
      // Green Background
      doc.setFillColor(34, 197, 94); // Green-500
      doc.rect(0, 0, pageWidth, 50, 'F');

      // Brand / Title
      printText("SOCCER CIRCULAR", margin, 15, 10, "helvetica", "bold", [255, 255, 255]);
      printText("SCOUTING REPORT", margin, 20, 8, "helvetica", "normal", [220, 220, 220]);

      // Player Name
      printText(profile.display_name || "Unknown Player", margin, 35, 24, "helvetica", "bold", [255, 255, 255]);
      
      // Position Badge-like
      if (profile.position) {
         printText(profile.position.toUpperCase(), margin, 42, 12, "helvetica", "bold", [255, 255, 255]);
      }

      // --- PROFILE IMAGE ---
      y = 60;
      if (profile.profile_image_url) {
        try {
           const base64Img = await getBase64ImageFromURL(profile.profile_image_url);
           // Add image at top right of header
           doc.addImage(base64Img, 'JPEG', pageWidth - margin - 35, 8, 35, 35);
        } catch (e) {
           console.error("Could not load profile image", e);
        }
      }

      // --- INFO GRID ---
      // 2 Columns
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

      leftY += addInfoRow("Age", profile.age ? `${profile.age} Years` : "N/A", col1X, leftY);
      leftY += addInfoRow("Nationality", profile.nationality, col1X, leftY);
      leftY += addInfoRow("Current Club", profile.current_club, col1X, leftY);

      rightY += addInfoRow("Height", profile.height ? `${profile.height} cm` : "-", col2X, rightY);
      rightY += addInfoRow("Weight", profile.weight ? `${profile.weight} kg` : "-", col2X, rightY);
      rightY += addInfoRow("Preferred Foot", profile.preferred_foot, col2X, rightY);

      y = Math.max(leftY, rightY) + 5;

      // Contact Info if available
      if (profile.contact_email || profile.whatsapp_number) {
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
        if (profile.contact_email) {
           doc.setFont("helvetica", "normal");
           doc.text(`Email: ${profile.contact_email}`, contactX, detailsY);
           detailsY += 6;
        }
        if (profile.whatsapp_number) {
           doc.setFont("helvetica", "normal");
           doc.text(`WhatsApp: ${profile.whatsapp_number}`, contactX, detailsY);
        }
        y += 35;
      }

      // --- SECTIONS ---
      const addSection = (title: string, content: string | undefined | null) => {
         if (!content) return;
         
         // Check for page break
         if (y > pageHeight - 40) {
            doc.addPage();
            y = 20;
         }

         doc.setFont("helvetica", "bold");
         doc.setFontSize(14);
         doc.setTextColor(34, 197, 94); // Green header
         doc.text(title, margin, y);
         y += 2;
         doc.setDrawColor(34, 197, 94);
         doc.line(margin, y, margin + 20, y); // Underline
         y += 8;

         doc.setFont("helvetica", "normal");
         doc.setFontSize(11);
         doc.setTextColor(50, 50, 50);
         
         const splitContent = doc.splitTextToSize(content, pageWidth - (margin * 2));
         doc.text(splitContent, margin, y);
         y += (splitContent.length * 5) + 10;
      };

      addSection("Professional Bio", profile.bio);
      addSection("Career History", profile.career_history);
      addSection("Honours & Achievements", profile.honours);
      addSection("Education", profile.education);

      // --- LINKS ---
      if ((profile.video_links && profile.video_links.length > 0) || profile.transfermarket_link) {
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

         if (profile.transfermarket_link) {
            doc.textWithLink("TransferMarket Profile", margin, y, { url: profile.transfermarket_link });
            y += 8;
         }

         if (profile.video_links) {
            profile.video_links.forEach((link, i) => {
               if (link) {
                  doc.textWithLink(`Video Highlight #${i+1}`, margin, y, { url: link });
                  y += 8;
               }
            });
         }
      }

      // --- GALLERY (New Page) ---
      if (profile.gallery_images && profile.gallery_images.some(img => img)) {
         doc.addPage();
         y = 20;
         doc.setFont("helvetica", "bold");
         doc.setFontSize(14);
         doc.setTextColor(0, 0, 0);
         doc.text("Image Gallery", margin, y);
         y += 15;

         const validImages = profile.gallery_images.filter(img => img);
         // Grid of images? 2 per row
         let xPos = margin;
         const imgW = (pageWidth - (margin * 3)) / 2;
         const imgH = imgW * 0.75; // 4:3 aspect ratio

         for (let i = 0; i < validImages.length; i++) {
            const imgUrl = validImages[i];
            if (!imgUrl) continue;

            try {
               // Check page break
               if (y + imgH > pageHeight - 20) {
                  doc.addPage();
                  y = 20;
               }

               const base64 = await getBase64ImageFromURL(imgUrl);
               doc.addImage(base64, 'JPEG', xPos, y, imgW, imgH);
               
               // Update positions
               if (xPos === margin) {
                  xPos += imgW + margin; // Move to second column
               } else {
                  xPos = margin; // Reset to first column
                  y += imgH + 10; // Move down
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

      doc.save(`${profile.display_name?.replace(/\s+/g, '_')}_Profile.pdf`);
      toast.dismiss(toastId);
      toast.success("PDF Downloaded successfully!");

    } catch (err) {
      console.error("PDF Generation Error", err);
      toast.dismiss(toastId);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const getPublicUrl = () => {
    if (!profile) return "";
    
    // Clean URL format: domain.com/messi or messi.domain.com
    if (profile.slug) {
       const hostname = window.location.hostname;
       // Prefer subdomain format for the main production domain
       if (hostname.includes('soccercircular.com')) {
           return `${window.location.protocol}//${profile.slug}.soccercircular.com`;
       }
       return `${window.location.origin}/${profile.slug}`;
    }
    
    return `${window.location.origin}/player/public/${profile.player_id}`;
  };

  const copyPublicLink = () => {
    if (!profile) return;
    const url = getPublicUrl();
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const sidebarItems = [
    { id: "overview", label: t('dash.menu.overview'), icon: Home },
    { id: "profile", label: t('dash.menu.editProfile'), icon: User },
    { id: "subscription", label: t('dash.menu.subscription'), icon: CreditCard },
    { id: "share", label: t('dash.menu.share'), icon: Share2 },
  ];

  const getInitials = (name: string) => {
    if (!name && profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return (name || 'Player')
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string, index?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (field === 'profile_image_url') {
          setFormData(prev => ({ ...prev, profile_image_url: result }));
        } else if (field === 'gallery_images' && index !== undefined) {
          const newGallery = [...(formData.gallery_images || ['', '', ''])];
          newGallery[index] = result;
          setFormData(prev => ({ ...prev, gallery_images: newGallery }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900" dir={dir}>
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Academy Name */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-xl">
                    <span className="text-white font-bold">SC</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                    <Star className="h-2 w-2 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                    Soccer Circular
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t('dash.portal.player')}</p>
                </div>
              </div>
            </div>

            {/* Search Bar (Optional for Player, kept for consistency) */}
            <div className="flex-1 max-w-md mx-8 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <LanguageToggle />
              <ThemeToggle />
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-600 text-white font-bold">
                    {getInitials(profile?.display_name || session?.email || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {profile?.first_name || profile?.display_name || 'Player'}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {session?.email}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky lg:top-16 z-40 w-64 bg-gradient-to-b from-[#005391] to-[#0066b3] border-r-4 border-yellow-400 transition-transform duration-300 ease-in-out h-[calc(100vh-64px)] overflow-y-auto`}>
          <div className="flex flex-col h-full pt-4 lg:pt-0">
            <nav className="flex-1 px-4 py-6 space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={`w-full justify-start text-white hover:bg-white/20 transition-all duration-300 ${activeTab === item.id
                      ? 'bg-white/20 border-l-4 border-yellow-400 shadow-lg'
                      : 'border-l-4 border-transparent hover:border-yellow-400/50'
                      }`}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto min-h-[calc(100vh-64px)]">
          <div className="max-w-6xl mx-auto">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {t('dash.welcome')}, {profile?.display_name || 'Player'}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">
                      {t('dash.stats.overview')}
                    </p>
                  </div>
                  {currentPlan && (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 text-sm px-3 py-1">
                      {currentPlan.toUpperCase()} PLAN
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Profile Card */}
                  <div className="lg:col-span-1">
                    <Card className="h-full">
                      <CardContent className="pt-6 flex flex-col items-center">
                        <Avatar className="h-32 w-32 border-4 border-white shadow-lg mb-4">
                          <AvatarImage src={profile?.profile_image_url} />
                          <AvatarFallback className="text-4xl bg-slate-200">
                            {getInitials(profile?.display_name || 'Player')}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                          {profile?.display_name || 'No Name'}
                        </h3>
                        <p className="text-slate-500 font-medium">{profile?.position || 'No Position'}</p>
                        <p className="text-slate-400 text-sm">{profile?.current_club || 'No Club'}</p>

                          <div className="w-full mt-6 space-y-3">
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-slate-500">{t('common.age')}</span>
                              <span className="font-semibold">{profile?.age || '-'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-slate-500">{t('common.nationality')}</span>
                              <span className="font-semibold">{profile?.nationality || '-'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-slate-500">{t('common.height')}</span>
                              <span className="font-semibold">{profile?.height ? `${profile.height} cm` : '-'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-slate-500">{t('common.weight')}</span>
                              <span className="font-semibold">{profile?.weight ? `${profile.weight} kg` : '-'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-slate-500">{t('common.foot')}</span>
                              <span className="font-semibold">{profile?.preferred_foot || '-'}</span>
                            </div>
                          </div>
                      </CardContent>
                      <CardFooter className="justify-center pb-6">
                        <Button variant="outline" className="w-full" onClick={() => setActiveTab('profile')}>
                          <Edit className="h-4 w-4 mr-2" /> {t('dash.menu.editProfile')}
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>

                  {/* Right Column: Bio & Gallery */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('dash.player.bio')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-600 dark:text-slate-300">
                          {profile?.bio || t('dash.player.noBio')}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>{t('dash.player.careerHistory')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                          {profile?.career_history || t('dash.player.noCareer')}
                        </p>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">{t('dash.player.honours')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line text-sm">
                            {profile?.honours || t('dash.player.none')}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">{t('dash.player.education')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line text-sm">
                            {profile?.education || t('dash.player.none')}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>{t('dash.player.gallery')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {profile?.gallery_images && profile.gallery_images.some(img => img) ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {profile.gallery_images.map((img, index) => (
                              img && (
                                <div key={index} className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                                  <img src={img} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                </div>
                              )
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                            <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p>{t('dash.player.noGallery')}</p>
                            <Button variant="link" onClick={() => setActiveTab('profile')} className="mt-2">
                              {t('dash.player.addImages')}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('dash.stats.subscription')}</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {currentPlan === 'pro' ? t('dash.player.subActive') : t('dash.player.subFree')}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">
                          {currentPlan === 'pro' 
                            ? t('dash.player.subActiveDesc') 
                            : t('dash.player.subFreeDesc')}
                        </p>
                        {currentPlan !== 'pro' && (
                          <Button 
                            onClick={() => setActiveTab('subscription')} 
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                          >
                            {t('dash.player.viewPlans')}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dash.player.editProfile')}</h2>
                  <p className="text-slate-600 dark:text-slate-400">{t('dash.player.editProfileDesc')}</p>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      {/* Profile Picture Section */}
                      <div className="flex flex-col items-center space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                        <Label className="text-lg font-semibold">{t('dash.player.profilePic')}</Label>
                        <div className="relative group">
                          <Avatar className="h-32 w-32 border-4 border-white shadow-lg cursor-pointer">
                            <AvatarImage src={formData.profile_image_url} />
                            <AvatarFallback className="text-4xl bg-slate-200">
                              {getInitials(formData.display_name || t('dash.share.newPlayer'))}
                            </AvatarFallback>
                          </Avatar>
                          <label
                            htmlFor="profile-upload"
                            className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white cursor-pointer hover:bg-blue-700 shadow-md transition-colors"
                          >
                            <Camera className="h-5 w-5" />
                            <input
                              id="profile-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e, 'profile_image_url')}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-slate-500">{t('dash.player.uploadPhoto')}</p>
                      </div>

                      {/* Cover Image Section */}
                      <div className="flex flex-col items-center space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                        <Label className="text-lg font-semibold">{t('dash.player.coverImage')}</Label>
                        <div className="relative group w-full max-w-md">
                          <div className="aspect-[3/1] rounded-xl overflow-hidden bg-slate-100 border-4 border-white shadow-lg relative">
                            {formData.cover_image_url ? (
                              <img src={formData.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-slate-400">
                                <ImageIcon className="h-10 w-10 mr-2" />
                                <span>{t('dash.player.noCover')}</span>
                              </div>
                            )}
                          </div>
                          <label
                            htmlFor="cover-upload"
                            className="absolute bottom-2 right-2 p-2 bg-blue-600 rounded-full text-white cursor-pointer hover:bg-blue-700 shadow-md transition-colors"
                          >
                            <Camera className="h-5 w-5" />
                            <input
                              id="cover-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e, 'cover_image_url')}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-slate-500">{t('dash.player.coverDesc')}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="slug">{t('dash.player.customLink')}</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500 font-mono">https://</span>
                            <div className="relative max-w-[200px] w-full">
                              <Input
                                id="slug"
                                name="slug"
                                value={formData.slug || ''}
                                onChange={handleInputChange}
                                placeholder={t('dash.player.linkPlaceholder')}
                                className={`font-mono pr-8 ${slugAvailable === false ? 'border-red-500 focus-visible:ring-red-500' : slugAvailable === true ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                {isCheckingSlug ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                ) : slugAvailable === true ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : slugAvailable === false ? (
                                  <X className="h-4 w-4 text-red-500" />
                                ) : null}
                              </div>
                            </div>
                            <span className="text-sm text-slate-500 font-mono">.{window.location.host}</span>
                          </div>
                          {slugMessage ? (
                            <p className={`text-xs ${slugAvailable === false ? 'text-red-500' : 'text-green-600'}`}>
                              {slugMessage}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-500">{t('dash.player.linkRules')}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="display_name">{t('dash.player.displayName')}</Label>
                          <Input
                            id="display_name"
                            name="display_name"
                            value={formData.display_name || ''}
                            onChange={handleInputChange}
                            placeholder={t('dash.player.placeholderName')}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="position">{t('dash.player.position')}</Label>
                          <Input
                            id="position"
                            name="position"
                            value={formData.position || ''}
                            onChange={handleInputChange}
                            placeholder={t('dash.player.placeholderPosition')}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="nationality">{t('dash.player.nationality')}</Label>
                          <Input
                            id="nationality"
                            name="nationality"
                            value={formData.nationality || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. Zambian"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4 md:col-span-1">
                          <div className="space-y-2">
                            <Label htmlFor="height">{t('dash.player.height')}</Label>
                            <Input
                              id="height"
                              name="height"
                              type="number"
                              value={formData.height || ''}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="weight">{t('dash.player.weight')}</Label>
                            <Input
                              id="weight"
                              name="weight"
                              type="number"
                              value={formData.weight || ''}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="age">{t('dash.player.age')}</Label>
                            <Input
                              id="age"
                              name="age"
                              type="number"
                              value={formData.age || ''}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="foot">{t('dash.player.foot')}</Label>
                          <Input
                            id="foot"
                            name="foot"
                            value={formData.foot || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. Right, Left, Both"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="current_club">{t('dash.player.currentClub')}</Label>
                          <Input
                            id="current_club"
                            name="current_club"
                            value={formData.current_club || ''}
                            onChange={handleInputChange}
                            placeholder={t('dash.player.placeholderClub')}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">{t('dash.player.email')}</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email || ''}
                            onChange={handleInputChange}
                            placeholder={t('dash.player.placeholderEmail')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="whatsapp_number">{t('dash.player.whatsapp')}</Label>
                          <Input
                            id="whatsapp_number"
                            name="whatsapp_number"
                            value={formData.whatsapp_number || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. +260..."
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <Label className="text-lg font-semibold">{t('dash.player.socialMedia')}</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
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
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">{t('dash.player.bio')}</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          value={formData.bio || ''}
                          onChange={handleInputChange}
                          placeholder={t('dash.player.bioPlaceholder')}
                          className="min-h-[100px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="career_history">{t('dash.player.careerHistory')}</Label>
                        <Textarea
                          id="career_history"
                          name="career_history"
                          value={formData.career_history || ''}
                          onChange={handleInputChange}
                          placeholder={t('dash.player.careerPlaceholder')}
                          className="min-h-[120px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="honours">{t('dash.player.honours')}</Label>
                        <Textarea
                          id="honours"
                          name="honours"
                          value={formData.honours || ''}
                          onChange={handleInputChange}
                          placeholder={t('dash.player.honoursPlaceholder')}
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="education">{t('dash.player.education')}</Label>
                        <Textarea
                          id="education"
                          name="education"
                          value={formData.education || ''}
                          onChange={handleInputChange}
                          placeholder={t('dash.player.eduPlaceholder')}
                          className="min-h-[80px]"
                        />
                      </div>

                      {/* Gallery Images Section */}
                      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700 relative">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold">{t('dash.player.galleryMax')}</Label>
                          {!hasFeature('Video highlights') && (
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 uppercase font-black">{t('dash.player.proFeature')}</Badge>
                          )}
                        </div>
                        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${!hasFeature('Video highlights') ? "opacity-40 grayscale pointer-events-none" : ""}`}>
                          {[0, 1, 2].map((index) => (
                            <div key={index} className="space-y-2">
                              <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center group hover:border-blue-500 transition-colors">
                                {formData.gallery_images?.[index] ? (
                                  <>
                                    <img
                                      src={formData.gallery_images[index]}
                                      alt={`Gallery ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <label
                                        htmlFor={`gallery-upload-${index}`}
                                        className="p-2 bg-white rounded-full cursor-pointer hover:bg-slate-100"
                                        title="Change Image"
                                      >
                                        <Edit className="h-4 w-4 text-slate-900" />
                                      </label>
                                      <button
                                        onClick={() => {
                                          const newGallery = [...(formData.gallery_images || [])];
                                          newGallery[index] = '';
                                          setFormData(prev => ({ ...prev, gallery_images: newGallery }));
                                        }}
                                        className="p-2 bg-white rounded-full cursor-pointer hover:bg-red-100 text-red-600"
                                        title="Remove Image"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <label
                                    htmlFor={`gallery-upload-${index}`}
                                    className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-blue-500"
                                  >
                                    <ImageIcon className="h-8 w-8 mb-2" />
                                    <span className="text-xs">{t('dash.player.uploadImage')}</span>
                                  </label>
                                )}
                                <input
                                  id={`gallery-upload-${index}`}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleImageUpload(e, 'gallery_images', index)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        {!hasFeature('Video highlights') && (
                          <div className="absolute inset-0 top-12 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center rounded-lg z-20">
                            <Button variant="ghost" size="sm" onClick={() => setActiveTab('subscription')} className="text-blue-600 font-black uppercase tracking-widest text-xs hover:bg-blue-50 py-6">
                              <Lock className="h-4 w-4 mr-2" /> {t('dash.player.upgradeGallery')}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 relative">
                        <div className="flex items-center justify-between">
                          <Label>{t('dash.player.videoLinks')}</Label>
                          {!hasFeature('Video highlights') && (
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">{t('dash.player.proFeature')}</Badge>
                          )}
                        </div>
                        <div className={!hasFeature('Video highlights') ? "opacity-50 pointer-events-none grayscale" : ""}>
                          <Input
                            placeholder={t('dash.player.videoPlaceholder', { n: 1 })}
                            value={formData.video_links?.[0] || ''}
                            onChange={(e) => {
                              const newLinks = [...(formData.video_links || ['', ''])];
                              newLinks[0] = e.target.value;
                              setFormData(prev => ({ ...prev, video_links: newLinks }));
                            }}
                            className="mb-2"
                          />
                          <Input
                            placeholder={t('dash.player.videoPlaceholder', { n: 2 })}
                            value={formData.video_links?.[1] || ''}
                            onChange={(e) => {
                              const newLinks = [...(formData.video_links || ['', ''])];
                              newLinks[1] = e.target.value;
                              setFormData(prev => ({ ...prev, video_links: newLinks }));
                            }}
                          />
                        </div>
                        {!hasFeature('Video highlights') && (
                          <div className="absolute inset-0 top-8 bg-white/10 dark:bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center rounded-lg z-20">
                            <Button variant="ghost" size="sm" onClick={() => setActiveTab('subscription')} className="text-blue-600 font-black uppercase tracking-widest text-xs hover:bg-blue-50 py-6">
                              <Lock className="h-4 w-4 mr-2" /> {t('dash.player.upgradeVideo')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-3 pb-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                    <Button variant="outline" onClick={() => setActiveTab('overview')}>{t('common.cancel')}</Button>
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('dash.player.saving')}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t('dash.player.saveProfile')}
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dash.plan.subscriptionPlans')}</h2>
                  <p className="text-slate-600 dark:text-slate-400">{t('dash.plan.chooseBest')}</p>
                </div>

                {(!currentPlan || currentPlan === 'free') && (
                  <div className={`grid grid-cols-1 ${plans.length > 1 ? 'md:grid-cols-2 lg:grid-cols-3' : 'max-w-md mx-auto'} gap-8 mb-8`}>
                    {plans.length > 0 ? (
                      [...plans]
                        .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
                        .map((plan) => {
                          const isMostExpensive = parseFloat(plan.price) === Math.max(...plans.map(p => parseFloat(p.price)));
                          
                          const planKey = plan.name.toLowerCase().includes('starter') ? 'starter' : 
                                          plan.name.toLowerCase().includes('pro') ? 'pro' : 
                                          plan.name.toLowerCase().includes('elite') ? 'elite' : 
                                          plan.name.toLowerCase().includes('agency') ? 'elite' : 
                                          plan.name.toLowerCase().includes('basic') ? 'starter' : 'starter';

                          const translatedFeatures = (plan.features || []).map((f: string) => {
                            const lowerF = f.toLowerCase();
                            
                            // Specific Individual Features first to avoid broad matches
                            if (lowerF.includes('verified') && lowerF.includes('badge')) return t('plans.feature.verifiedBadge');
                            if (lowerF.includes('unlimited') && lowerF.includes('update')) return t('plans.feature.unlimitedUpdates');
                            if (lowerF.includes('unlimited') && lowerF.includes('player')) return t('plans.feature.unlimitedPlayers');
                            if (lowerF.includes('video highlight')) return t('plans.feature.videoReels');
                            if (lowerF.includes('scout messaging')) return t('plans.feature.scoutMessaging');
                            
                            // Map dynamic features to translations
                            if (lowerF.includes('player') && (lowerF.includes('up to') || f.match(/\d+/))) {
                              const count = f.match(/\d+/)?.[0] || plan.player_limit;
                              return t('plans.feature.playerCount', { count });
                            }
                            if (lowerF.includes('analytics')) return t('plans.feature.analytics');
                            if (lowerF.includes('priority support')) return t('plans.feature.prioritySupport');
                            if (lowerF.includes('email support')) return t('plans.feature.emailSupport');
                            if (lowerF.includes('registration')) return t('plans.feature.registration');
                            if (lowerF.includes('training')) return t('plans.feature.trainingTracking');
                            if (lowerF.includes('solidarity')) return t('plans.feature.solidarity');
                            if (lowerF.includes('compliance')) return t('plans.feature.fullCompliance');
                            if (lowerF.includes('24/7')) return t('plans.feature.247Support');
                            if (lowerF.includes('dedicated manager')) return t('plans.feature.dedicatedManager');
                            if (lowerF.includes('white-label')) return t('plans.feature.whiteLabel');
                            if (lowerF.includes('api access')) return t('plans.feature.advancedApi');
                            if (lowerF.includes('financial tools')) return t('plans.feature.financialTools');
                            if (lowerF.includes('standard support')) return t('plans.feature.standardSupport');
                            if (lowerF.includes('profile placement')) return t('plans.feature.profilePlacement');
                            if (lowerF.includes('legal')) return t('plans.feature.legalGuidance');
                            if (lowerF.includes('trial notifications')) return t('plans.feature.trialNotifications');
                            if (lowerF.includes('digital resume')) return t('plans.feature.digitalResume');
                            if (lowerF.includes('public profile')) return t('plans.feature.publicProfile');
                            if (lowerF.includes('stats tracking')) return t('plans.feature.statsTracking');
                            if (lowerF.includes('api integration')) return t('plans.feature.apiIntegrations');
                            if (lowerF.includes('account team')) return t('plans.feature.accountTeam');
                            if (lowerF.includes('scouting filter')) return t('plans.feature.scoutingFilters');
                            if (lowerF.includes('commission tracking')) return t('plans.feature.commissionTracking');
                            if (lowerF.includes('sub-agent management')) return t('plans.feature.subAgentMgmt');
                            if (lowerF.includes('premium support')) return t('plans.feature.premiumSupport');
                            if (lowerF.includes('transfer tracking')) return t('plans.feature.transferTracking');
                            if (lowerF.includes('document cloud')) return t('plans.feature.documentCloud');
                            if (lowerF.includes('scouting tools')) return t('plans.feature.scoutingTools');
                            return f;
                          });

                          return (
                            <Card key={plan.id} className={`cursor-pointer transition-all hover:border-blue-500 hover:shadow-2xl flex flex-col relative overflow-hidden border-2 ${isMostExpensive ? 'border-blue-600 dark:border-blue-400 shadow-xl scale-105 z-10' : 'border-slate-100 dark:border-slate-800 shadow-sm'}`}>
                              {isMostExpensive && (
                                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] px-4 py-1.5 font-black uppercase tracking-widest rounded-bl-lg shadow-lg">{t('dash.plan.recommended')}</div>
                              )}
                              <CardHeader className="text-center pb-4 pt-8 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                <CardTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{t(`plans.${planKey}.name` as any) || plan.name}</CardTitle>
                                <div className="flex items-center justify-center gap-1 mt-4">
                                  <span className="text-2xl font-bold text-blue-600">$</span>
                                  <span className="text-5xl font-black text-blue-600 tracking-tighter">{plan.price}</span>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">
                                  {plan.billingCycle === 'one-time' || !plan.billingCycle 
                                    ? t('dash.plan.lifetimeBilling') 
                                    : t('dash.plan.billingPeriod', { period: plan.billingCycle.toLowerCase() })
                                  }
                                </p>
                              </CardHeader>
                              <CardContent className="flex-1 pt-8 px-6">
                                <div className="space-y-4 mb-8">
                                  {Array.isArray(plan.features) ? (
                                    translatedFeatures.map((feature: string, fIdx: number) => (
                                      <div key={fIdx} className="flex items-start gap-3">
                                        <div className="mt-0.5 h-5 w-5 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                          <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-tight">{feature}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm text-slate-500 italic">{t('dash.plan.noFeatures')}</p>
                                  )}
                                </div>
                              </CardContent>
                              <CardFooter className="pb-8 px-6 pt-2">
                                <Button 
                                  className={`w-full h-14 text-sm font-black uppercase tracking-widest transition-all duration-300 shadow-xl ${isMostExpensive ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white hover:scale-[1.02]' : 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800'}`}
                                  onClick={() => openPaymentModal(plan)}
                                >
                                  {parseFloat(plan.price) === 0 
                                    ? t('dash.plan.getStarted') 
                                    : t('dash.plan.getName', { name: t(`plans.${planKey}.name` as any) || plan.name })
                                  }
                                </Button>
                              </CardFooter>
                            </Card>
                          );
                        })
                    ) : (
                      <div className="col-span-full py-12 text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{t('dash.plan.loading')}</p>
                      </div>
                    )}
                  </div>
                )}

                {currentPlan && currentPlan !== 'free' && (
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Shield className="h-20 w-20 text-green-600" />
                    </div>
                    <CardContent className="pt-8 pb-8">
                      <div className="flex items-center gap-6">
                        <div className="h-16 w-16 rounded-2xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-200">
                          <Check className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-green-600 hover:bg-green-600 text-white font-black uppercase tracking-widest text-[10px]">{t('dash.plan.activeSubBadge')}</Badge>
                          </div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">
                            {t('dash.plan.planLabel', { name: plans.find(p => p.id === currentPlan)?.name || 'PREMIUM' })}
                          </h3>
                          <p className="text-green-700 font-medium">
                            {t('dash.plan.activeDesc')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {currentPlan === 'free' && (
                  <Card className="bg-slate-50 border-slate-200 border-dashed">
                    <CardContent className="pt-6 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-slate-200 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-slate-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 uppercase">{t('dash.plan.statusFree')}</h3>
                          <p className="text-slate-600">
                            {t('dash.plan.upgradeDesc')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Share & Export Tab */}
            {activeTab === 'share' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dash.menu.share')}</h2>
                  <p className="text-slate-600 dark:text-slate-400">{t('dash.share.subtitle')}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="flex flex-col h-full border-none shadow-xl bg-white dark:bg-slate-800 overflow-hidden">
                    <div className="h-2 bg-blue-600 w-full" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <FileText className="h-6 w-6 text-blue-600" />
                        {t('dash.share.downloadPdf')}
                      </CardTitle>
                      <CardDescription>{t('dash.share.pdfDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl mb-6 border border-slate-100 dark:border-slate-800">
                        <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-400">
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" /> {t('dash.share.pdfFeat1')}
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" /> {t('dash.share.pdfFeat2')}
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" /> {t('dash.share.pdfFeat3')}
                          </li>
                        </ul>
                      </div>
                      <Button
                        className="w-full h-12 text-md font-semibold bg-blue-600 hover:bg-blue-700 transition-all shadow-md"
                        onClick={hasFeature('Unlimited profile updates') || hasFeature('Elite') ? generatePDF : () => {
                           toast.info(t('dash.share.upgradeRequired'));
                           setActiveTab('subscription');
                        }}
                      >
                        {hasFeature('Unlimited profile updates') || hasFeature('Elite') ? (
                          <>
                            <Download className="mr-2 h-5 w-5" />
                            {t('dash.share.generateDownload')}
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-5 w-5" />
                            {t('dash.share.unlockPdf')}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="flex flex-col h-full border-none shadow-xl bg-white dark:bg-slate-800 overflow-hidden">
                    <div className="h-2 bg-green-600 w-full" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Globe className="h-6 w-6 text-green-600" />
                        {t('dash.share.digitalProfile')}
                      </CardTitle>
                      <CardDescription>{t('dash.share.digitalDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      {/* Preview Card */}
                      <div className="mb-6 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 relative group">
                        <div className="absolute top-2 right-2">
                          <Badge variant="outline" className="bg-white/80 dark:bg-slate-800/80">{t('dash.share.preview')}</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16 border-2 border-white dark:border-slate-700 shadow-sm">
                            <AvatarImage src={profile?.profile_image_url} />
                            <AvatarFallback>{getInitials(profile?.display_name || "")}</AvatarFallback>
                          </Avatar>
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-slate-900 dark:text-white capitalize truncate">
                              {profile?.display_name || t('dash.share.newPlayer')}
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{profile?.position || t('dash.share.noPosition')}</p>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="secondary" className="text-[10px] py-0">{profile?.nationality || t('dash.share.global')}</Badge>
                              <Badge variant="secondary" className="text-[10px] py-0">{profile?.age ? `${profile.age}y` : t('dash.share.ageLabel')}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Button
                            className="flex-1 h-12 text-md font-semibold bg-green-600 hover:bg-green-700 shadow-md"
                            onClick={currentPlan === 'pro' ? copyPublicLink : () => setActiveTab('subscription')}
                          >
                            {currentPlan === 'pro' ? (
                              <>
                                <Share2 className="mr-2 h-5 w-5" />
                                {t('dash.share.copyLink')}
                              </>
                            ) : (
                              <>
                                <Lock className="mr-2 h-5 w-5" />
                                {t('dash.share.unlockLink')}
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            className="h-12 w-12 p-0 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900"
                            asChild={currentPlan === 'pro'}
                            onClick={currentPlan !== 'pro' ? () => setActiveTab('subscription') : undefined}
                          >
                            {currentPlan === 'pro' ? (
                              <a href={getPublicUrl()} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                              </a>
                            ) : (
                              <div className="cursor-pointer flex items-center justify-center w-full h-full">
                                <Lock className="h-5 w-5 text-slate-400" />
                              </div>
                            )}
                          </Button>
                        </div>

                        <div className="pt-2">
                          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">{t('dash.share.quickShare')}</p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPlan !== 'pro'}
                              className="flex-1 gap-2 border-slate-100 dark:border-slate-800 hover:bg-green-50 dark:hover:bg-green-900/10"
                              onClick={() => {
                                const url = getPublicUrl();
                                window.open(`https://wa.me/?text=Check out my professional football profile: ${url}`, '_blank');
                              }}
                            >
                              {currentPlan === 'pro' ? <MessageCircle className="h-4 w-4 text-[#25D366]" /> : <Lock className="h-3 w-3" />}
                              <span className="text-xs">WhatsApp</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPlan !== 'pro'}
                              className="flex-1 gap-2 border-slate-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                              onClick={() => {
                                const url = getPublicUrl();
                                window.open(`https://twitter.com/intent/tweet?text=Check out my football profile on Soccer Circular: ${url}`, '_blank');
                              }}
                            >
                              {currentPlan === 'pro' ? <Twitter className="h-4 w-4 text-[#1DA1F2]" /> : <Lock className="h-3 w-3" />}
                              <span className="text-xs">Twitter</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </main>
      </div >

      <PlayerPaymentMethodSelector
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        selectedPlan={selectedPlanForPurchase}
        onSuccess={() => {
          setIsPaymentModalOpen(false);
        }}
      />
    </div >
  );
}