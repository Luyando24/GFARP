import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    ArrowLeft, 
    Save, 
    Image as ImageIcon,
    Menu,
    LogOut,
    Users,
    Upload,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import AdminSidebar from '@/components/dashboard/AdminSidebar';
import ThemeToggle from '@/components/navigation/ThemeToggle';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth, clearSession } from '@/lib/auth';

interface BlogPost {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    status: 'draft' | 'published' | 'archived';
    image_url: string;
    seo_title: string;
    seo_description: string;
    tags: string[];
}

export default function BlogEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    
    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        status: "draft",
        image_url: "",
        seo_title: "",
        seo_description: "",
        tags: ""
    });

    useEffect(() => {
        if (id) {
            fetchBlog(id);
        }
    }, [id]);

    const fetchBlog = async (blogId: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/blogs/${blogId}`);
            const result = await response.json();
            if (result.success) {
                const blog = result.data;
                setFormData({
                    title: blog.title,
                    slug: blog.slug,
                    excerpt: blog.excerpt || "",
                    content: blog.content,
                    status: blog.status,
                    image_url: blog.image_url || "",
                    seo_title: blog.seo_title || "",
                    seo_description: blog.seo_description || "",
                    tags: blog.tags ? blog.tags.join(", ") : ""
                });
            } else {
                toast({
                    title: "Error",
                    description: "Failed to fetch blog post",
                    variant: "destructive"
                });
                navigate('/admin');
            }
        } catch (error) {
            console.error("Failed to fetch blog:", error);
            toast({
                title: "Error",
                description: "Failed to fetch blog post",
                variant: "destructive"
            });
            navigate('/admin');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        clearSession();
        navigate('/admin/login');
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            toast({
                title: "Error",
                description: "Please upload an image file",
                variant: "destructive"
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB
            toast({
                title: "Error",
                description: "Image size should be less than 5MB",
                variant: "destructive"
            });
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'blog-images');

            const response = await fetch('/api/uploads', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('football-auth-token')}`
                },
                body: formData
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
            console.error('Upload error:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to upload image",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSubmit = async () => {
        if (!formData.title) {
            toast({
                title: "Error",
                description: "Title is required",
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        try {
            const url = id ? `/api/blogs/${id}` : '/api/blogs';
            const method = id ? 'PUT' : 'POST';
            
            const payload = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('football-auth-token')}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                toast({ 
                    title: "Success", 
                    description: `Blog post ${id ? 'updated' : 'created'} successfully` 
                });
                navigate('/admin');
            } else {
                throw new Error(result.message || "Failed to save");
            }
        } catch (error: any) {
            toast({ 
                title: "Error", 
                description: error.message || "Failed to save blog post", 
                variant: "destructive" 
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-screen bg-background">
            <AdminSidebar 
                collapsed={sidebarCollapsed} 
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
            />
            
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-card border-b px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="lg:hidden"
                        >
                            <Menu className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold">{id ? 'Edit Blog Post' : 'Create New Blog Post'}</h1>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    <Users className="h-4 w-4 mr-2" />
                                    {user?.email}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Super Admin</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout}>
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Post Content</CardTitle>
                                    <CardDescription>
                                        Write and format your blog post content
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Post Title</Label>
                                        <Input
                                            id="title"
                                            value={formData.title}
                                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                                            placeholder="Enter post title"
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="slug">Slug (URL)</Label>
                                        <Input
                                            id="slug"
                                            value={formData.slug}
                                            onChange={(e) => setFormData({...formData, slug: e.target.value})}
                                            placeholder="auto-generated-from-title"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Leave blank to auto-generate from title.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="content">Content</Label>
                                        <MarkdownEditor
                                            value={formData.content}
                                            onChange={(value) => setFormData({...formData, content: value})}
                                            className="min-h-[500px]"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="excerpt">Excerpt</Label>
                                        <Textarea
                                            id="excerpt"
                                            value={formData.excerpt}
                                            onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                                            placeholder="Brief summary of the post..."
                                            rows={3}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Publishing</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="status">Status</Label>
                                        <Select 
                                            value={formData.status} 
                                            onValueChange={(value) => setFormData({...formData, status: value})}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="draft">Draft</SelectItem>
                                                <SelectItem value="published">Published</SelectItem>
                                                <SelectItem value="archived">Archived</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="tags">Tags</Label>
                                        <Input
                                            id="tags"
                                            value={formData.tags}
                                            onChange={(e) => setFormData({...formData, tags: e.target.value})}
                                            placeholder="news, update, feature"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Comma separated tags
                                        </p>
                                    </div>

                                    <Button 
                                        className="w-full bg-[#005391] hover:bg-[#004275]" 
                                        onClick={handleSubmit}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <>Saving...</>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                {id ? 'Update Post' : 'Publish Post'}
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Featured Image</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Post Image</Label>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            className="hidden" 
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                        />
                                        
                                        {!formData.image_url ? (
                                            <div 
                                                className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <ImageIcon className="h-8 w-8 text-slate-400 mb-2" />
                                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                    {isUploading ? "Uploading..." : "Click to upload image"}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    PNG, JPG, GIF up to 5MB
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="relative aspect-video rounded-md overflow-hidden border group">
                                                    <img 
                                                        src={formData.image_url} 
                                                        alt="Featured" 
                                                        className="object-cover w-full h-full"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <Button 
                                                            variant="secondary" 
                                                            size="sm"
                                                            onClick={() => fileInputRef.current?.click()}
                                                        >
                                                            <Upload className="h-4 w-4 mr-2" />
                                                            Change
                                                        </Button>
                                                        <Button 
                                                            variant="destructive" 
                                                            size="sm"
                                                            onClick={() => setFormData({...formData, image_url: ""})}
                                                        >
                                                            <X className="h-4 w-4 mr-2" />
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Input
                                                    value={formData.image_url}
                                                    readOnly
                                                    className="text-xs text-muted-foreground bg-muted"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>SEO Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="seo_title">Meta Title</Label>
                                        <Input
                                            id="seo_title"
                                            value={formData.seo_title}
                                            onChange={(e) => setFormData({...formData, seo_title: e.target.value})}
                                            placeholder="SEO Title"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="seo_description">Meta Description</Label>
                                        <Textarea
                                            id="seo_description"
                                            value={formData.seo_description}
                                            onChange={(e) => setFormData({...formData, seo_description: e.target.value})}
                                            placeholder="SEO Description"
                                            rows={3}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
