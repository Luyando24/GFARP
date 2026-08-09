import jsPDF from "jspdf";

export interface PDFPlayerData {
  displayName: string;
  position?: string;
  secondaryPosition?: string;
  age?: string | number;
  dateOfBirth?: string;
  nationality?: string;
  currentClub?: string;
  height?: string | number;
  weight?: string | number;
  preferredFoot?: string;
  contactEmail?: string;
  whatsappNumber?: string;
  phone?: string;
  location?: string;
  bio?: string;
  careerHistory?: string;
  honours?: string;
  education?: string;
  transfermarktLink?: string;
  videoLinks?: string[];
  galleryImages?: string[];
  profileImageUrl?: string;
  profileSlug?: string;
}

const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error("Empty image URL"));
    if (url.startsWith('data:image')) {
      return resolve(url);
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    const cacheBuster = (url.includes('?') ? '&' : '?') + 'pdf_cb=' + Date.now();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        try {
          const dataURL = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataURL);
        } catch (e) {
          reject(e);
        }
      } else {
        reject(new Error("Canvas context failed"));
      }
    };
    img.onerror = (e) => reject(e);
    img.src = url.startsWith('http') ? url + cacheBuster : url;
  });
};

export async function generatePlayerPDF(data: PDFPlayerData): Promise<void> {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;   // 210 mm
  const pageHeight = doc.internal.pageSize.height; // 297 mm
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);  // 180 mm

  let y = 0;

  // --- HEADER BANNER ---
  // Dark Slate Header Box [15, 23, 42]
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 46, 'F');

  // Emerald Top Stripe [16, 185, 129]
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Brand Name & Tagline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // Emerald text
  doc.text("SOCCER CIRCULAR", margin, 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text("OFFICIAL SCOUTING REPORT", margin, 19);

  // Player Name (Large, crisp white)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  const nameText = data.displayName || "Player Profile";
  const nameTruncated = nameText.length > 25 ? nameText.substring(0, 24) + "..." : nameText;
  doc.text(nameTruncated, margin, 30);

  // Position Badges
  if (data.position) {
    const posText = data.position.toUpperCase() + (data.secondaryPosition ? ` / ${data.secondaryPosition.toUpperCase()}` : '');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(16, 185, 129);
    doc.text(posText, margin, 38);
  }

  // Profile Image in Header (Right aligned)
  if (data.profileImageUrl) {
    try {
      const base64Img = await getBase64ImageFromURL(data.profileImageUrl);
      const imgSize = 34;
      const imgX = pageWidth - margin - imgSize;
      const imgY = 7;

      // Draw white border around image
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(imgX - 1, imgY - 1, imgSize + 2, imgSize + 2, 2, 2, 'F');
      doc.addImage(base64Img, 'JPEG', imgX, imgY, imgSize, imgSize);
    } catch (e) {
      console.warn("Could not load profile image for PDF header", e);
    }
  }

  y = 53;

  // --- STATS HIGHLIGHT METRICS GRID (4 Boxes) ---
  const boxCount = 4;
  const boxGap = 4;
  const boxW = (contentWidth - (boxGap * (boxCount - 1))) / boxCount;
  const boxH = 17;

  const metrics = [
    { label: "AGE", value: data.age ? `${data.age} Yrs` : (data.dateOfBirth ? data.dateOfBirth : "N/A") },
    { label: "HEIGHT", value: data.height ? `${data.height} cm` : "-" },
    { label: "WEIGHT", value: data.weight ? `${data.weight} kg` : "-" },
    { label: "PREFERRED FOOT", value: data.preferredFoot ? data.preferredFoot : "-" },
  ];

  metrics.forEach((m, idx) => {
    const bX = margin + idx * (boxW + boxGap);
    // Box background
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.roundedRect(bX, y, boxW, boxH, 2, 2, 'FD');

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(m.label, bX + boxW / 2, y + 5.5, { align: 'center' });

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(String(m.value), bX + boxW / 2, y + 13, { align: 'center' });
  });

  y += boxH + 6;

  // --- PRIMARY PROFILE DETAILS TABLE ---
  const infoItems = [
    { label: "Nationality", value: data.nationality },
    { label: "Current Club", value: data.currentClub },
    { label: "Primary Position", value: data.position },
    { label: "Secondary Position", value: data.secondaryPosition },
  ].filter(i => i.value);

  if (infoItems.length > 0) {
    const rowCount = Math.ceil(infoItems.length / 2);
    const tableH = rowCount * 10 + 4;
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.roundedRect(margin, y, contentWidth, tableH, 2, 2, 'F');

    let itemY = y + 7;
    infoItems.forEach((item, idx) => {
      const isCol2 = idx % 2 === 1;
      const itemX = isCol2 ? margin + contentWidth / 2 + 5 : margin + 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`${item.label.toUpperCase()}:`, itemX, itemY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(String(item.value), itemX + 38, itemY);

      if (isCol2 || idx === infoItems.length - 1) {
        itemY += 10;
      }
    });

    y += tableH + 6;
  }

  // --- CONTACT & REPRESENTATION CARD ---
  if (data.contactEmail || data.whatsappNumber || data.phone) {
    doc.setFillColor(236, 253, 245); // Emerald-50
    doc.setDrawColor(167, 243, 208); // Emerald-200
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(4, 120, 87); // Emerald-700
    doc.text("REPRESENTATION & CONTACT DETAILS", margin + 6, y + 5.5);

    let contactStr = "";
    if (data.contactEmail) contactStr += `Email: ${data.contactEmail}   `;
    if (data.whatsappNumber) contactStr += `WhatsApp: ${data.whatsappNumber}   `;
    if (data.phone && !data.whatsappNumber) contactStr += `Phone: ${data.phone}`;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(contactStr.trim(), margin + 6, y + 12);

    y += 22;
  }

  // Helper for adding styled sections
  const addSection = (title: string, text: string | undefined | null) => {
    if (!text || !text.trim()) return;

    const splitText = doc.splitTextToSize(text.trim(), contentWidth - 6);
    const requiredHeight = 10 + (splitText.length * 4.5) + 6;

    if (y + requiredHeight > pageHeight - 25) {
      doc.addPage();
      y = 20;
    }

    // Section Accent Header
    doc.setFillColor(16, 185, 129); // Emerald accent bar
    doc.rect(margin, y, 3, 6, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), margin + 6, y + 5);

    y += 9;

    // Text content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85); // Slate-700
    doc.text(splitText, margin + 4, y);

    y += (splitText.length * 4.5) + 6;
  };

  addSection("Professional Bio", data.bio);
  addSection("Career History", data.careerHistory);
  addSection("Honours & Achievements", data.honours);
  addSection("Education & Qualifications", data.education);

  // --- LINKS & MEDIA REELS ---
  const hasLinks = data.transfermarktLink || (data.videoLinks && data.videoLinks.some(l => l)) || data.profileSlug;
  if (hasLinks) {
    if (y + 30 > pageHeight - 25) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(16, 185, 129);
    doc.rect(margin, y, 3, 6, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("LINKS & MEDIA REELS", margin + 6, y + 5);

    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235); // Blue link text

    if (data.profileSlug) {
      const publicUrl = `https://www.soccercircular.com/player/${data.profileSlug}`;
      doc.textWithLink(`Official Profile: ${publicUrl}`, margin + 4, y, { url: publicUrl });
      y += 6;
    } else {
      doc.textWithLink(`Official Portal: https://www.soccercircular.com`, margin + 4, y, { url: 'https://www.soccercircular.com' });
      y += 6;
    }

    if (data.transfermarktLink) {
      doc.textWithLink(`Transfermarkt Profile: ${data.transfermarktLink}`, margin + 4, y, { url: data.transfermarktLink });
      y += 6;
    }

    if (data.videoLinks) {
      data.videoLinks.forEach((link, idx) => {
        if (link && link.trim()) {
          doc.textWithLink(`Video Highlight Reel #${idx + 1}: ${link}`, margin + 4, y, { url: link });
          y += 6;
        }
      });
    }

    y += 6;
  }

  // --- PHOTO GALLERY ---
  if (data.galleryImages && data.galleryImages.some(img => img)) {
    const validImages = data.galleryImages.filter(img => img && img.trim());
    if (validImages.length > 0) {
      doc.addPage();
      y = 20;

      doc.setFillColor(16, 185, 129);
      doc.rect(margin, y, 3, 6, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("PHOTO GALLERY", margin + 6, y + 5);

      y += 12;

      const gap = 8;
      const imgW = (contentWidth - gap) / 2;
      const imgH = imgW * 0.75; // 4:3 aspect ratio

      let xPos = margin;

      for (let i = 0; i < validImages.length; i++) {
        const imgUrl = validImages[i];
        try {
          if (y + imgH > pageHeight - 25) {
            doc.addPage();
            y = 20;
            xPos = margin;
          }

          const base64 = await getBase64ImageFromURL(imgUrl);
          doc.setDrawColor(226, 232, 240);
          doc.rect(xPos - 1, y - 1, imgW + 2, imgH + 2, 'S');
          doc.addImage(base64, 'JPEG', xPos, y, imgW, imgH);

          if (xPos === margin) {
            xPos += imgW + gap;
          } else {
            xPos = margin;
            y += imgH + gap + 4;
          }
        } catch (e) {
          console.warn("Failed to embed gallery image into PDF:", e);
        }
      }
    }
  }

  // --- FOOTER ON EVERY PAGE (MANDATORY REQUIREMENT) ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    const footerY = pageHeight - 9;

    // Thin divider line
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    // Left: Brand Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("SOCCER CIRCULAR", margin, footerY);

    // Center: https://www.soccercircular.com (Clickable link)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(16, 185, 129); // Emerald link
    doc.textWithLink("https://www.soccercircular.com", pageWidth / 2, footerY, {
      url: "https://www.soccercircular.com",
      align: "center",
    });

    // Right: Page Numbers
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
  }

  const filename = `${(data.displayName || 'Player').replace(/\s+/g, '_')}_Soccer_Circular_Report.pdf`;
  doc.save(filename);
}
