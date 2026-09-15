/**
 * scripts/cleanup-avatars-orphans.ts
 *
 * Elimina avatares huérfanos del bucket public `avatars` de Supabase Storage,
 * usando la API oficial (`storage.from('avatars').remove([paths])`) para que
 * se borre metadata + binario en la misma llamada.
 *
 * Un DELETE crudo sobre `storage.objects` desde SQL solo borra el registro
 * en Postgres; el binario en S3 queda colgando sin GC async garantizado.
 * Este script cierra el ciclo correctamente.
 *
 * Uso:
 *   Dry-run (default, cero cambios):
 *     SUPABASE_URL=https://<ref>.supabase.co \
 *     SUPABASE_SERVICE_ROLE_KEY=<service_role_jwt> \
 *     npx tsx scripts/cleanup-avatars-orphans.ts
 *
 *   Apply real (borra los huérfanos):
 *     SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/cleanup-avatars-orphans.ts --apply
 *
 * Env requerido:
 *   SUPABASE_URL              — URL del proyecto (staging o prod)
 *   SUPABASE_SERVICE_ROLE_KEY — service_role JWT del mismo proyecto
 *
 * Exit codes:
 *   0 — dry-run listado OK, o apply exitoso.
 *   1 — error en runtime (listing, delete, o inconsistencia BD).
 *   2 — env vars faltantes o inválidas.
 *
 * Definición de "huérfano":
 *   Objeto en bucket `avatars` cuyo `name` NO aparece como sufijo en ninguna
 *   de las 6 columnas referenciadoras:
 *     proveedores.foto_perfil
 *     proveedores.foto_carnet
 *     proveedores.foto_carnet_dorso
 *     proveedores.galeria[]
 *     mascotas.foto_mascota
 *     servicios_publicados.fotos[]
 *
 *   Las URLs en BD tienen forma
 *     https://<ref>.supabase.co/storage/v1/object/public/avatars/<path>
 *   El path del bucket es todo lo que sigue tras `/avatars/`.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes('--apply');
const BUCKET = 'avatars';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en env.');
  console.error('Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/cleanup-avatars-orphans.ts [--apply]');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type StorageEntry = { name: string; size: number };

/**
 * Lista recursivamente todos los archivos del bucket (paginado + subcarpetas).
 * `storage.from(bucket).list(prefix)` devuelve tanto archivos como carpetas;
 * un item con `metadata.size` numérica es archivo, el resto son carpetas.
 */
async function listAllInBucket(prefix = ''): Promise<StorageEntry[]> {
  const out: StorageEntry[] = [];
  const PAGE = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, {
        limit: PAGE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
    if (error) throw new Error(`list('${prefix}') falló: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const size = (entry.metadata as { size?: number } | null)?.size;
      if (typeof size === 'number') {
        out.push({ name: fullPath, size });
      } else if (entry.id === null) {
        // carpeta — recurse
        const sub = await listAllInBucket(fullPath);
        out.push(...sub);
      }
    }

    if (data.length < PAGE) break;
    offset += PAGE;
  }

  return out;
}

/**
 * Extrae el path del bucket desde una URL pública de Supabase Storage.
 * Retorna null si la URL no corresponde al bucket `avatars`.
 */
function extractAvatarPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/avatars\/(.+?)(?:\?.*)?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

async function getReferencedPaths(): Promise<Set<string>> {
  const referenced = new Set<string>();
  const add = (url: string | null | undefined) => {
    const path = extractAvatarPath(url);
    if (path) referenced.add(path);
  };

  // proveedores: foto_perfil, foto_carnet, foto_carnet_dorso, galeria[]
  {
    const { data, error } = await supabase
      .from('proveedores')
      .select('foto_perfil, foto_carnet, foto_carnet_dorso, galeria');
    if (error) throw new Error(`SELECT proveedores falló: ${error.message}`);
    for (const p of data ?? []) {
      add(p.foto_perfil as string | null);
      add(p.foto_carnet as string | null);
      add(p.foto_carnet_dorso as string | null);
      const gal = (p.galeria as string[] | null) ?? [];
      gal.forEach(add);
    }
  }

  // mascotas: foto_mascota
  {
    const { data, error } = await supabase.from('mascotas').select('foto_mascota');
    if (error) throw new Error(`SELECT mascotas falló: ${error.message}`);
    for (const m of data ?? []) add(m.foto_mascota as string | null);
  }

  // servicios_publicados: fotos[]
  {
    const { data, error } = await supabase.from('servicios_publicados').select('fotos');
    if (error) throw new Error(`SELECT servicios_publicados falló: ${error.message}`);
    for (const s of data ?? []) {
      const fotos = (s.fotos as string[] | null) ?? [];
      fotos.forEach(add);
    }
  }

  return referenced;
}

function fmtMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  console.log(`Target: ${SUPABASE_URL}`);
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Mode:   ${APPLY ? 'APPLY (borrado real)' : 'DRY-RUN (sin cambios)'}\n`);

  const [allObjects, referenced] = await Promise.all([
    listAllInBucket(),
    getReferencedPaths(),
  ]);

  console.log(`Objetos en bucket: ${allObjects.length}`);
  console.log(`Paths referenciados desde BD: ${referenced.size}`);

  const orphans = allObjects.filter((o) => !referenced.has(o.name));
  const totalSize = orphans.reduce((s, o) => s + o.size, 0);

  console.log(`\nHuérfanos encontrados: ${orphans.length} (${fmtMB(totalSize)})\n`);

  if (orphans.length === 0) {
    console.log('Nada que limpiar.');
    return;
  }

  console.log('Listado (primeros 20):');
  for (const o of orphans.slice(0, 20)) {
    console.log(`  - ${o.name}  (${(o.size / 1024).toFixed(1)} KB)`);
  }
  if (orphans.length > 20) {
    console.log(`  ... y ${orphans.length - 20} más`);
  }

  if (!APPLY) {
    console.log('\nDry-run — cero cambios. Re-corre con --apply para borrar.');
    return;
  }

  console.log('\nBorrando en batches de 100...');
  const BATCH = 100;
  let deleted = 0;
  for (let i = 0; i < orphans.length; i += BATCH) {
    const batch = orphans.slice(i, i + BATCH).map((o) => o.name);
    const { data, error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      console.error(`\nBatch ${Math.floor(i / BATCH) + 1} falló: ${error.message}`);
      console.error(`Deleted acumulado antes del fallo: ${deleted}/${orphans.length}`);
      process.exit(1);
    }
    const got = data?.length ?? 0;
    deleted += got;
    console.log(`  Batch ${Math.floor(i / BATCH) + 1}: borrados ${got} (total ${deleted}/${orphans.length})`);
  }

  console.log(`\nHecho. ${deleted} huérfanos borrados (${fmtMB(totalSize)} liberados).`);
  console.log('Verificación: re-corre sin --apply para confirmar cero huérfanos.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
