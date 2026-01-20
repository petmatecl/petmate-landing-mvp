import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
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
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[10000]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all h-[85vh] flex flex-col border border-slate-200">
                                {/* Header */}
                                <div className="px-6 py-4 border-b border-slate-300 flex items-center justify-between bg-slate-50">
                                    <Dialog.Title as="h3" className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                        <FileText className="text-emerald-600" size={20} />
                                        {title}
                                    </Dialog.Title>
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
                                    {pdfUrl && (
                                        <iframe
                                            src={pdfUrl + '#toolbar=0'}
                                            className="w-full h-full border-none"
                                            title="PDF Preview"
                                        />
                                    )}
                                </div>

                                {/* Mobile Footer for Download */}
                                {onDownload && (
                                    <div className="sm:hidden p-4 border-t border-slate-300 bg-white">
                                        <button
                                            onClick={onDownload}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                                        >
                                            <Download size={18} /> Descargar PDF
                                        </button>
                                    </div>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};
