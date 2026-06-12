import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// GET /api/testimonials - Get all testimonials (with optional published filter)
router.get("/", async (req, res) => {
    try {
        const { published } = req.query;

        let query = supabase
            .from("testimonials")
            .select("*")
            .order("created_at", { ascending: false });

        if (published === "true") {
            query = query.eq("is_published", true);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error("Express Testimonials list error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
});

// GET /api/testimonials/:id - Fetch a single testimonial by ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: "ID is required" });
        }

        const { data, error } = await supabase
            .from("testimonials")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error("Express Testimonial fetch by ID error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
});

// POST /api/testimonials - Create a new testimonial
router.post("/", async (req, res) => {
    try {
        const body = req.body;

        if (!body.customer_name) {
            return res.status(400).json({ success: false, message: "Customer name is required" });
        }

        if (body.type === "text" && !body.content) {
            return res.status(400).json({ success: false, message: "Content is required for text testimonials" });
        }

        if (body.type === "screenshot" && !body.screenshot_url) {
            return res.status(400).json({ success: false, message: "Screenshot is required for screenshot testimonials" });
        }

        const { data, error } = await supabase
            .from("testimonials")
            .insert({
                customer_name: body.customer_name,
                customer_position: body.customer_position,
                content: body.content,
                image_url: body.image_url,
                type: body.type || "text",
                screenshot_url: body.screenshot_url,
                rating: body.rating || 5,
                is_published: body.is_published !== undefined ? body.is_published : true
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error("Express Testimonial create error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
});

// PUT /api/testimonials/:id - Update an existing testimonial
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "ID is required" });
        }

        const { data, error } = await supabase
            .from("testimonials")
            .update({
                customer_name: body.customer_name,
                customer_position: body.customer_position,
                content: body.content,
                image_url: body.image_url,
                type: body.type,
                screenshot_url: body.screenshot_url,
                rating: body.rating,
                is_published: body.is_published,
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error("Express Testimonial update error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
});

// DELETE /api/testimonials/:id - Delete a testimonial
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: "ID is required" });
        }

        const { error } = await supabase
            .from("testimonials")
            .delete()
            .eq("id", id);

        if (error) throw error;

        res.json({
            success: true,
            message: "Testimonial deleted successfully"
        });
    } catch (error: any) {
        console.error("Express Testimonial delete error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
});

export default router;
