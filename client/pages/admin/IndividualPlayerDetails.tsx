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
  Check
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/components/ui/use-toast";
import { PlayerApi } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function IndividualPlayerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
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
    
    // TODO: Add delete API call if needed, currently not exposed in PlayerApi for admin delete but endpoint exists
    // Assuming we might need to add it or use raw Api call
    // For now just show toast as placeholder if API not ready in frontend lib
    toast({
      title: "Info",
      description: "Delete functionality to be connected",
    });
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
                  Joined: {new Date(player.created_at).toLocaleDateString()}
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
             <CardContent>
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
