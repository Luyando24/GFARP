import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Upload,
  Star,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout, FileImage, Type } from 'lucide-react';

interface Testimonial {
  id: string;
  customer_name: string;
  customer_position: string;
  content: string;
  image_url: string;
  type: 'text' | 'screenshot';
  screenshot_url: string;
  is_published: boolean;
  rating: number;
  created_at: string;
}

const TestimonialManagement: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_position: '',
    content: '',
    image_url: '',
    type: 'text' as 'text' | 'screenshot',
    screenshot_url: '',
    rating: 5,
    is_published: true
  });
 Coles

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/testimonials');
      const data = await res.json();
      if (data.success) {
        setTestimonials(data.data);
      }
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      toast({
        title: "Error",
        description: "Failed to fetch testimonials",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('folder', 'testimonials');

      const response = await fetch('/api/uploads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('football-auth-token')}`
        },
        body: uploadFormData
      });

      const result = await response.json();
      if (result.success) {
        setFormData(prev => ({ ...prev, image_url: result.data.url }));
        toast({
          title: "Success",
          description: "Image uploaded successfully"
        });
      } else {
        throw new Error(result.error || "Failed to upload image");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({
            title: "Error",
            description: "Please upload an image file",
            variant: "destructive"
        });
        return;
    }

    setIsUploading(true);
    try {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('folder', 'testimonials/screenshots');

        const response = await fetch('/api/uploads', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('football-auth-token')}`
            },
            body: uploadFormData
        });

        const result = await response.json();
        if (result.success) {
            setFormData(prev => ({ ...prev, screenshot_url: result.data.url }));
            toast({
                title: "Success",
                description: "Screenshot uploaded successfully"
            });
        } else {
            throw new Error(result.error || "Failed to upload screenshot");
        }
    } catch (error: any) {
        toast({
            title: "Error",
            description: error.message || "Failed to upload screenshot",
            variant: "destructive"
        });
    } finally {
        setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const url = editingTestimonial 
      ? `/api/testimonials/${editingTestimonial.id}`
      : '/api/testimonials';
    const method = editingTestimonial ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('football-auth-token')}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Success",
          description: `Testimonial ${editingTestimonial ? 'updated' : 'created'} successfully`
        });
        setShowModal(false);
        setEditingTestimonial(null);
        resetForm();
        fetchTestimonials();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save testimonial",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;
    try {
      const res = await fetch(`/api/testimonials/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('football-auth-token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Testimonial deleted successfully"
        });
        fetchTestimonials();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete testimonial",
        variant: "destructive"
      });
    }
  };

  const openEdit = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setFormData({
      customer_name: testimonial.customer_name,
      customer_position: testimonial.customer_position || '',
      content: testimonial.content || '',
      image_url: testimonial.image_url || '',
      type: testimonial.type || 'text',
      screenshot_url: testimonial.screenshot_url || '',
      rating: testimonial.rating || 5,
      is_published: testimonial.is_published
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_position: '',
      content: '',
      image_url: '',
      type: 'text',
      screenshot_url: '',
      rating: 5,
      is_published: true
    });
  };

  const openAddModal = () => {
    setEditingTestimonial(null);
    resetForm();
    setShowModal(true);
  };

  const filteredTestimonials = testimonials.filter(t => 
    t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            Testimonial Management
          </h2>
          <p className="text-slate-600 dark:text-slate-400">Manage customer success stories and feedback</p>
        </div>
        <Button onClick={openAddModal} className="bg-[#005391] hover:bg-[#004275]">
          <Plus className="mr-2 h-4 w-4" /> Create Testimonial
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle>All Testimonials</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search testimonials..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
              <p className="text-slate-500">Loading testimonials...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Type</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Content / Screenshot</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Rating</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredTestimonials.map((testimonial) => (
                    <tr key={testimonial.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden border">
                            {testimonial.image_url ? (
                              <img src={testimonial.image_url} alt={testimonial.customer_name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold">
                                {testimonial.customer_name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white">{testimonial.customer_name}</div>
                            <div className="text-xs text-slate-500">{testimonial.customer_position}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {testimonial.type === 'screenshot' ? (
                            <><FileImage size={12} /> Image</>
                          ) : (
                            <><Type size={12} /> Text</>
                          )}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        {testimonial.type === 'screenshot' ? (
                          <div className="h-12 w-20 rounded border bg-slate-100 overflow-hidden">
                             <img src={testimonial.screenshot_url} alt="Screenshot" className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 italic">"{testimonial.content}"</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-0.5 text-yellow-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} fill={i < testimonial.rating ? "currentColor" : "none"} />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={testimonial.is_published ? "default" : "secondary"} className={testimonial.is_published ? "bg-green-500" : ""}>
                          {testimonial.is_published ? "Published" : "Draft"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(testimonial)}>
                          <Edit size={18} className="text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(testimonial.id)}>
                          <Trash2 size={18} className="text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredTestimonials.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                        {searchQuery ? "No testimonials match your search." : "No testimonials created yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {editingTestimonial ? 'Edit Testimonial' : 'Create New Testimonial'}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="rounded-full">
                <X size={20} />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Customer Name</label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Position / Title</label>
                  <Input
                    value={formData.customer_position}
                    onChange={(e) => setFormData({...formData, customer_position: e.target.value})}
                    placeholder="e.g. Academy Director"
                  />
                </div>
              </div>

              <div className="space-y-4 py-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Testimonial Type</label>
                <Tabs value={formData.type} onValueChange={(val) => setFormData({...formData, type: val as 'text' | 'screenshot'})} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-12">
                    <TabsTrigger value="text" className="gap-2">
                      <Type size={16} /> Text Testimonial
                    </TabsTrigger>
                    <TabsTrigger value="screenshot" className="gap-2">
                      <FileImage size={16} /> Screenshot
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-6">
                    <TabsContent value="text">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Testimonial Content</label>
                        <textarea
                          value={formData.content}
                          onChange={(e) => setFormData({...formData, content: e.target.value})}
                          className="w-full p-4 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[150px]"
                          placeholder="Share the customer's success story..."
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="screenshot">
                       <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Screenshot Upload</label>
                        <div 
                          onClick={() => screenshotInputRef.current?.click()}
                          className={`w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                            formData.screenshot_url ? 'border-blue-400 bg-blue-50/10' : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {formData.screenshot_url ? (
                            <div className="relative w-full h-full p-2">
                              <img src={formData.screenshot_url} alt="Screenshot" className="w-full h-full object-contain rounded-lg shadow-sm" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                                <p className="text-white font-bold text-sm">Click to change screenshot</p>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                                <FileImage className="text-blue-600 h-6 w-6" />
                              </div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">Click to upload screenshot</p>
                              <p className="text-xs text-slate-500 mt-1">Upload WhatsApp/SMS screenshot</p>
                            </>
                          )}
                          <input
                            type="file"
                            ref={screenshotInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleScreenshotUpload}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Rating</label>
                  <div className="flex items-center gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({...formData, rating: star})}
                        className="transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star 
                          size={28} 
                          className={star <= formData.rating ? "text-yellow-500" : "text-slate-300 dark:text-slate-600"} 
                          fill={star <= formData.rating ? "currentColor" : "none"} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</label>
                  <div className="flex items-center gap-4 mt-2">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, is_published: true})}
                      className={`flex-1 py-2 px-4 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                        formData.is_published 
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle size={18} /> Published
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, is_published: false})}
                      className={`flex-1 py-2 px-4 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                        !formData.is_published 
                        ? 'bg-slate-100 border-slate-500 text-slate-700 font-bold' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <XCircle size={18} /> Draft
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Customer Photo</label>
                <div className="flex items-center gap-4 mt-2">
                  <div className="h-20 w-20 rounded-full bg-slate-100 border border-slate-200 overflow-hidden relative group">
                    {formData.image_url ? (
                      <>
                        <img src={formData.image_url} alt="Preview" className="h-full w-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, image_url: ''})}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <X className="text-white" size={20} />
                        </button>
                      </>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400">
                        {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={24} />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? "Uploading..." : formData.image_url ? "Change Photo" : "Upload Photo"}
                    </Button>
                    <p className="text-xs text-slate-500 mt-2">Recommended: Square format, min 400x400px</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                  disabled={isSaving || isUploading}
                >
                  {isSaving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    editingTestimonial ? 'Update Testimonial' : 'Create Testimonial'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestimonialManagement;
