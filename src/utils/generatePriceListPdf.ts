import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { School } from "@/services/schools";
import { Product } from "@/hooks/useProducts";
import { ProductCategory } from "@/hooks/useProductCategories";
import { PRICE_TYPE } from "@/constants/priceTypes";
import { getCurrencySymbol } from "@/lib/currency";

interface PdfProduct extends Product {
  categoryName?: string;
  disciplineName?: string;
}

/**
 * Loads an image from URL and converts it to base64
 */
const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Image load timeout"));
    }, 10000); // 10 second timeout

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL("image/png");
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
};

/**
 * Formats price type for display
 */
const formatPriceType = (priceType?: string): string => {
  if (!priceType) return "";

  switch (priceType) {
    case PRICE_TYPE.PER_PERSON:
      return "Per Person";
    case PRICE_TYPE.PER_COUPLE:
      return "Per Couple";
    case PRICE_TYPE.FIXED:
      return "Fixed";
    default:
      return priceType;
  }
};

/**
 * Formats price with currency symbol
 */
const formatPrice = (price: number, currencyCode: string = "EUR"): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol} ${price.toFixed(2)}`;
};

/**
 * Generates a PDF price list for the school
 */
export const generatePriceListPdf = async (
  school: School,
  products: Product[],
  categories: ProductCategory[],
): Promise<void> => {
  try {
    // Filter only active products
    const activeProducts = products.filter((p) => p.active || p.is_active);

    if (activeProducts.length === 0) {
      throw new Error("No active products available");
    }

    // Brand Colors
    const BRAND_PRIMARY: [number, number, number] = [236, 72, 153]; // Pink-500
    const TABLE_HEADER_BG: [number, number, number] = [236, 72, 153];
    const TABLE_HEADER_TEXT: [number, number, number] = [255, 255, 255];
    const TEXT_PRIMARY: [number, number, number] = [31, 41, 55]; // Gray-800
    const TEXT_SECONDARY: [number, number, number] = [75, 85, 99]; // Gray-600
    const TEXT_LIGHT: [number, number, number] = [156, 163, 175]; // Gray-400

    // Create PDF document (A4 size)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // --- Header Section ---

    // Top Accent Bar
    doc.setFillColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.rect(0, 0, pageWidth, 2, "F");

    yPosition += 10;

    // Load and add logo if available
    let logoHeightUsed = 0;
    if (school.logo) {
      try {
        const logoBase64 = await loadImageAsBase64(school.logo);
        const tempImg = new Image();

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Temp image load timeout")),
            5000,
          );
          tempImg.onload = () => {
            clearTimeout(timeout);
            resolve();
          };
          tempImg.onerror = () => {
            clearTimeout(timeout);
            reject(
              new Error(
                `Failed to load temp image: ${logoBase64.substring(0, 30)}...`,
              ),
            );
          };
          tempImg.src = logoBase64;
        });

        const aspectRatio = tempImg.width / tempImg.height;
        const targetHeight = 15; // 15mm max height for logo
        const targetWidth = targetHeight * aspectRatio;

        // Ensure it doesn't exceed half page width
        const maxWidth = (pageWidth - margin * 2) / 2;
        const finalWidth = Math.min(targetWidth, maxWidth);
        const finalHeight = finalWidth / aspectRatio;

        doc.addImage(
          logoBase64,
          "PNG",
          margin,
          yPosition,
          finalWidth,
          finalHeight,
        );
        logoHeightUsed = finalHeight;
      } catch (err) {
        console.warn("Logo load failed", err);
      }
    }

    // School Details (Right aligned if logo exists, or centered/left)
    // For a cleaner look, let's stack them gracefully if logo exists

    if (logoHeightUsed > 0) {
      // If logo is present, align text to the right or below?
      // Let's keep it simple: Logo Left, Text Right essentially, or Logo Top Left, Text Top Right.

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
      doc.text(school.name, pageWidth - margin, yPosition + 6, {
        align: "right",
      });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);

      let contactY = yPosition + 12;
      const contactInfo = [school.email, school.phone, school.website].filter(
        Boolean,
      );

      contactInfo.forEach((info) => {
        if (info) {
          doc.text(info as string, pageWidth - margin, contactY, {
            align: "right",
          });
          contactY += 4.5;
        }
      });

      yPosition = Math.max(yPosition + logoHeightUsed + 10, contactY + 5);
    } else {
      // No logo, center everything
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
      doc.text(school.name, pageWidth / 2, yPosition + 5, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);

      let contactY = yPosition + 14;
      if (school.email) {
        doc.text(school.email, pageWidth / 2, contactY, { align: "center" });
        contactY += 5;
      }
      if (school.phone) {
        doc.text(school.phone, pageWidth / 2, contactY, { align: "center" });
        contactY += 5;
      }

      yPosition = contactY + 5;
    }

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.text("PRICE LIST", margin, yPosition);

    // Date on the right
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2]);
    // doc.text(
    //   `Valid from ${new Intl.DateTimeFormat('en-GB').format(new Date())}`,
    //   pageWidth - margin,
    //   yPosition,
    //   { align: 'right' }
    // );

    yPosition += 2;
    doc.setDrawColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
    yPosition += 10;

    // --- Content Preparation ---

    // Group products by category
    const productsByCategory = new Map<string, PdfProduct[]>();
    categories.forEach((cat) => productsByCategory.set(cat.id, []));

    activeProducts.forEach((product) => {
      const categoryId = product.category_id;
      if (productsByCategory.has(categoryId)) {
        const enriched: PdfProduct = {
          ...product,
          categoryName:
            product.product_categories?.name ||
            categories.find((c) => c.id === categoryId)?.name ||
            "Other",
          disciplineName: product.disciplines?.display_name || "",
        };
        productsByCategory.get(categoryId)!.push(enriched);
      } else {
        console.warn(
          `Product "${product.title}" has invalid category_id: ${categoryId}`,
        );
      }
    });

    const sortedCategories = categories
      .filter((c) => (productsByCategory.get(c.id)?.length || 0) > 0)
      .sort((a, b) => (a.order_position || 0) - (b.order_position || 0)); // Assuming order_position exists or fallback to name

    const tableBody: any[] = [];

    sortedCategories.forEach((category) => {
      const catProducts = productsByCategory.get(category.id)!;

      // Add Category Header Row
      tableBody.push([
        {
          content: category.name.toUpperCase(),
          colSpan: 5,
          styles: {
            fillColor: [243, 244, 246] as [number, number, number],
            textColor: BRAND_PRIMARY,
            fontStyle: "bold",
            halign: "left",
          },
        },
      ]);

      // Sort products
      catProducts.sort(
        (a, b) => (a.order_position || 0) - (b.order_position || 0),
      );

      catProducts.forEach((p) => {
        tableBody.push([
          p.title,
          p.duration_hours ? `${p.duration_hours}h` : "-",
          p.max_participants > 1 ? `${p.max_participants} pax` : "Private",
          formatPriceType(p.price_type),
          {
            content: formatPrice(p.price, (school as any).defaultCurrency || "EUR"),
            styles: { fontStyle: "bold", halign: "right" },
          },
        ]);
      });
    });

    // --- Table Generation ---
    autoTable(doc, {
      startY: yPosition,
      head: [
        ["Product / Service", "Duration", "Participants", "Type", "Price"],
      ],
      body: tableBody,
      theme: "plain",
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineColor: [229, 231, 235],
        lineWidth: 0.1,
        valign: "middle",
      },
      headStyles: {
        fillColor: TABLE_HEADER_BG,
        textColor: TABLE_HEADER_TEXT,
        fontSize: 9,
        fontStyle: "bold",
        halign: "left",
      },
      columnStyles: {
        0: { cellWidth: "auto" }, // Product
        1: { cellWidth: 25, halign: "center" }, // Duration
        2: { cellWidth: 30, halign: "center" }, // Pax
        3: { cellWidth: 30, halign: "left" }, // Type
        4: { cellWidth: 25, halign: "right" }, // Price
      },
      margin: { left: margin, right: margin, bottom: 20 },
      didDrawPage: () => {
        // Footer
        const pageNum = doc.getCurrentPageInfo().pageNumber;

        doc.setFontSize(8);
        doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2]);
        const footerText = `${school.name} - Price List`;
        doc.text(footerText, margin, pageHeight - 10);

        doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 10, {
          align: "right",
        });
      },
    });

    // Save
    const filename = `${school.name
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}-pricelist.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};
