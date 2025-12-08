import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, 
    Search, 
    Edit, 
    Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
    const navigate = useNavigate();
    const { toast } = useToast();
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

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
        navigate('/admin/blog/new');
    };

    const handleEdit = (blog: BlogPost) => {
        navigate(`/admin/blog/edit/${blog.id}`);
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
        </div>
    );
}
