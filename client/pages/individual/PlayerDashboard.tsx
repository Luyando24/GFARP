import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PlayerApi, PlayerProfile } from "@/lib/api";
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
  Image,
  Upload,
  Camera,
  Eye,
  MessageCircle,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Globe,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import ThemeToggle from "@/components/navigation/ThemeToggle";
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

    const img = new Image();
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
  usePageTitle("Player Dashboard");
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
      // If server still returns a slug error (e.g. race condition), handle it
      if (error.message && error.message.includes("Link Name")) {
        setSlugAvailable(false);
        setSlugMessage(error.message);
        toast.error(error.message);
      } else {
        toast.error("Failed to update profile");
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
    { id: "overview", label: "Overview", icon: Home },
    { id: "profile", label: "Edit Profile", icon: User },
    { id: "subscription", label: "Subscription", icon: CreditCard },
    { id: "share", label: "Share & Export", icon: Share2 },
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
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
                  <p className="text-sm text-slate-600 dark:text-slate-400">Player Portal</p>
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
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-[#005391] to-[#0066b3] border-r-4 border-yellow-400 transition-transform duration-300 ease-in-out min-h-[calc(100vh-64px)]`}>
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
                      Welcome, {profile?.display_name || 'Player'}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">
                      Here is an overview of your profile and subscription.
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
                            <span className="text-slate-500">Age</span>
                            <span className="font-semibold">{profile?.age || '-'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500">Nationality</span>
                            <span className="font-semibold">{profile?.nationality || '-'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500">Height</span>
                            <span className="font-semibold">{profile?.height ? `${profile.height} cm` : '-'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500">Weight</span>
                            <span className="font-semibold">{profile?.weight ? `${profile.weight} kg` : '-'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500">Foot</span>
                            <span className="font-semibold">{profile?.preferred_foot || '-'}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="justify-center pb-6">
                        <Button variant="outline" className="w-full" onClick={() => setActiveTab('profile')}>
                          <Edit className="h-4 w-4 mr-2" /> Edit Profile
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>

                  {/* Right Column: Bio & Gallery */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Bio</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                          {profile?.bio || "No bio available. Go to 'Edit Profile' to add one."}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Career History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                          {profile?.career_history || "No career history added."}
                        </p>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Honours & Awards</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line text-sm">
                            {profile?.honours || "None added."}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Education</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line text-sm">
                            {profile?.education || "None added."}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Gallery</CardTitle>
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
                            <Image className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p>No images in gallery</p>
                            <Button variant="link" onClick={() => setActiveTab('profile')} className="mt-2">
                              Add Images
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Subscription</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {currentPlan === 'pro' ? "Pro Plan Active" : "Free Plan"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">
                          {currentPlan === 'pro' 
                            ? "You have full access to all features." 
                            : "Upgrade to Pro for unlimited updates and more."}
                        </p>
                        {currentPlan !== 'pro' && (
                          <Button 
                            onClick={() => openPaymentModal(plans[0] || { id: 'pro', name: 'Pro Plan', price: 20 })} 
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                          >
                            Upgrade for ${plans[0]?.price || 20}
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
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Profile</h2>
                  <p className="text-slate-600 dark:text-slate-400">Update your information for the one-pager.</p>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      {/* Profile Picture Section */}
                      <div className="flex flex-col items-center space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                        <Label className="text-lg font-semibold">Profile Picture</Label>
                        <div className="relative group">
                          <Avatar className="h-32 w-32 border-4 border-white shadow-lg cursor-pointer">
                            <AvatarImage src={formData.profile_image_url} />
                            <AvatarFallback className="text-4xl bg-slate-200">
                              {getInitials(formData.display_name || 'Player')}
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
                        <p className="text-xs text-slate-500">Click the camera icon to upload a new photo</p>
                      </div>

                      {/* Cover Image Section */}
                      <div className="flex flex-col items-center space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                        <Label className="text-lg font-semibold">Cover Image (Hero Background)</Label>
                        <div className="relative group w-full max-w-md">
                          <div className="aspect-[3/1] rounded-xl overflow-hidden bg-slate-100 border-4 border-white shadow-lg relative">
                            {formData.cover_image_url ? (
                              <img src={formData.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-slate-400">
                                <Image className="h-10 w-10 mr-2" />
                                <span>No cover image set</span>
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
                        <p className="text-xs text-slate-500">This will be the background of your profile header</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="slug">Custom Link Name (Subdomain)</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500 font-mono">https://</span>
                            <div className="relative max-w-[200px] w-full">
                              <Input
                                id="slug"
                                name="slug"
                                value={formData.slug || ''}
                                onChange={handleInputChange}
                                placeholder="your-name"
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
                            <p className="text-xs text-slate-500">Only lowercase letters, numbers, and hyphens.</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="display_name">Display Name</Label>
                          <Input
                            id="display_name"
                            name="display_name"
                            value={formData.display_name || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. John Doe"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="age">Age</Label>
                          <Input
                            id="age"
                            name="age"
                            type="number"
                            value={formData.age || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nationality">Nationality</Label>
                          <Input
                            id="nationality"
                            name="nationality"
                            value={formData.nationality || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="position">Position</Label>
                          <Input
                            id="position"
                            name="position"
                            value={formData.position || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. Striker"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="current_club">Current Club</Label>
                          <Input
                            id="current_club"
                            name="current_club"
                            value={formData.current_club || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="height">Height (cm)</Label>
                          <Input
                            id="height"
                            name="height"
                            type="number"
                            value={formData.height || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. 185"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="weight">Weight (kg)</Label>
                          <Input
                            id="weight"
                            name="weight"
                            type="number"
                            value={formData.weight || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. 75"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="preferred_foot">Preferred Foot</Label>
                          <select
                            id="preferred_foot"
                            name="preferred_foot"
                            value={formData.preferred_foot || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, preferred_foot: e.target.value }))}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select Foot</option>
                            <option value="Right">Right</option>
                            <option value="Left">Left</option>
                            <option value="Both">Both</option>
                          </select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="transfermarket_link">TransferMarket Link</Label>
                          <Input
                            id="transfermarket_link"
                            name="transfermarket_link"
                            value={formData.transfermarket_link || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact_email">Scouting Contact Email</Label>
                          <Input
                            id="contact_email"
                            name="contact_email"
                            type="email"
                            value={formData.contact_email || ''}
                            onChange={handleInputChange}
                            placeholder="Email for scouts/clubs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
                          <Input
                            id="whatsapp_number"
                            name="whatsapp_number"
                            value={formData.whatsapp_number || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. +260..."
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <Label className="text-lg font-semibold">Social Media Links</Label>
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
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          value={formData.bio || ''}
                          onChange={handleInputChange}
                          placeholder="Tell us about your football journey and goals..."
                          className="min-h-[100px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="career_history">Career Journey (Clubs & Seasons)</Label>
                        <Textarea
                          id="career_history"
                          name="career_history"
                          value={formData.career_history || ''}
                          onChange={handleInputChange}
                          placeholder="e.g. 
- ZUST FC (2023 - 2024): Key Striker
- AFU FC (2022 - 2023): Forward"
                          className="min-h-[120px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="honours">Honours & Awards</Label>
                        <Textarea
                          id="honours"
                          name="honours"
                          value={formData.honours || ''}
                          onChange={handleInputChange}
                          placeholder="e.g. Golden Boot (2023), League Champion (2022)"
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="education">Education</Label>
                        <Textarea
                          id="education"
                          name="education"
                          value={formData.education || ''}
                          onChange={handleInputChange}
                          placeholder="e.g. Bachelor's Degree, Sports Management (2021)"
                          className="min-h-[80px]"
                        />
                      </div>

                      {/* Gallery Images Section */}
                      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Label className="text-lg font-semibold">Gallery Images (Max 3)</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                                    <Image className="h-8 w-8 mb-2" />
                                    <span className="text-xs">Upload Image</span>
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
                      </div>

                      <div className="space-y-2">
                        <Label>Video Links</Label>
                        <Input
                          placeholder="Video Link 1"
                          value={formData.video_links?.[0] || ''}
                          onChange={(e) => {
                            const newLinks = [...(formData.video_links || [])];
                            newLinks[0] = e.target.value;
                            setFormData(prev => ({ ...prev, video_links: newLinks }));
                          }}
                          className="mb-2"
                        />
                        <Input
                          placeholder="Video Link 2"
                          value={formData.video_links?.[1] || ''}
                          onChange={(e) => {
                            const newLinks = [...(formData.video_links || [])];
                            newLinks[1] = e.target.value;
                            setFormData(prev => ({ ...prev, video_links: newLinks }));
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2 bg-slate-50 dark:bg-slate-800/50 p-4">
                    <Button variant="outline" onClick={() => setActiveTab('overview')}>Cancel</Button>
                    <Button onClick={handleSaveProfile} disabled={saving || (currentPlan !== 'pro' && currentPlan !== 'basic' && currentPlan !== 'pdf' && false) /* Allow edit for now or restrict based on plan */}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Changes
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription Plans</h2>
                  <p className="text-slate-600 dark:text-slate-400">Choose the best plan for your needs.</p>
                </div>

                {!currentPlan ? (
                  <div className="max-w-md mx-auto">
                    {/* Pro Plan */}
                    <Card className="cursor-pointer transition-all hover:border-blue-500 hover:shadow-md flex flex-col relative overflow-hidden border-2 border-blue-100 dark:border-blue-900">
                      <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-2 py-1 font-bold">RECOMMENDED</div>
                      <CardHeader className="text-center pb-2">
                        <CardTitle className="text-2xl text-blue-900 dark:text-blue-100">Pro Plan</CardTitle>
                        <div className="text-4xl font-bold text-blue-600 mt-2">$20</div>
                        <p className="text-sm text-slate-500">One-time payment for lifetime access</p>
                      </CardHeader>
                      <CardContent className="flex-1 pt-4">
                        <ul className="space-y-3 mb-6">
                          <li className="flex items-center text-sm"><Check className="h-5 w-5 mr-3 text-green-500 flex-shrink-0" /> Unlimited profile updates</li>
                          <li className="flex items-center text-sm"><Check className="h-5 w-5 mr-3 text-green-500 flex-shrink-0" /> Video highlights upload</li>
                          <li className="flex items-center text-sm"><Check className="h-5 w-5 mr-3 text-green-500 flex-shrink-0" /> Direct messaging with scouts</li>
                          <li className="flex items-center text-sm"><Check className="h-5 w-5 mr-3 text-green-500 flex-shrink-0" /> Priority support</li>
                          <li className="flex items-center text-sm"><Check className="h-5 w-5 mr-3 text-green-500 flex-shrink-0" /> Verified player badge</li>
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg" 
                          onClick={() => openPaymentModal(plans[0] || { id: 'pro', name: 'Pro Plan', price: 20 })}
                        >
                          Get Pro Access
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                ) : (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-green-900">Active Subscription: {currentPlan.toUpperCase()}</h3>
                          <p className="text-green-700">You have full access to the features included in your plan.</p>
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
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Share & Export</h2>
                  <p className="text-slate-600 dark:text-slate-400">Distribute your profile to scouts and clubs.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="flex flex-col h-full border-none shadow-xl bg-white dark:bg-slate-800 overflow-hidden">
                    <div className="h-2 bg-blue-600 w-full" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <FileText className="h-6 w-6 text-blue-600" />
                        Download PDF CV
                      </CardTitle>
                      <CardDescription>Export your professional football CV for clubs and agents.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl mb-6 border border-slate-100 dark:border-slate-800">
                        <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-400">
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" /> Professional layout
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" /> Key stats & contact info
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" /> Easy to print or email
                          </li>
                        </ul>
                      </div>
                      <Button
                        className="w-full h-12 text-md font-semibold bg-blue-600 hover:bg-blue-700 transition-all shadow-md"
                        onClick={currentPlan === 'pro' ? generatePDF : () => setActiveTab('subscription')}
                      >
                        {currentPlan === 'pro' ? (
                          <>
                            <Download className="mr-2 h-5 w-5" />
                            Generate & Download
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-5 w-5" />
                            Unlock PDF Download
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
                        Digital Profile Link
                      </CardTitle>
                      <CardDescription>Your unique webpage that lives on the internet.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      {/* Preview Card */}
                      <div className="mb-6 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 relative group">
                        <div className="absolute top-2 right-2">
                          <Badge variant="outline" className="bg-white/80 dark:bg-slate-800/80">Preview</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16 border-2 border-white dark:border-slate-700 shadow-sm">
                            <AvatarImage src={profile?.profile_image_url} />
                            <AvatarFallback>{getInitials(profile?.display_name || "")}</AvatarFallback>
                          </Avatar>
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-slate-900 dark:text-white capitalize truncate">
                              {profile?.display_name || "New Player"}
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{profile?.position || "Position not set"}</p>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="secondary" className="text-[10px] py-0">{profile?.nationality || "Global"}</Badge>
                              <Badge variant="secondary" className="text-[10px] py-0">{profile?.age ? `${profile.age}y` : 'Age'}</Badge>
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
                                Copy Link
                              </>
                            ) : (
                              <>
                                <Lock className="mr-2 h-5 w-5" />
                                Unlock Link
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
                          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Quick Share</p>
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