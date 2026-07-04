import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export type ExportFormat = 'image' | 'pdf';

export async function exportReport(element: HTMLElement, format: ExportFormat, filename?: string): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#0f0e17',
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight
  });

  const safeFilename = (filename || '买不买分析报告').replace(/[\\/:*?"<>|]/g, '_');

  if (format === 'image') {
    const link = document.createElement('a');
    link.download = `${safeFilename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    return;
  }

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const maxWidth = pageWidth - margin * 2;

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(maxWidth / imgWidth, pageHeight / imgHeight);
  const scaledWidth = imgWidth * ratio;
  const scaledHeight = imgHeight * ratio;

  let heightLeft = scaledHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', margin, margin, scaledWidth, scaledHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    position = heightLeft - scaledHeight + margin;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', margin, position, scaledWidth, scaledHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  pdf.save(`${safeFilename}.pdf`);
}
