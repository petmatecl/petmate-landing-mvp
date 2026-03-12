import React, { useState, useRef } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface PhotoUploaderProps {
  /** Supabase storage bucket name */
  bucket: string;
  /** Path prefix within the bucket (e.g. "proveedores/abc-123") */
  pathPrefix: string;
  /** Current photos URLs */
  photos: string[];
  /** Called when photos change */
  onChange: (photos: string[]) => void;
  /** Max number of photos allowed */
  maxPhotos?: number;
  /** Accepted file types */
  accept?: string;
  /** Max file size in MB */
  maxSizeMB?: number;
  /** Whether to show as avatar (single circular photo) */
  avatar?: boolean;
}

export default function PhotoUploader({
  bucket,
  pathPrefix,
  photos,
  onChange,
  maxPhotos = 6,
  accept = 'image/jpeg,image/png,image/webp',
  maxSizeMB = 5,
  avatar = false,
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    const newPhotos = [...photos];

    for (let i = 0; i < files.length; i++) {
      if (newPhotos.length >= maxPhotos) {
        setError(`Máximo ${maxPhotos} fotos permitidas.`);
        break;
      }

      const file = files[i];

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`"${file.name}" excede el límite de ${maxSizeMB}MB.`);
        continue;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        setError(`Error al subir "${file.name}": ${uploadError.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      if (urlData?.publicUrl) {
        newPhotos.push(urlData.publicUrl);
      }
    }

    onChange(newPhotos);
    setUploading(false);

    // Reset input
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = async (index: number) => {
    const url = photos[index];
    const newPhotos = photos.filter((_, i) => i !== index);
    onChange(newPhotos);

    // Try to delete from storage (non-blocking)
    try {
      const path = url.split(`${bucket}/`)[1];
      if (path) {
        await supabase.storage.from(bucket).remove([path]);
      }
    } catch {
      // Ignore deletion errors
    }
  };

  if (avatar) {
    const currentPhoto = photos[0];
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 hover:border-emerald-400 transition-colors group"
        >
          {currentPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentPhoto} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
              <Camera size={24} className="text-slate-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploading ? (
              <Loader2 size={20} className="text-white animate-spin" />
            ) : (
              <Camera size={20} className="text-white" />
            )}
          </div>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileSelect}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {photos.map((url, i) => (
          <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              aria-label="Eliminar foto"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-slate-50 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={20} className="text-slate-400 animate-spin" />
            ) : (
              <>
                <Camera size={20} className="text-slate-400" />
                <span className="text-xs text-slate-500">Agregar</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <p className="text-xs text-slate-400 mt-2">
        Máximo {maxPhotos} fotos. JPG, PNG o WebP hasta {maxSizeMB}MB cada una.
      </p>
    </div>
  );
}
