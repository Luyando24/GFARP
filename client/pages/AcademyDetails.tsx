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
  XCircle,
  Eye,
  Trash2,
  X,
  Check,
  MessageSquare,
  UserPlus,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

  // Rejection Dialog State
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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

        // Set players from API response
        setPlayers(academyData.data?.players || []);

        // Set compliance and activities from API response (or empty if not available)
        setFifaCompliance(academyData.data?.compliance || null);
        setActivities(academyData.data?.activities || []);


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

  const fetchAcademyDetails = async () => {
      try {
        // Fetch academy details (re-using logic from useEffect, simplified for refresh)
        const response = await fetch(`/api/academies/${id}`);
        const academyData = await response.json();

        if (academyData.success) {
          setAcademy(academyData.data);
          setPlayers(academyData.data?.players || []);
          setFifaCompliance(academyData.data?.compliance || null);
          setActivities(academyData.data?.activities || []);
        }
      } catch (error) {
        console.error('Error refreshing academy details:', error);
      }
  };

  const handleUpdateStatus = async (documentId: string, status: string, reason?: string) => {
    setIsUpdating(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/compliance-documents/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('football-auth-token')}`
        },
        body: JSON.stringify({
          documentId,
          status,
          rejectionReason: reason
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update status');
      }

      toast({
        title: "Status Updated",
        description: `Document status updated to ${status}.`,
      });

      // Close dialog if open
      setShowRejectDialog(false);
      setRejectReason("");
      setSelectedDocId(null);

      // Refresh data
      fetchAcademyDetails();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return;
    }

    setIsUpdating(true);
    try {
        // Note: We don't have a specific delete endpoint for single documents yet in the public API list provided in context,
        // but typically it would follow REST conventions. 
        // If it doesn't exist, I might need to create it or use a Supabase direct call if allowed (but better via API).
        // Let's assume we can use a DELETE method on a generic endpoint or a specific one.
        // Since I just saw api/academies/[id] has delete academy, but not single doc.
        // I'll create a new endpoint `api/compliance-documents/delete.ts` implicitly or use `update-status` with 'deleted' if supported?
        // No, 'deleted' isn't in valid statuses.
        // Let's check if I can quickly create a delete endpoint or if I should assume one exists.
        // The user asked to "complete the CRUDE functions". "D" is Delete.
        // I will assume I need to create `api/compliance-documents/delete.ts` separately.
        
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        const response = await fetch(`${apiUrl}/compliance-documents/delete`, {
            method: 'POST', // or DELETE
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('football-auth-token')}`
            },
            body: JSON.stringify({ documentId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete document');
        }

        toast({
            title: "Document Deleted",
            description: "The document has been permanently removed.",
        });

        fetchAcademyDetails();

    } catch (error: any) {
        toast({
            title: "Error",
            description: error.message || "Failed to delete document",
            variant: "destructive"
        });
    } finally {
        setIsUpdating(false);
    }
  };

  const openRejectDialog = (docId: string) => {
    setSelectedDocId(docId);
    setRejectReason("");
    setShowRejectDialog(true);
  };

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
          {fifaCompliance ? (
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
                    {fifaCompliance.documents.map((doc: any) => {
                      const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
                      return (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium flex items-center">
                            {doc.name}
                            {isExpired && (
                              <Badge variant="destructive" className="ml-2 text-xs h-5">Expired</Badge>
                            )}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Uploaded: {new Date(doc.uploadDate).toLocaleDateString()} |
                            <span className={isExpired ? "text-red-500 font-medium ml-1" : "ml-1"}>
                              Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                            </span>
                          </p>
                          {doc.rejectionReason && (
                            <p className="text-sm text-red-500 mt-1">
                              Reason: {doc.rejectionReason}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Status Badges */}
                          {doc.status === 'verified' && !isExpired && (
                            <Badge className="bg-green-500 mr-2">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {doc.status === 'verified' && isExpired && (
                             <Badge variant="outline" className="text-red-500 border-red-500 mr-2">
                               <AlertTriangle className="h-3 w-3 mr-1" />
                               Expired (Verified)
                             </Badge>
                          )}
                          {doc.status === 'pending' && (
                            <Badge variant="secondary" className="mr-2">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          {doc.status === 'rejected' && (
                            <Badge variant="destructive" className="mr-2">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 border-l pl-2 ml-2">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                title="View Document"
                                onClick={() => window.open(doc.fileUrl, '_blank')}
                                disabled={!doc.fileUrl}
                            >
                                <Eye className="h-4 w-4 text-blue-500" />
                            </Button>
                            
                            {doc.status !== 'verified' && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    title="Approve"
                                    onClick={() => handleUpdateStatus(doc.id, 'verified')}
                                    disabled={isUpdating}
                                >
                                    <Check className="h-4 w-4 text-green-600" />
                                </Button>
                            )}
                            
                            {doc.status !== 'rejected' && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    title="Reject"
                                    onClick={() => openRejectDialog(doc.id)}
                                    disabled={isUpdating}
                                >
                                    <X className="h-4 w-4 text-red-600" />
                                </Button>
                            )}

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Delete"
                                onClick={() => handleDeleteDocument(doc.id)}
                                disabled={isUpdating}
                            >
                                <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-700" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">No compliance data available</p>
                <p className="text-sm">Compliance information has not been set up for this academy yet.</p>
              </CardContent>
            </Card>
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
                        {activity.type === 'status' && <Shield className="h-5 w-5 text-primary" />}
                        {activity.type === 'document' && <FileText className="h-5 w-5 text-primary" />}
                        {activity.type === 'player' && <UserPlus className="h-5 w-5 text-primary" />}
                        {!activity.type && <Clock className="h-5 w-5 text-primary" />}
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
                          <p className="text-sm mt-2 text-gray-600">{activity.details}</p>
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

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document. This will be sent to the academy admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Textarea 
                id="reject-reason" 
                placeholder="e.g. Document is blurry, Expired date, Wrong document type..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isUpdating}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedDocId && handleUpdateStatus(selectedDocId, 'rejected', rejectReason)}
              disabled={isUpdating || !rejectReason.trim()}
            >
              {isUpdating ? 'Rejecting...' : 'Reject Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AcademyDetails;