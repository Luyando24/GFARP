import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    Eye, 
    MoreHorizontal, 
    FileText, 
    CheckCircle, 
    Clock, 
    Calendar,
    Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface BlogPost {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    status: 'draft' | 'published' | 'archived';
    author_name: string;
    published_at: string | null;
    created_at: string;
    image_url: string;
    seo_title: string;
    seo_description: string;
    tags: string[];
}

export default function BlogManagement() {
    const { toast } = useToast();
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [currentBlog, setCurrentBlog] = useState<BlogPost | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        status: "draft",
        image_url: "",
        seo_title: "",
        seo_description: "",
        tags: "" // Comma separated for input
    });

    const fetchBlogs = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/blogs?limit=50');
            const result = await response.json();
            if (result.success) {
                setBlogs(result.data);
            }
        } catch (error) {
            console.error("Failed to fetch blogs:", error);
            toast({
                title: "Error",
                description: "Failed to fetch blog posts",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBlogs();
    }, []);

    const handleCreate = () => {
        setFormData({
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
        setIsCreateDialogOpen(true);
    };

    const handleEdit = (blog: BlogPost) => {
        setCurrentBlog(blog);
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
        setIsEditDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this post?")) return;

        try {
            const response = await fetch(`/api/blogs/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('football-auth-token')}`
                }
            });
            
            if (response.ok) {
                toast({ title: "Success", description: "Blog post deleted" });
                fetchBlogs();
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
        }
    };

    const handleSubmit = async (isEdit: boolean) => {
        setIsSaving(true);
        try {
            const url = isEdit && currentBlog ? `/api/blogs/${currentBlog.id}` : '/api/blogs';
            const method = isEdit ? 'PUT' : 'POST';
            
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
                    description: `Blog post ${isEdit ? 'updated' : 'created'} successfully` 
                });
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                fetchBlogs();
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

    const filteredBlogs = blogs.filter(blog => 
        blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Blog Management</h2>
                    <p className="text-slate-600 dark:text-slate-400">Manage your articles and news updates</p>
                </div>
                <Button onClick={handleCreate} className="bg-[#005391] hover:bg-[#004275]">
                    <Plus className="mr-2 h-4 w-4" /> Create Post
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>All Posts</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search posts..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Published Date</TableHead>
                                <TableHead>Author</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : filteredBlogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No blog posts found</TableCell>
                                </TableRow>
                            ) : (
                                filteredBlogs.map((blog) => (
                                    <TableRow key={blog.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{blog.title}</span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{blog.slug}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={blog.status === 'published' ? 'default' : 'secondary'} className={blog.status === 'published' ? 'bg-green-500' : ''}>
                                                {blog.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {blog.published_at ? format(new Date(blog.published_at), 'MMM d, yyyy') : '-'}
                                        </TableCell>
                                        <TableCell>{blog.author_name}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(blog)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(blog.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditDialogOpen ? 'Edit Post' : 'Create New Post'}</DialogTitle>
                        <DialogDescription>
                            Fill in the details for your blog post.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
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
                            </div>
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
                                <Label htmlFor="image_url">Featured Image URL</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        id="image_url" 
                                        value={formData.image_url} 
                                        onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                                        placeholder="https://..."
                                    />
                                    {formData.image_url && (
                                        <Button variant="outline" size="icon" onClick={() => window.open(formData.image_url, '_blank')}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="excerpt">Excerpt (Short Summary)</Label>
                                <Textarea 
                                    id="excerpt" 
                                    value={formData.excerpt} 
                                    onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="content">Content (Markdown/HTML)</Label>
                                <Textarea 
                                    id="content" 
                                    value={formData.content} 
                                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                                    className="min-h-[300px] font-mono text-sm"
                                    placeholder="# Heading..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-2">
                        <h4 className="font-medium mb-4 flex items-center gap-2">
                            <Search className="h-4 w-4" /> SEO Settings
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="seo_title">SEO Title</Label>
                                <Input 
                                    id="seo_title" 
                                    value={formData.seo_title} 
                                    onChange={(e) => setFormData({...formData, seo_title: e.target.value})}
                                    placeholder="Title for search engines"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tags">Tags (comma separated)</Label>
                                <Input 
                                    id="tags" 
                                    value={formData.tags} 
                                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                                    placeholder="football, academy, training"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="seo_description">Meta Description</Label>
                                <Textarea 
                                    id="seo_description" 
                                    value={formData.seo_description} 
                                    onChange={(e) => setFormData({...formData, seo_description: e.target.value})}
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); setIsEditDialogOpen(false); }}>Cancel</Button>
                        <Button onClick={() => handleSubmit(isEditDialogOpen)} disabled={isSaving} className="bg-[#005391]">
                            {isSaving ? 'Saving...' : (isEditDialogOpen ? 'Update Post' : 'Create Post')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
