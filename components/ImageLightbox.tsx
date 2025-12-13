import React from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';

interface ImageLightboxProps {
    src: string;
    alt: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
    if (!isOpen || !src) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 transition-all duration-300 animate-in fade-in"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
            >
                <X size={32} />
            </button>

            <div
                className="relative w-full max-w-4xl h-full max-h-[90vh] flex items-center justify-center p-2"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image wrapper
            >
                <Image
                    src={src}
                    alt={alt}
                    width={1200}
                    height={1200}
                    className="object-contain max-h-full max-w-full rounded-md shadow-2xl"
                    unoptimized
                />
            </div>
        </div>
    );
}
