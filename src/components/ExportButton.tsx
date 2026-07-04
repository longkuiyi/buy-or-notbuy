import { useState } from 'react';
import { Download, Image as ImageIcon, FileText } from 'lucide-react';
import { exportReport, type ExportFormat } from '../utils/export';
import './ExportButton.css';

interface ExportButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  filename?: string;
}

export function ExportButton({ targetRef, filename }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    const element = targetRef.current;
    if (!element) return;

    setIsOpen(false);
    setExporting(true);

    try {
      await exportReport(element, format, filename);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="export-button-wrapper">
      <button
        type="button"
        className="export-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={exporting}
      >
        {exporting ? (
          <span className="export-spin" />
        ) : (
          <Download size={16} />
        )}
        {exporting ? '导出中' : '导出报告'}
      </button>

      {isOpen && (
        <>
          <div className="export-backdrop" onClick={() => setIsOpen(false)} />
          <div className="export-menu">
            <button
              type="button"
              className="export-menu-item"
              onClick={() => handleExport('image')}
            >
              <ImageIcon size={16} />
              导出长图 (PNG)
            </button>
            <button
              type="button"
              className="export-menu-item"
              onClick={() => handleExport('pdf')}
            >
              <FileText size={16} />
              导出 PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
