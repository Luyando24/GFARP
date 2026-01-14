import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PlayerProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, Video, User, MapPin, Activity, Share2, Image, Mail, MessageCircle, Phone, Instagram, Twitter, Linkedin, Facebook } from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";

// We need to define the API call here or import it if we make it public in api.ts
// Since PlayerApi is likely using an axios instance with auth interceptors, we might need a separate call
// or ensure the backend route doesn't require auth (which it doesn't).
// I'll add a fetchPublicProfile method to the api service or just use fetch here.

export default function PublicPlayerProfile({ slug }: { slug?: string }) {
  const params = useParams<{ id: string; slug: string }>();
  const id = params.id;
  const routeSlug = params.slug;
  const effectiveSlug = slug || routeSlug;

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageTitle(profile ? `${profile.display_name} - Player Profile` : "Player Profile");

  useEffect(() => {
    if (effectiveSlug) {
      fetchPublicProfileBySlug(effectiveSlug);
    } else if (id) {
      fetchPublicProfile(id);
    }
  }, [id, effectiveSlug]);

  const fetchPublicProfileBySlug = async (playerSlug: string) => {
    try {
      const response = await fetch(`/api/individual-players/public/by-slug/${playerSlug}`);
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
    // If slug is present, ensure we copy the slug version if not already on it
    let url = window.location.href;
    const hostname = window.location.hostname;

    // Fallback if not on the correct URL (e.g. if rendered via ID but slug exists)
    if (profile?.slug) {
       if (hostname.includes('soccercircular.com')) {
          url = `${window.location.protocol}//${profile.slug}.soccercircular.com`;
       } else if (!url.includes(profile.slug)) {
          // Construct clean URL for other environments
          url = `${window.location.origin}/${profile.slug}`;
       }
    }

    navigator.clipboard.writeText(url);
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
          <Button onClick={handleGoHome}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      {/* Premium Hero Section */}
      <div className="relative h-[450px] w-full overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/60 to-slate-950 z-10" />
        {profile.cover_image_url ? (
          <img
            src={profile.cover_image_url}
            alt="Cover"
            className="w-full h-full object-cover opacity-60 scale-105"
          />
        ) : profile.profile_image_url ? (
          <img
            src={profile.profile_image_url}
            alt={profile.display_name}
            className="w-full h-full object-cover blur-md opacity-40 scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-600 to-blue-700 opacity-20" />
        )}

        <div className="absolute inset-0 z-20 flex items-end">
          <div className="container mx-auto px-4 pb-12">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-8 text-center md:text-left">
              <div className="relative group">
                <Avatar className="h-40 w-40 border-4 border-white dark:border-slate-800 shadow-2xl ring-4 ring-green-500/20">
                  <AvatarImage src={profile.profile_image_url} className="object-cover" />
                  <AvatarFallback className="text-4xl bg-slate-100 text-slate-400">
                    {profile.display_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white dark:border-slate-800">
                  <Activity className="h-5 w-5" />
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <Badge className="bg-green-500 hover:bg-green-600 text-white border-none px-3 py-1 uppercase tracking-wider text-[10px] font-bold">
                    Professional Profile
                  </Badge>
                  {profile.position && (
                    <Badge variant="outline" className="text-white border-white/20 bg-white/5 backdrop-blur-md px-3 py-1 italic">
                      {profile.position}
                    </Badge>
                  )}
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight drop-shadow-sm uppercase italic">
                  {profile.display_name}
                </h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-slate-300 font-medium tracking-wide">
                  {profile.nationality && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-green-400" /> {profile.nationality}
                    </span>
                  )}
                  {profile.age && (
                    <span className="flex items-center gap-1.5">
                      <User className="h-4 w-4 text-blue-400" /> {profile.age} Years
                    </span>
                  )}
                  {profile.current_club && (
                    <span className="flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-purple-400" /> {profile.current_club}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  onClick={copyPageLink}
                  className="bg-white hover:bg-slate-100 text-slate-900 rounded-full px-6 py-6 sm:py-2 font-bold shadow-xl transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Profile
                </Button>
                {(profile.contact_email || profile.whatsapp_number) && (
                  <Button
                    onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-full px-6 py-6 sm:py-2 font-bold shadow-xl transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Player
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Navigation Menu */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center md:justify-start overflow-x-auto no-scrollbar py-1 gap-2 md:gap-8">
            {[
              { label: 'Profile', href: '#profile' },
              { label: 'Attributes', href: '#attributes' },
              { label: 'Highlights', href: '#highlights' },
              { label: 'Gallery', href: '#gallery' },
              { label: 'Career', href: '#career' },
              { label: 'Contact', href: '#contact' }
            ].map(item => (
              <a
                key={item.href}
                href={item.href}
                className="px-4 py-3 text-sm font-bold uppercase tracking-widest text-slate-500 hover:text-green-500 transition-colors whitespace-nowrap"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Scouting Report Column (Left) */}
          <div id="profile" className="lg:col-span-8 space-y-12">

            {/* About Section */}
            {profile.bio && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1.5 bg-green-500 rounded-full" />
                  <h2 className="text-2xl font-black uppercase tracking-tight italic">Player Bio</h2>
                </div>
                <div className="p-6 md:p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    {profile.bio}
                  </p>
                </div>
              </section>
            )}

            {/* Performance Stats Grid */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1.5 bg-blue-500 rounded-full" />
                <h2 className="text-2xl font-black uppercase tracking-tight italic">Technical Attributes</h2>
              </div>
              <div id="attributes" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Position", value: profile.position, icon: Activity, color: "text-green-500" },
                  { label: "Preferred Foot", value: profile.preferred_foot, icon: Globe, color: "text-blue-500" },
                  { label: "Height", value: profile.height ? `${profile.height}cm` : null, icon: Activity, color: "text-purple-500" },
                  { label: "Weight", value: profile.weight ? `${profile.weight}kg` : null, icon: Activity, color: "text-orange-500" }
                ].map((stat, i) => stat.value && (
                  <div key={i} className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <stat.icon className={`h-6 w-6 ${stat.color} mb-3`} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                    <span className="text-lg font-black mt-1 text-slate-900 dark:text-white uppercase italic">{stat.value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Video Showcase */}
            {profile.video_links && profile.video_links.some(l => l) && (
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1.5 bg-red-500 rounded-full" />
                  <h2 className="text-2xl font-black uppercase tracking-tight italic">Video Highlights</h2>
                </div>
                <div id="highlights" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.video_links.map((link, idx) => link && (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative h-48 rounded-3xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 block"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent z-10" />
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="h-14 w-14 bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform">
                          <Video className="h-6 w-6" />
                        </div>
                      </div>
                      <div className="absolute bottom-6 left-6 z-20">
                        <p className="text-white font-black uppercase italic tracking-wider">Highlight #{idx + 1}</p>
                        <p className="text-slate-300 text-xs truncate max-w-[200px]">{link}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Photo Gallery */}
            {profile.gallery_images && profile.gallery_images.some(img => img) && (
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1.5 bg-purple-500 rounded-full" />
                  <h2 className="text-2xl font-black uppercase tracking-tight italic">Action Gallery</h2>
                </div>
                <div id="gallery" className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {profile.gallery_images.map((img, idx) => img && (
                    <div key={idx} className="aspect-[4/3] rounded-3xl overflow-hidden shadow-lg border-2 border-white dark:border-slate-800">
                      <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Career Journey Section */}
            {(profile.career_history || profile.honours || profile.education) && (
              <section id="career" className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1.5 bg-yellow-500 rounded-full" />
                  <h2 className="text-2xl font-black uppercase tracking-tight italic">Career & Background</h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {profile.career_history && (
                    <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Career Journey
                      </h3>
                      <div className="text-slate-600 dark:text-slate-400 font-medium whitespace-pre-line leading-relaxed">
                        {profile.career_history}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profile.honours && (
                      <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                          <Activity className="h-4 w-4 text-yellow-500" /> Honours & Awards
                        </h3>
                        <div className="text-slate-600 dark:text-slate-400 font-medium whitespace-pre-line italic">
                          {profile.honours}
                        </div>
                      </div>
                    )}
                    {profile.education && (
                      <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-500" /> Education
                        </h3>
                        <div className="text-slate-600 dark:text-slate-400 font-medium whitespace-pre-line">
                          {profile.education}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Contact Section */}
            {(profile.contact_email || profile.whatsapp_number) && (
              <section id="contact" className="space-y-6 pt-12">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1.5 bg-green-500 rounded-full" />
                  <h2 className="text-2xl font-black uppercase tracking-tight italic">Scouting Contact</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.contact_email && (
                    <div className="p-6 md:p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center group hover:border-green-500/50 transition-colors">
                      <div className="h-14 w-14 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Mail className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</h3>
                      <p className="text-lg font-black text-slate-800 dark:text-white mb-6 break-all">{profile.contact_email}</p>
                      <Button asChild className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl">
                        <a href={`mailto:${profile.contact_email}`}>Send Email</a>
                      </Button>
                    </div>
                  )}
                  {profile.whatsapp_number && (
                    <div className="p-6 md:p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center group hover:border-[#25D366]/50 transition-colors">
                      <div className="h-14 w-14 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <MessageCircle className="h-6 w-6 text-[#25D366]" />
                      </div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">WhatsApp</h3>
                      <p className="text-lg font-black text-slate-800 dark:text-white mb-6">{profile.whatsapp_number}</p>
                      <Button asChild className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl">
                        <a href={`https://wa.me/${profile.whatsapp_number.replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer">
                          Chat on WhatsApp
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Context Sidebar (Right) */}
          <div className="lg:col-span-4 space-y-8">
            <div className="sticky top-12 space-y-8">
              {/* Transfermarket Card */}
              {profile.transfermarket_link && (
                <div className="p-8 bg-blue-600 rounded-[2.5rem] text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
                  <Globe className="absolute -bottom-4 -right-4 h-32 w-32 text-white/10 group-hover:rotate-12 transition-transform" />
                  <div className="relative z-10 space-y-6">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-blue-100 mb-1">Official Data</h3>
                      <p className="text-2xl font-black italic uppercase tracking-tight">Market Profile</p>
                    </div>
                    <Button
                      asChild
                      className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-2xl"
                    >
                      <a href={profile.transfermarket_link} target="_blank" rel="noopener noreferrer">
                        View on TransferMarket
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {/* Verified Badge Section */}
              <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                <div className="h-16 w-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-green-500" />
                </div>
                <h4 className="text-xl font-black uppercase italic tracking-tight text-slate-800 dark:text-white">Soccer Circular</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">Verified Player Profile</p>
              </div>

              {/* Social Media Links */}
              {profile.social_links && (Object.values(profile.social_links).some(link => link)) && (
                <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 text-center">Social Presence</h3>
                  <div className="flex flex-wrap justify-center gap-4">
                    {profile.social_links.instagram && (
                      <a href={profile.social_links.instagram} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full hover:bg-pink-50 hover:text-pink-600 transition-colors">
                        <Instagram className="h-5 w-5" />
                      </a>
                    )}
                    {profile.social_links.twitter && (
                      <a href={profile.social_links.twitter} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full hover:bg-blue-50 hover:text-blue-400 transition-colors">
                        <Twitter className="h-5 w-5" />
                      </a>
                    )}
                    {profile.social_links.linkedin && (
                      <a href={profile.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors">
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                    {profile.social_links.facebook && (
                      <a href={profile.social_links.facebook} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full hover:bg-blue-50 hover:text-blue-700 transition-colors">
                        <Facebook className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-[10px] text-slate-400 text-center px-12 leading-relaxed uppercase font-bold tracking-tighter opacity-50">
                This profile is managed by the player and their verified technical representatives. All data is subject to professional verification.
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Dynamic Footer */}
      <footer className="py-20 border-t border-slate-100 dark:border-slate-900/50">
        <div className="container mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 opacity-30 grayscale">
            <div className="h-8 w-8 bg-slate-400 rounded-full" />
            <span className="font-black text-xl italic tracking-tighter uppercase whitespace-nowrap">Soccer Circular</span>
          </div>
          <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">Connecting Talent With Opportunity Globally</p>
        </div>
      </footer>
    </div >
  );
}
