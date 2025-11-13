import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building, 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Calendar,
  ArrowLeft,
  Clock,
  CreditCard,
  Shield,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AcademyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [academy, setAcademy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [fifaCompliance, setFifaCompliance] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchAcademyDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch academy details
        const response = await fetch(`/api/academies/${id}`);
        const academyData = await response.json();
        
        if (academyData.success) {
          setAcademy(academyData.data);
        } else {
          throw new Error(academyData.error || 'Failed to fetch academy details');
        }
        
        // For now, set empty arrays for activities and players
        // These endpoints may not exist yet
        setActivities([]);
        setPlayers(academyData.data?.players || []);
        
        // Set FIFA compliance data (mock data for now)
        setFifaCompliance({
          overallStatus: 'under_review',
          complianceScore: 75,
          lastReviewDate: '2024-01-15',
          nextReviewDate: '2024-07-15',
          documents: [
            {
              id: 1,
              name: 'Academy License',
              type: 'academy_licensing',
              status: 'approved',
              uploadDate: '2024-01-10',
              expiryDate: '2025-01-10'
            },
            {
              id: 2,
              name: 'Youth Protection Certificate',
              type: 'youth_protection',
              status: 'pending',
              uploadDate: '2024-01-12',
              expiryDate: '2025-01-12'
            },
            {
              id: 3,
              name: 'Financial Fair Play Report',
              type: 'financial_fair_play',
              status: 'requires_action',
              uploadDate: '2024-01-08',
              expiryDate: '2024-12-31'
            },
            {
              id: 4,
              name: 'Player Registration Documents',
              type: 'player_registration',
              status: 'approved',
              uploadDate: '2024-01-05',
              expiryDate: '2024-12-31'
            }
          ],
          requirements: [
            {
              id: 1,
              name: 'Academy Infrastructure Standards',
              status: 'completed',
              description: 'Minimum facility requirements met'
            },
            {
              id: 2,
              name: 'Coaching Staff Qualifications',
              status: 'in_progress',
              description: 'Head coach certification pending'
            },
            {
              id: 3,
              name: 'Player Welfare Policies',
              status: 'completed',
              description: 'Child protection policies in place'
            },
            {
              id: 4,
              name: 'Financial Transparency',
              status: 'requires_attention',
              description: 'Annual financial report submission overdue'
            }
          ]
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching academy details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load academy details',
          variant: 'destructive',
        });
        setLoading(false);
      }
    };

    if (id) {
      fetchAcademyDetails();
    }
  }, [id, toast]);

  const handleBack = () => {
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!academy) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold mb-4">Academy not found</h2>
        <Button onClick={handleBack}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" onClick={handleBack} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">{academy.name}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="fifa-compliance">FIFA Compliance</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="mr-2 h-5 w-5" />
                Academy Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <div className="mt-1">
                    {academy.isActive ? (
                      <Badge className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Subscription Plan</h3>
                  <div className="mt-1">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                      {academy.subscriptionPlan || "Free Plan"}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">License Number</h3>
                  <p>{academy.licenseNumber || "Not provided"}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Founded Year</h3>
                  <p>{academy.foundedYear || "Not provided"}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Number of Players</h3>
                  <p>{academy.player_count || 0}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Phone className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
                    <p>{academy.phone || "Not provided"}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Mail className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                    <p>{academy.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                    <p>{[academy.address, academy.city, academy.country].filter(Boolean).join(', ')}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Globe className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Website</h3>
                    <p>{academy.website || "Not provided"}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Registration Date</h3>
                    <p>{new Date(academy.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Academy Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {academy.description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Current Plan</h3>
                  <p className="font-medium">{academy.subscriptionPlan || "Free Plan"}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Storage Used</h3>
                  <p>{(academy.storageUsed / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Next Billing Date</h3>
                  <p>{academy.nextBillingDate ? new Date(academy.nextBillingDate).toLocaleDateString() : "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Players ({players.length})
              </CardTitle>
              <CardDescription>
                All players registered with this academy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {players.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Name</th>
                        <th className="text-left py-3 px-4">Position</th>
                        <th className="text-left py-3 px-4">Age</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((player) => (
                        <tr key={player.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">{player.firstName} {player.lastName}</td>
                          <td className="py-3 px-4">{player.position || "N/A"}</td>
                          <td className="py-3 px-4">
                            {player.estimatedAge || "N/A"}
                          </td>
                          <td className="py-3 px-4">
                            {player.isActive ? (
                              <Badge className="bg-green-500">Active</Badge>
                            ) : (
                              <Badge variant="destructive">Inactive</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/admin/player-details/${player.id}`)}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No players found for this academy
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fifa-compliance" className="space-y-6">
          {fifaCompliance && (
            <>
              {/* Overall Compliance Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    FIFA Compliance Status
                  </CardTitle>
                  <CardDescription>
                    Overall compliance assessment and score
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold mb-2">
                        {fifaCompliance.complianceScore}%
                      </div>
                      <p className="text-sm text-muted-foreground">Compliance Score</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        {fifaCompliance.overallStatus === 'approved' && <CheckCircle className="h-8 w-8 text-green-500" />}
                        {fifaCompliance.overallStatus === 'under_review' && <Clock className="h-8 w-8 text-yellow-500" />}
                        {fifaCompliance.overallStatus === 'requires_action' && <AlertTriangle className="h-8 w-8 text-red-500" />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Status: {fifaCompliance.overallStatus.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold mb-2">
                        {new Date(fifaCompliance.nextReviewDate).toLocaleDateString()}
                      </div>
                      <p className="text-sm text-muted-foreground">Next Review</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Document Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileCheck className="mr-2 h-5 w-5" />
                    Required Documents
                  </CardTitle>
                  <CardDescription>
                    Status of all FIFA compliance documents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {fifaCompliance.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{doc.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Uploaded: {new Date(doc.uploadDate).toLocaleDateString()} | 
                            Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {doc.status === 'approved' && (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          )}
                          {doc.status === 'pending' && (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          {doc.status === 'requires_action' && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Action Required
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Compliance Requirements
                  </CardTitle>
                  <CardDescription>
                    FIFA compliance checklist and requirements status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {fifaCompliance.requirements.map((req: any) => (
                      <div key={req.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                        <div className="mt-1">
                          {req.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                          {req.status === 'in_progress' && <Clock className="h-5 w-5 text-yellow-500" />}
                          {req.status === 'requires_attention' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{req.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{req.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Recent Activities
              </CardTitle>
              <CardDescription>
                Recent actions and events related to this academy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity, index) => (
                    <div key={activity.id || `activity-${index}-${activity.timestamp || Date.now()}`} className="flex items-start pb-4 border-b last:border-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{activity.action}</p>
                        <div className="flex items-center mt-1">
                          <p className="text-sm text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                          {activity.user && (
                            <p className="text-sm text-muted-foreground ml-2">
                              by {activity.user}
                            </p>
                          )}
                        </div>
                        {activity.details && (
                          <p className="text-sm mt-2">{activity.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No activities recorded for this academy
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AcademyDetails;