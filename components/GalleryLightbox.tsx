import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface GalleryLightboxProps {
    images: string[];
    initialIndex?: number;
    isOpen: boolean;
    onClose: () => void;
    title?: string;
}

export default function GalleryLightbox({ images, initialIndex = 0, isOpen, onClose, title }: GalleryLightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const prevButtonRef = useRef<HTMLButtonElement>(null);
    const nextButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement as HTMLElement;
            setCurrentIndex(initialIndex);
            document.body.style.overflow = 'hidden';
            setTimeout(() => closeButtonRef.current?.focus(), 0);
        } else {
            document.body.style.overflow = 'auto';
            previousFocusRef.current?.focus();
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, initialIndex]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'ArrowLeft' && images.length > 1) {
                e.preventDefault();
                setCurrentIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
            } else if (e.key === 'ArrowRight' && images.length > 1) {
                e.preventDefault();
                setCurrentIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
            } else if (e.key === 'Tab') {
                const focusables = [closeButtonRef.current, prevButtonRef.current, nextButtonRef.current].filter(Boolean) as HTMLElement[];
                if (focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, images.length, onClose]);

    if (!isOpen || !images || images.length === 0) return null;

    const handlePrevious = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Galería de fotos'}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 sm:p-8 transition-all duration-300 animate-in fade-in"
            onClick={onClose}
        >
            <button
                ref={closeButtonRef}
                onClick={onClose}
                aria-label="Cerrar galería"
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/50 rounded-full p-2 z-50"
            >
                <X size={28} />
            </button>

            {images.length > 1 && (
                <>
                    <button
                        ref={prevButtonRef}
                        onClick={handlePrevious}
                        aria-label="Foto anterior"
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/50 rounded-full p-3 z-50"
                    >
                        <ChevronLeft size={32} />
                    </button>

                    <button
                        ref={nextButtonRef}
                        onClick={handleNext}
                        aria-label="Foto siguiente"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/50 rounded-full p-3 z-50"
                    >
                        <ChevronRight size={32} />
                    </button>
                </>
            )}

            <div
                className="relative w-full max-w-5xl h-full flex flex-col items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative w-full h-[80vh] flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={images[currentIndex]}
                        alt={images.length > 1 ? `Foto ${currentIndex + 1} de ${images.length}${title ? ` — ${title}` : ''}` : (title || 'Foto')}
                        className="object-contain max-h-full max-w-full rounded-md shadow-2xl transition-opacity duration-300"
                    />
                </div>

                {images.length > 1 && (
                    <div className="text-white/60 font-medium text-sm mt-4 tracking-wider">
                        {currentIndex + 1} / {images.length}
                    </div>
                )}
            </div>
        </div>
    );
}
