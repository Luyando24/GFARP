import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface BlogPost {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    image_url: string;
    author_name: string;
    published_at: string;
    tags: string[];
}

export default function BlogList() {
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                const response = await fetch('/api/blogs?status=published&limit=20');
                const result = await response.json();
                if (result.success) {
                    setBlogs(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch blogs:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBlogs();
    }, []);

    const filteredBlogs = blogs.filter(blog => 
        blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (blog.tags && blog.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-12 text-center">
                    <Link to="/">
                        <Button variant="ghost" className="mb-6 absolute left-4 top-4 md:static md:mb-6">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Button>
                    </Link>
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
                        Soccer Circular Blog
                    </h1>
                    <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Latest news, updates, and insights from the world of football academy management.
                    </p>
                </div>

                {/* Search */}
                <div className="max-w-md mx-auto mb-12 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                    <Input
                        placeholder="Search articles..."
                        className="pl-10 py-6 rounded-full shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredBlogs.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500 text-lg">No articles found matching your search.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredBlogs.map((blog) => (
                            <Card key={blog.id} className="overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col h-full border-0 bg-white dark:bg-slate-800">
                                <div className="aspect-video w-full overflow-hidden bg-slate-100 relative">
                                    {blog.image_url ? (
                                        <img 
                                            src={blog.image_url} 
                                            alt={blog.title} 
                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                                            <span className="text-white text-4xl font-bold opacity-20">SC</span>
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4 flex gap-2">
                                        {blog.tags && blog.tags.slice(0, 2).map(tag => (
                                            <Badge key={tag} className="bg-white/90 text-slate-900 hover:bg-white">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <CardHeader>
                                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-2">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(blog.published_at), 'MMM d, yyyy')}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            {blog.author_name}
                                        </span>
                                    </div>
                                    <CardTitle className="line-clamp-2 hover:text-[#005391] transition-colors">
                                        <Link to={`/blog/${blog.slug}`}>
                                            {blog.title}
                                        </Link>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-slate-600 dark:text-slate-300 line-clamp-3">
                                        {blog.excerpt}
                                    </p>
                                </CardContent>
                                <CardFooter className="border-t border-slate-100 dark:border-slate-700 pt-4">
                                    <Button variant="ghost" className="w-full group text-[#005391] hover:text-[#004275]" asChild>
                                        <Link to={`/blog/${blog.slug}`}>
                                            Read Article 
                                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
