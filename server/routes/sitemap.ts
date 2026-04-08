import { Router } from 'express';
import { query } from '../lib/db.js';

const router = Router();

router.get('/robots.txt', (req, res) => {
  const rawBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VITE_SITE_URL || (req.protocol + '://' + req.get('host'));
  const baseUrl = rawBaseUrl.replace(/\/$/, '');
  
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.header('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

router.get('/sitemap.xml', async (req, res) => {
  try {
    const rawBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VITE_SITE_URL || (req.protocol + '://' + req.get('host'));
    const baseUrl = rawBaseUrl.replace(/\/$/, '');
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;

    // Fetch published blog posts to add to sitemap
    try {
      const blogsResult = await query("SELECT slug, updated_at FROM blogs WHERE status = 'published'");
      blogsResult.rows.forEach((blog: any) => {
        sitemap += `  <url>
    <loc>${baseUrl}/blog/${blog.slug}</loc>
    <lastmod>${new Date(blog.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
      });
    } catch (e) {
      console.error("Failed to fetch blogs for sitemap:", e);
    }

    sitemap += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).end();
  }
});

export default router;