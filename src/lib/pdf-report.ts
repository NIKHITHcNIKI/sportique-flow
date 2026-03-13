import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ReportOptions = {
  title: string;
  headers: string[];
  rows: string[][];
  filename: string;
};

const loadHeaderImage = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = "/college-header.png";
  });
};

export const generatePDFReport = async ({ title, headers, rows, filename }: ReportOptions) => {
  const doc = new jsPDF({ orientation: "landscape" });

  try {
    const headerImg = await loadHeaderImage();
    // Center the header image
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgWidth = 160;
    const imgHeight = 40;
    const x = (pageWidth - imgWidth) / 2;
    doc.addImage(headerImg, "PNG", x, 8, imgWidth, imgHeight);
  } catch {
    // If image fails, just add text header
    doc.setFontSize(16);
    doc.text("Seshadripuram College Tumakuru", doc.internal.pageSize.getWidth() / 2, 20, { align: "center" });
  }

  // Report title
  doc.setFontSize(14);
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 56, { align: "center" });

  // Date
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, doc.internal.pageSize.getWidth() / 2, 62, { align: "center" });

  // Table
  autoTable(doc, {
    startY: 68,
    head: [headers],
    body: rows,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [75, 0, 130], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    margin: { left: 10, right: 10 },
  });

  doc.save(filename);
};
