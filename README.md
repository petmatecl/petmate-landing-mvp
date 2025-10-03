# PetMate — Landing MVP

Minimal **Next.js + Tailwind + Supabase** landing with a waitlist form.

## Requisitos previos (no técnicos)
1. Crea cuentas gratuitas:
   - GitHub (para alojar el código)
   - Vercel (para publicar la web)
   - Supabase (para guardar la lista de espera en una base de datos)
2. Instala **Node.js LTS** en tu computador.

## Paso a paso
1. **Descarga** este proyecto y descomprímelo.
2. Abre una terminal en la carpeta `petmate-landing-mvp` y ejecuta:
   ```bash
   npm install
   ```
3. En **Supabase** crea un proyecto. Copia los valores de:
   - `Project URL`
   - `service_role` (Settings → API)
4. En Supabase ve a **SQL Editor** y ejecuta:
   ```sql
   -- Tabla de lista de espera
   create table if not exists public.waitlist (
     id uuid primary key default gen_random_uuid(),
     name text not null,
     email text not null,
     city text,
     role text check (role in ('owner','sitter','both')) default 'owner',
     when_travel text,
     created_at timestamp with time zone default now()
   );

   -- Habilitar RLS y política para API (solo inserts vía service role)
   alter table public.waitlist enable row level security;
   create policy "allow-insert-with-service-role" on public.waitlist
     for insert to public
     with check (true);
   ```
   *(El API usa la **service_role** en el servidor, así que no expone datos al cliente.)*

5. Crea un archivo **.env.local** en la raíz con:
   ```env
   SUPABASE_URL=TU_URL_DE_SUPABASE
   SUPABASE_SERVICE_ROLE=TU_SERVICE_ROLE_KEY
   ```

6. Levanta el sitio en tu computador:
   ```bash
   npm run dev
   ```
   Abre http://localhost:3000 y prueba el formulario. Revisa en Supabase → Table Editor que se guarden los datos.

7. **Publicar en Vercel**:
   - Sube el repo a GitHub (desde tu terminal: `git init`, `git add .`, `git commit -m "init"`, `git branch -M main`, `git remote add origin <URL_DE_TU_REPO>`, `git push -u origin main`).
   - En Vercel: **New Project** → Importa el repo → Agrega **Environment Variables** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`) → Deploy.
   - Listo: tendrás una URL pública de tu landing.

## Próximos pasos sugeridos
- Añadir **/explore** con tarjetas de “estadías demo” (sin reservas todavía).
- Añadir **/apply** (formulario para cuidadores) que guarde un registro en Supabase.
- Configurar **PWA** más adelante para “instalar” la app en el celular (gratis).
- Cuando quieras activar pagos, integrar Mercado Pago en sandbox.

## Soporte
Este MVP está pensado para empezar **rápido y gratis**. Cualquier duda, revisa el README o pide ayuda en el chat.
