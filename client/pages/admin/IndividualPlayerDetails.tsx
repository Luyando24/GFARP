import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  MapPin,
  Shield,
  CreditCard,
  Trash2,
  Check,
  Edit
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/components/ui/use-toast";
import { PlayerApi } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function IndividualPlayerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (id) {
      fetchPlayer();
    }
  }, [id]);

  const fetchPlayer = async () => {
    try {
      setLoading(true);
      const response = await PlayerApi.getAdminPlayerDetails(id!);
      if (response.success) {
        setPlayer(response.data);
        setFormData(response.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch player details",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching player:', error);
      toast({
        title: "Error",
        description: "Failed to fetch player details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this player? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await PlayerApi.deleteAdminPlayer(id!);
      if (response.success) {
        toast({
          title: "Success",
          description: "Player deleted successfully",
        });
        navigate('/admin');
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to delete player",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting player:', error);
      toast({
        title: "Error",
        description: "Failed to delete player",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await PlayerApi.updateAdminPlayer(id!, formData);
      if (response.success) {
        toast({
          title: "Success",
          description: "Player updated successfully",
        });
        setPlayer({ ...player, ...formData });
        setIsEditing(false);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to update player",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating player:', error);
      toast({
        title: "Error",
        description: "Failed to update player",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!player) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Player not found</h2>
          <Button onClick={() => navigate('/admin')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Button 
        variant="ghost" 
        className="mb-6" 
        onClick={() => navigate('/admin')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Basic Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={player.profile_image_url} />
                  <AvatarFallback className="text-xl">
                    {player.first_name?.[0]}{player.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle>{player.first_name} {player.last_name}</CardTitle>
              <CardDescription>{player.email}</CardDescription>
              {player.current_plan && (
                 <Badge className="mt-2" variant={player.current_plan === 'pro' ? 'default' : 'secondary'}>
                   {player.current_plan.toUpperCase()} PLAN
                 </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-slate-500">
                  <Calendar className="mr-2 h-4 w-4" />
                  Joined: {player.created_at ? new Date(player.created_at).toLocaleDateString() : 'Unknown'}
                </div>
                {player.position && (
                  <div className="flex items-center text-sm text-slate-500">
                    <User className="mr-2 h-4 w-4" />
                    Position: {player.position}
                  </div>
                )}
                {player.nationality && (
                  <div className="flex items-center text-sm text-slate-500">
                    <MapPin className="mr-2 h-4 w-4" />
                    Nationality: {player.nationality}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
               <CardTitle className="text-sm font-semibold uppercase text-slate-500">Actions</CardTitle>
             </CardHeader>
             <CardContent className="space-y-2">
               <Dialog open={isEditing} onOpenChange={setIsEditing}>
                 <DialogTrigger asChild>
                   <Button variant="outline" className="w-full">
                     <Edit className="mr-2 h-4 w-4" /> Edit Player
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                   <DialogHeader>
                     <DialogTitle>Edit Player Details</DialogTitle>
                     <DialogDescription>
                       Make changes to the player's profile here. Click save when you're done.
                     </DialogDescription>
                   </DialogHeader>
                   <div className="grid gap-4 py-4">
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label htmlFor="first_name">First Name</Label>
                         <Input
                           id="first_name"
                           name="first_name"
                           value={formData.first_name || ''}
                           onChange={handleInputChange}
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="last_name">Last Name</Label>
                         <Input
                           id="last_name"
                           name="last_name"
                           value={formData.last_name || ''}
                           onChange={handleInputChange}
                         />
                       </div>
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="email">Email</Label>
                       <Input
                         id="email"
                         name="email"
                         value={formData.email || ''}
                         onChange={handleInputChange}
                       />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
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
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label htmlFor="position">Position</Label>
                         <Input
                           id="position"
                           name="position"
                           value={formData.position || ''}
                           onChange={handleInputChange}
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
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label htmlFor="height">Height (cm)</Label>
                         <Input
                           id="height"
                           name="height"
                           type="number"
                           value={formData.height || ''}
                           onChange={handleInputChange}
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
                         />
                       </div>
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="bio">Bio</Label>
                       <Textarea
                         id="bio"
                         name="bio"
                         value={formData.bio || ''}
                         onChange={handleInputChange}
                         rows={4}
                       />
                     </div>
                   </div>
                   <DialogFooter>
                     <Button type="submit" onClick={handleSave} disabled={saving}>
                       {saving ? "Saving..." : "Save changes"}
                     </Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>
               <Button variant="destructive" className="w-full" onClick={handleDelete}>
                 <Trash2 className="mr-2 h-4 w-4" /> Delete Player
               </Button>
             </CardContent>
          </Card>
        </div>

        {/* Right Column: Detailed Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Player Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Date of Birth / Age</h4>
                  <p>{player.age ? `${player.age} years old` : 'Not set'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Current Club</h4>
                  <p>{player.current_club || 'Not set'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Height</h4>
                  <p>{player.height ? `${player.height} cm` : 'Not set'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Weight</h4>
                  <p>{player.weight ? `${player.weight} kg` : 'Not set'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Preferred Foot</h4>
                  <p>{player.preferred_foot || 'Not set'}</p>
                </div>
              </div>

              {player.bio && (
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Bio</h4>
                  <p className="text-sm leading-relaxed">{player.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              {player.purchase_history && player.purchase_history.length > 0 ? (
                <div className="space-y-4">
                  {player.purchase_history.map((purchase: any) => (
                    <div key={purchase.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">{purchase.plan_type === 'pro' ? 'Pro Plan' : purchase.plan_type}</p>
                        <p className="text-sm text-slate-500">{new Date(purchase.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${purchase.amount}</p>
                        <Badge variant={purchase.status === 'completed' ? 'default' : 'outline'}>
                          {purchase.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">No purchase history found</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
