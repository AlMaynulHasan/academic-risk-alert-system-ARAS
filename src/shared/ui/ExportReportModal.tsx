import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useToast } from './Toast';
import {
  exportReportService,
  AcademicReportData,
  ExportOptions,
} from '../services/exportReportService';
import {
  Download,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  GraduationCap,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: AcademicReportData;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  reportData,
}) => {
  const { showToast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'csv'>('pdf');
  const [includeAssessments, setIncludeAssessments] = useState(true);
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [includeRiskAudit, setIncludeRiskAudit] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    const options: ExportOptions = {
      includeAssessments,
      includeAttendance,
      includeRiskAudit,
    };

    try {
      if (selectedFormat === 'pdf') {
        exportReportService.exportToPdf(reportData, options);
        showToast('Academic Performance Report PDF generated and downloaded successfully!');
      } else {
        exportReportService.exportToCsv(reportData, options);
        showToast('Academic Performance Report CSV downloaded successfully!');
      }
      onClose();
    } catch (err) {
      console.error('Export error:', err);
      showToast('Failed to export performance report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Academic Performance Report"
      description="Download official documentation of course marks, attendance progression, and early risk standing."
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Student Document Preview Strip */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-xs text-slate-900 block">
                {reportData.student.displayName}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                ID: {reportData.student.officialStudentId} · {reportData.student.department}
              </span>
            </div>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-200">
              {reportData.semester}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
            <div>
              <span className="text-slate-500 block">Attendance:</span>
              <span className="font-bold text-slate-800 font-mono">
                {reportData.kpis.attendancePercentage}%
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Marks Avg:</span>
              <span className="font-bold text-slate-800 font-mono">
                {reportData.kpis.marksAverage !== null ? `${reportData.kpis.marksAverage}%` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Risk Level:</span>
              <span
                className={`font-bold capitalize ${
                  reportData.riskStatus?.level === 'High'
                    ? 'text-red-700'
                    : reportData.riskStatus?.level === 'Medium'
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {reportData.riskStatus?.level || 'Low'}
              </span>
            </div>
          </div>
        </div>

        {/* Format Selection Cards */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 block">
            Select Export Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* PDF Option */}
            <button
              type="button"
              onClick={() => setSelectedFormat('pdf')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedFormat === 'pdf'
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-between p-1.5 text-red-600">
                  <FileText className="w-5 h-5" />
                </div>
                {selectedFormat === 'pdf' && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  PDF Document (.pdf)
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block leading-tight">
                  Formatted official transcript with tables, risk audit, and signature block.
                </span>
              </div>
            </button>

            {/* CSV Option */}
            <button
              type="button"
              onClick={() => setSelectedFormat('csv')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedFormat === 'csv'
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-between p-1.5 text-emerald-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                {selectedFormat === 'csv' && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  CSV Spreadsheet (.csv)
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block leading-tight">
                  Raw tabular data format for Microsoft Excel, Google Sheets, or data archiving.
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Content Options Checkboxes */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <label className="text-xs font-semibold text-slate-700 block">
            Report Sections Included
          </label>
          <div className="space-y-2 text-xs text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeAssessments}
                onChange={(e) => setIncludeAssessments(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Continuous Assessments breakdown table (quizzes, midterms, labs)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeAttendance}
                onChange={(e) => setIncludeAttendance(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Attendance breakdown & session log summary</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeRiskAudit}
                onChange={(e) => setIncludeRiskAudit(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Active Advisory Signals & Early Warning Triggers</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {selectedFormat === 'pdf' ? 'Download PDF Report' : 'Download CSV Report'}
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
