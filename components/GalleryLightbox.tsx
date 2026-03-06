import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface GalleryLightboxProps {
    images: string[];
    initialIndex?: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function GalleryLightbox({ images, initialIndex = 0, isOpen, onClose }: GalleryLightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, initialIndex]);

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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 sm:p-8 transition-all duration-300 animate-in fade-in"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/50 rounded-full p-2 z-50"
            >
                <X size={28} />
            </button>

            {images.length > 1 && (
                <>
                    <button
                        onClick={handlePrevious}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/50 rounded-full p-3 z-50"
                    >
                        <ChevronLeft size={32} />
                    </button>

                    <button
                        onClick={handleNext}
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
                        alt={`Galería foto ${currentIndex + 1}`}
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
