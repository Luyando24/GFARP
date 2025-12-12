import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Tag, Share2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import ReactMarkdown from 'react-markdown'; // Assuming installed or I'll use simple whitespace pre-wrap if not. 
// Since I cannot install packages, I will use a simple renderer for now or dangerouslySetInnerHTML if safe content is assumed (Admin created).

interface BlogPost {
    id: string;
    title: string;
    slug: string;
    content: string;
    image_url: string;
    author_name: string;
    published_at: string;
    tags: string[];
    seo_title: string;
    seo_description: string;
}

export default function BlogDetails() {
    const { t, dir } = useTranslation();
    const { slug } = useParams();
    const [blog, setBlog] = useState<BlogPost | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBlog = async () => {
            try {
                const response = await fetch(`/api/blogs/slug/${slug}`);
                const result = await response.json();
                if (result.success) {
                    setBlog(result.data);
                    // Update SEO Meta tags dynamically
                    document.title = `${result.data.seo_title || result.data.title} | Soccer Circular Blog`;
                    const metaDesc = document.querySelector('meta[name="description"]');
                    if (metaDesc) {
                        metaDesc.setAttribute('content', result.data.seo_description || result.data.excerpt);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch blog:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (slug) fetchBlog();
    }, [slug]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005391]"></div>
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-center px-4" dir={dir}>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">{t('blog.notFound.title')}</h1>
                <p className="text-slate-600 dark:text-slate-400 mb-8">{t('blog.notFound.desc')}</p>
                <Link to="/blog">
                    <Button>{t('blog.back')}</Button>
                </Link>
            </div>
        );
    }

    // Estimate read time
    const wordsPerMinute = 200;
    const wordCount = blog.content.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / wordsPerMinute);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900" dir={dir}>
            {/* Hero Section */}
            <div className="relative h-[60vh] min-h-[400px] w-full bg-slate-900">
                {blog.image_url && (
                    <div className="absolute inset-0">
                        <img 
                            src={blog.image_url} 
                            alt={blog.title} 
                            className="w-full h-full object-cover opacity-60"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                    </div>
                )}
                
                <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-12 max-w-5xl mx-auto">
                    <div className="pt-20">
                        <Link to="/blog">
                            <Button variant="outline" className="text-white border-white hover:bg-white/20 hover:text-white bg-transparent backdrop-blur-sm">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t('blog.back')}
                            </Button>
                        </Link>
                    </div>
                    <div className="pb-8">
                        <div className="flex flex-wrap gap-2 mb-6">
                            {blog.tags && blog.tags.map(tag => (
                                <Badge key={tag} className="bg-[#005391] hover:bg-[#004275] text-white border-0">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                            {blog.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-6 text-slate-300">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                                    {blog.author_name.charAt(0)}
                                </div>
                                <span className="font-medium text-white">{blog.author_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(blog.published_at), 'MMMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{readTime} {t('blog.readTime')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <article className="max-w-3xl mx-auto px-4 py-12 md:py-20">
                <div className="prose prose-lg dark:prose-invert max-w-none">
                    {/* 
                       For simplicity/safety in this environment without extra libs, 
                       we just render as paragraphs. In a real app, use ReactMarkdown or similar.
                    */}
                    {blog.content.split('\n').map((paragraph, idx) => (
                        paragraph.trim() ? <p key={idx} className="mb-4">{paragraph}</p> : <br key={idx} />
                    ))}
                </div>

                {/* Share / Tags Footer */}
                <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-slate-500" />
                            <span className="text-sm text-slate-500">{t('blog.tags')}</span>
                            <div className="flex gap-2">
                                {blog.tags && blog.tags.map(tag => (
                                    <span key={tag} className="text-sm text-[#005391] font-medium hover:underline cursor-pointer">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <Button variant="outline" onClick={() => {
                            navigator.share({
                                title: blog.title,
                                url: window.location.href
                            }).catch(() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert(t('blog.linkCopied'));
                            });
                        }}>
                            <Share2 className="mr-2 h-4 w-4" />
                            {t('blog.share')}
                        </Button>
                    </div>
                </div>
            </article>
        </div>
    );
}
