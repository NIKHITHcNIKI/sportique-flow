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

const addHeaderToPage = async (doc: jsPDF, headerImg: string | null) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  if (headerImg) {
    const imgWidth = 160;
    const imgHeight = 40;
    const x = (pageWidth - imgWidth) / 2;
    doc.addImage(headerImg, "PNG", x, 8, imgWidth, imgHeight);
  } else {
    doc.setFontSize(16);
    doc.text("Seshadripuram College Tumakuru", pageWidth / 2, 20, { align: "center" });
  }
};

export const generatePDFReport = async ({ title, headers, rows, filename }: ReportOptions) => {
  const doc = new jsPDF({ orientation: "landscape" });
  let headerImg: string | null = null;

  try {
    headerImg = await loadHeaderImage();
  } catch {}

  await addHeaderToPage(doc, headerImg);

  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.text(title, pageWidth / 2, 56, { align: "center" });

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, pageWidth / 2, 62, { align: "center" });

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

type SectionOptions = {
  title: string;
  headers: string[];
  rows: string[][];
};

export const generateCombinedPDFReport = async (
  sections: SectionOptions[],
  filename: string
) => {
  const doc = new jsPDF({ orientation: "landscape" });
  let headerImg: string | null = null;

  try {
    headerImg = await loadHeaderImage();
  } catch {}

  const pageWidth = doc.internal.pageSize.getWidth();

  for (let i = 0; i < sections.length; i++) {
    if (i > 0) doc.addPage();

    await addHeaderToPage(doc, headerImg);

    doc.setFontSize(14);
    doc.text(sections[i].title, pageWidth / 2, 56, { align: "center" });

    doc.setFontSize(9);
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
      pageWidth / 2, 62, { align: "center" }
    );

    autoTable(doc, {
      startY: 68,
      head: [sections[i].headers],
      body: sections[i].rows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [75, 0, 130], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      margin: { left: 10, right: 10 },
    });
  }

  doc.save(filename);
};
