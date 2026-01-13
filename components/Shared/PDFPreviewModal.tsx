import React from 'react';
import { X, Download, FileText } from 'lucide-react';

interface PDFPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string | null;
    title?: string;
    onDownload?: () => void;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
    isOpen,
    onClose,
    pdfUrl,
    title = "Vista Previa del Documento",
    onDownload
}) => {
    if (!isOpen || !pdfUrl) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <FileText className="text-emerald-600" size={20} />
                        {title}
                    </h3>
                    <div className="flex items-center gap-2">
                        {onDownload && (
                            <button
                                onClick={onDownload}
                                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                            >
                                <Download size={16} /> Descargar
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content - Iframe */}
                <div className="flex-1 bg-slate-200 p-0 overflow-hidden relative">
                    <iframe
                        src={pdfUrl + '#toolbar=0'}
                        className="w-full h-full border-none"
                        title="PDF Preview"
                    />
                </div>
                {/* Mobile Footer for Download */}
                {onDownload && (
                    <div className="sm:hidden p-4 border-t border-slate-100 bg-white">
                        <button
                            onClick={onDownload}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                        >
                            <Download size={18} /> Descargar PDF
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
