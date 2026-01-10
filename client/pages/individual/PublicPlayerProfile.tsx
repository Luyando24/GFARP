import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PlayerProfile } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Globe, Video, User, MapPin, Activity, Share2 } from "lucide-react";
import { toast } from "sonner";

// We need to define the API call here or import it if we make it public in api.ts
// Since PlayerApi is likely using an axios instance with auth interceptors, we might need a separate call
// or ensure the backend route doesn't require auth (which it doesn't).
// I'll add a fetchPublicProfile method to the api service or just use fetch here.

export default function PublicPlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchPublicProfile(id);
    }
  }, [id]);

  const fetchPublicProfile = async (playerId: string) => {
    try {
      const response = await fetch(`/api/individual-players/public/${playerId}`);
      if (!response.ok) {
        throw new Error("Profile not found");
      }
      const data = await response.json();
      setProfile(data);
    } catch (err) {
      console.error("Error fetching public profile:", err);
      setError("Profile not found or unavailable");
    } finally {
      setLoading(false);
    }
  };

  const copyPageLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Profile link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-8">{error || "Profile not found"}</p>
          <Button onClick={() => window.location.href = '/'}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header / Banner */}
      <div className="bg-green-600 h-48 w-full relative">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-4 h-full flex items-end pb-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between w-full gap-4">
             <div className="text-white">
               <h1 className="text-4xl md:text-5xl font-bold mb-2">{profile.display_name}</h1>
               <div className="flex flex-wrap gap-4 text-green-50">
                 {profile.position && (
                   <div className="flex items-center">
                     <Activity className="h-4 w-4 mr-1" />
                     {profile.position}
                   </div>
                 )}
                 {profile.nationality && (
                   <div className="flex items-center">
                     <MapPin className="h-4 w-4 mr-1" />
                     {profile.nationality}
                   </div>
                 )}
                 {profile.age && (
                   <div className="flex items-center">
                     <User className="h-4 w-4 mr-1" />
                     {profile.age} Years Old
                   </div>
                 )}
               </div>
             </div>
             
             <Button 
               variant="secondary" 
               size="sm" 
               className="bg-white/90 hover:bg-white text-green-700 border-none shadow-lg"
               onClick={copyPageLink}
             >
               <Share2 className="h-4 w-4 mr-2" />
               Share Profile
             </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Bio Section */}
            {profile.bio && (
              <Card className="shadow-md border-none overflow-hidden">
                <CardHeader className="bg-white border-b border-gray-100 pb-3">
                  <CardTitle className="text-xl text-gray-800">About</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Career Details */}
            <Card className="shadow-md border-none overflow-hidden">
              <CardHeader className="bg-white border-b border-gray-100 pb-3">
                <CardTitle className="text-xl text-gray-800">Career Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                 {profile.current_club && (
                   <div>
                     <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Current Club</label>
                     <p className="text-lg font-medium text-gray-900 mt-1">{profile.current_club}</p>
                   </div>
                 )}
                 {profile.position && (
                   <div>
                     <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Position</label>
                     <p className="text-lg font-medium text-gray-900 mt-1">{profile.position}</p>
                   </div>
                 )}
                 {profile.nationality && (
                   <div>
                     <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Nationality</label>
                     <p className="text-lg font-medium text-gray-900 mt-1">{profile.nationality}</p>
                   </div>
                 )}
                 {profile.age && (
                   <div>
                     <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Age</label>
                     <p className="text-lg font-medium text-gray-900 mt-1">{profile.age}</p>
                   </div>
                 )}
              </CardContent>
            </Card>

            {/* Video Highlights */}
            {profile.video_links && profile.video_links.length > 0 && profile.video_links.some(l => l) && (
              <Card className="shadow-md border-none overflow-hidden">
                <CardHeader className="bg-white border-b border-gray-100 pb-3">
                  <CardTitle className="text-xl text-gray-800 flex items-center">
                    <Video className="mr-2 h-5 w-5 text-green-600" />
                    Video Highlights
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {profile.video_links.map((link, idx) => (
                    link && (
                      <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100">
                        <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 mr-4">
                          <Video className="h-5 w-5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-medium text-gray-900 truncate">Highlight Video {idx + 1}</p>
                          <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate block">
                            {link}
                          </a>
                        </div>
                        <Button size="sm" variant="ghost" asChild>
                           <a href={link} target="_blank" rel="noopener noreferrer">Watch</a>
                        </Button>
                      </div>
                    )
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
             {/* External Links */}
             {profile.transfermarket_link && (
               <Card className="shadow-md border-none overflow-hidden bg-blue-50/50 border-blue-100">
                 <CardHeader className="pb-3 border-b border-blue-100">
                   <CardTitle className="text-lg text-blue-900 flex items-center">
                     <Globe className="mr-2 h-4 w-4" />
                     External Profiles
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="pt-4">
                   <a 
                     href={profile.transfermarket_link} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="flex items-center justify-between w-full p-3 bg-white rounded-lg border border-blue-200 hover:shadow-sm transition-all group"
                   >
                     <span className="font-medium text-blue-800">TransferMarket</span>
                     <Globe className="h-4 w-4 text-blue-400 group-hover:text-blue-600" />
                   </a>
                 </CardContent>
               </Card>
             )}

             {/* Footer Branding */}
             <div className="text-center text-gray-400 text-sm py-4">
               <p>Powered by Soccer Circular</p>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}
