import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// GET /api/blogs - Get all blogs (paginated, with optional status filter)
router.get("/", async (req, res) => {
    try {
        const { status, limit = 10, page = 1 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        let query = supabase
            .from("blogs")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + Number(limit) - 1);

        if (status) {
            query = query.eq("status", status);
        }

        const { data, count, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data,
            pagination: {
                total: count,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil((count || 0) / Number(limit))
            }
        });
    } catch (error: any) {
        console.error("Express Blog list error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
});

// GET /api/blogs/slug/:slug - Fetch blog by slug (published only)
router.get("/slug/:slug", async (req, res) => {
    try {
        const { slug } = req.params;

        if (!slug) {
            return res.status(400).json({ success: false, message: "Slug is required" });
        }

        const { data, error } = await supabase
            .from("blogs")
            .select("*")
            .eq("slug", slug)
            .eq("status", "published")
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, message: "Blog post not found" });
        }

        res.json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error("Express Blog fetch by slug error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
});

// GET /api/blogs/:id - Fetch blog by ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: "ID is required" });
        }

        const { data, error } = await supabase
            .from("blogs")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return res.status(404).json({
                    success: false,
                    message: "Blog post not found"
                });
            }
            throw error;
        }

        res.json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error("Express Blog fetch by ID error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
});

// POST /api/blogs - Create a new blog post
router.post("/", async (req, res) => {
    try {
        const body = req.body;

        if (!body.title || !body.content) {
            return res.status(400).json({ success: false, message: "Title and Content are required" });
        }

        // Auto-generate slug if not provided or clean the provided one
        let slug = body.slug
            ? body.slug.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-")
            : body.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-");
        slug = slug.replace(/(^-|-$)+/g, "");

        // Ensure slug is unique
        slug = await getUniqueSlug(supabase, slug);

        const { data, error } = await supabase
            .from("blogs")
            .insert({
                title: body.title,
                slug,
                content: body.content,
                excerpt: body.excerpt,
                image_url: body.image_url,
                author_name: body.author_name || "Soccer Circular Team",
                status: body.status || "draft",
                published_at: body.status === "published" ? new Date().toISOString() : null,
                seo_title: body.seo_title || body.title,
                seo_description: body.seo_description || body.excerpt,
                tags: body.tags || []
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return res.status(400).json({ success: false, message: "A blog post with this slug already exists." });
            }
            throw error;
        }

        res.status(201).json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error("Express Blog create error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
});

// PUT /api/blogs/:id - Update an existing blog post
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "ID is required" });
        }

        const updates: any = {
            updated_at: new Date().toISOString()
        };

        if (body.title) updates.title = body.title;
        if (body.content) updates.content = body.content;
        if (body.excerpt !== undefined) updates.excerpt = body.excerpt;
        if (body.slug) {
            let cleanSlug = body.slug.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/(^-|-$)+/g, "");
            updates.slug = await getUniqueSlug(supabase, cleanSlug, id);
        }
        if (body.image_url !== undefined) updates.image_url = body.image_url;
        if (body.author_name) updates.author_name = body.author_name;
        if (body.seo_title) updates.seo_title = body.seo_title;
        if (body.seo_description) updates.seo_description = body.seo_description;
        if (body.tags) updates.tags = body.tags;

        if (body.status) {
            updates.status = body.status;
            if (body.status === "published") {
                if (!body.published_at) {
                    const { data: current } = await supabase.from("blogs").select("published_at").eq("id", id).single();
                    if (!current?.published_at) {
                        updates.published_at = new Date().toISOString();
                    }
                }
            }
        }

        const { data, error } = await supabase
            .from("blogs")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error("Express Blog update error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
});

// DELETE /api/blogs/:id - Delete a blog post
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: "ID is required" });
        }

        const { error } = await supabase
            .from("blogs")
            .delete()
            .eq("id", id);

        if (error) throw error;

        res.json({
            success: true,
            message: "Blog post deleted"
        });
    } catch (error: any) {
        console.error("Express Blog delete error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
});

async function getUniqueSlug(supabase: any, baseSlug: string, excludeId?: string): Promise<string> {
    let query = supabase
        .from("blogs")
        .select("id, slug")
        .eq("slug", baseSlug);
    
    if (excludeId) {
        query = query.neq("id", excludeId);
    }
    
    const { data: exactMatch, error: exactError } = await query;
    if (exactError) throw exactError;
    
    if (!exactMatch || exactMatch.length === 0) {
        return baseSlug;
    }
    
    let suffixQuery = supabase
        .from("blogs")
        .select("id, slug")
        .like("slug", `${baseSlug}-%`);
        
    if (excludeId) {
        suffixQuery = suffixQuery.neq("id", excludeId);
    }
    
    const { data: matches, error: suffixError } = await suffixQuery;
    if (suffixError) throw suffixError;
    
    if (!matches || matches.length === 0) {
        return `${baseSlug}-1`;
    }
    
    const suffixes = matches
        .map((m: any) => {
            const parts = m.slug.split("-");
            const lastPart = parts[parts.length - 1];
            const num = parseInt(lastPart, 10);
            return isNaN(num) ? 0 : num;
        })
        .filter((num: number) => num > 0);
        
    const maxSuffix = suffixes.length > 0 ? Math.max(...suffixes) : 0;
    return `${baseSlug}-${maxSuffix + 1}`;
}

export default router;
