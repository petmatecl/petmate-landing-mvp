// components/Footer.tsx
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Instagram } from "lucide-react";

const socialLinks = [
  { name: 'Instagram', href: 'https://www.instagram.com/pawnecta', Icon: Instagram },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">

      {/* BANDA PRINCIPAL — 3 columnas */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">

        {/* Brand */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="relative block">
              <Image
                src="/pawnecta_logo_final-trans.png"
                alt="Pawnecta"
                width={130}
                height={36}
                className="h-8 sm:h-9 w-auto"
              />
            </Link>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            El directorio de servicios para mascotas más confiable de Chile.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Interactive SpA<br />
            Irarrázaval 2150 D519<br />
            Ñuñoa, Santiago
          </p>
        </div>

        {/* Servicios */}
        <div>
          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Servicios</h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li><Link href="/explorar?categoria=hospedaje" className="hover:text-emerald-700 transition-colors">Hospedaje</Link></li>
            <li><Link href="/explorar?categoria=guarderia" className="hover:text-emerald-700 transition-colors">Guardería diurna</Link></li>
            <li><Link href="/explorar?categoria=domicilio" className="hover:text-emerald-700 transition-colors">Visita a domicilio</Link></li>
            <li><Link href="/explorar?categoria=paseos" className="hover:text-emerald-700 transition-colors">Paseador de perros</Link></li>
            <li><Link href="/explorar?categoria=peluqueria" className="hover:text-emerald-700 transition-colors">Peluquería</Link></li>
            <li><Link href="/explorar?categoria=adiestramiento" className="hover:text-emerald-700 transition-colors">Adiestramiento</Link></li>
            <li><Link href="/explorar?categoria=veterinario" className="hover:text-emerald-700 transition-colors">Veterinario a domicilio</Link></li>
            <li><Link href="/explorar?categoria=traslado" className="hover:text-emerald-700 transition-colors">Traslado</Link></li>
          </ul>
        </div>

        {/* Pawnecta + Contacto fusionado */}
        <div>
          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Pawnecta</h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li><Link href="/quienes-somos" className="hover:text-emerald-700 transition-colors">Quiénes somos</Link></li>
            <li><Link href="/faq" className="hover:text-emerald-700 transition-colors">Preguntas frecuentes</Link></li>
            <li><Link href="/blog" className="hover:text-emerald-700 transition-colors">Blog</Link></li>
            <li><Link href="/register?rol=proveedor" className="hover:text-emerald-700 transition-colors">Publicar mi servicio</Link></li>
            <li><Link href="mailto:contacto@pawnecta.com" className="hover:text-emerald-700 transition-colors">contacto@pawnecta.com</Link></li>
          </ul>
        </div>

      </div>

      {/* DIRECTORIO SEO — colapsable */}
      <div className="border-t border-slate-300 py-12 mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <details className="group">
            <summary className="cursor-pointer list-none flex items-center justify-between [&::-webkit-details-marker]:hidden text-sm font-bold text-slate-900 uppercase tracking-wide hover:text-emerald-700 transition-colors">
              <span>Explorar por categoría y comuna</span>
              <ChevronDown size={20} className="text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mt-8">

              {/* Hospedaje */}
              <div>
                <Link href="/explorar?categoria=hospedaje" className="text-sm font-bold text-emerald-700 hover:text-emerald-500 mb-4 block">Hospedaje</Link>
                <ul className="space-y-3 text-[13px] text-slate-500">
                  <li><Link href="/explorar?categoria=hospedaje&comuna=Providencia" className="hover:text-emerald-700 transition-colors">Providencia</Link></li>
                  <li><Link href="/explorar?categoria=hospedaje&comuna=Las Condes" className="hover:text-emerald-700 transition-colors">Las Condes</Link></li>
                  <li><Link href="/explorar?categoria=hospedaje&comuna=Ñuñoa" className="hover:text-emerald-700 transition-colors">Ñuñoa</Link></li>
                  <li><Link href="/explorar?categoria=hospedaje&comuna=Vitacura" className="hover:text-emerald-700 transition-colors">Vitacura</Link></li>
                  <li><Link href="/explorar?categoria=hospedaje&comuna=Santiago" className="hover:text-emerald-700 transition-colors">Santiago Centro</Link></li>
                </ul>
              </div>

              {/* Domicilio */}
              <div>
                <Link href="/explorar?categoria=domicilio" className="text-sm font-bold text-emerald-700 hover:text-emerald-500 mb-4 block">Visita a domicilio</Link>
                <ul className="space-y-3 text-[13px] text-slate-500">
                  <li><Link href="/explorar?categoria=domicilio&comuna=Providencia" className="hover:text-emerald-700 transition-colors">Providencia</Link></li>
                  <li><Link href="/explorar?categoria=domicilio&comuna=Las Condes" className="hover:text-emerald-700 transition-colors">Las Condes</Link></li>
                  <li><Link href="/explorar?categoria=domicilio&comuna=Ñuñoa" className="hover:text-emerald-700 transition-colors">Ñuñoa</Link></li>
                  <li><Link href="/explorar?categoria=domicilio&comuna=La Florida" className="hover:text-emerald-700 transition-colors">La Florida</Link></li>
                  <li><Link href="/explorar?categoria=domicilio&comuna=Maipú" className="hover:text-emerald-700 transition-colors">Maipú</Link></li>
                </ul>
              </div>

              {/* Paseos */}
              <div>
                <Link href="/explorar?categoria=paseos" className="text-sm font-bold text-emerald-700 hover:text-emerald-500 mb-4 block">Paseadores</Link>
                <ul className="space-y-3 text-[13px] text-slate-500">
                  <li><Link href="/explorar?categoria=paseos&comuna=Providencia" className="hover:text-emerald-700 transition-colors">Providencia</Link></li>
                  <li><Link href="/explorar?categoria=paseos&comuna=Las Condes" className="hover:text-emerald-700 transition-colors">Las Condes</Link></li>
                  <li><Link href="/explorar?categoria=paseos&comuna=Ñuñoa" className="hover:text-emerald-700 transition-colors">Ñuñoa</Link></li>
                  <li><Link href="/explorar?categoria=paseos&comuna=Santiago" className="hover:text-emerald-700 transition-colors">Santiago Centro</Link></li>
                  <li><Link href="/explorar?categoria=paseos&comuna=Macul" className="hover:text-emerald-700 transition-colors">Macul</Link></li>
                </ul>
              </div>

              {/* Peluquería */}
              <div>
                <Link href="/explorar?categoria=peluqueria" className="text-sm font-bold text-emerald-700 hover:text-emerald-500 mb-4 block">Peluquería</Link>
                <ul className="space-y-3 text-[13px] text-slate-500">
                  <li><Link href="/explorar?categoria=peluqueria&comuna=Providencia" className="hover:text-emerald-700 transition-colors">Providencia</Link></li>
                  <li><Link href="/explorar?categoria=peluqueria&comuna=Las Condes" className="hover:text-emerald-700 transition-colors">Las Condes</Link></li>
                  <li><Link href="/explorar?categoria=peluqueria&comuna=Ñuñoa" className="hover:text-emerald-700 transition-colors">Ñuñoa</Link></li>
                  <li><Link href="/explorar?categoria=peluqueria&comuna=Peñalolén" className="hover:text-emerald-700 transition-colors">Peñalolén</Link></li>
                  <li><Link href="/explorar?categoria=peluqueria&comuna=La Reina" className="hover:text-emerald-700 transition-colors">La Reina</Link></li>
                </ul>
              </div>

              {/* Veterinario */}
              <div>
                <Link href="/explorar?categoria=veterinario" className="text-sm font-bold text-emerald-700 hover:text-emerald-500 mb-4 block">Veterinarios</Link>
                <ul className="space-y-3 text-[13px] text-slate-500">
                  <li><Link href="/explorar?categoria=veterinario&comuna=Providencia" className="hover:text-emerald-700 transition-colors">Providencia</Link></li>
                  <li><Link href="/explorar?categoria=veterinario&comuna=Las Condes" className="hover:text-emerald-700 transition-colors">Las Condes</Link></li>
                  <li><Link href="/explorar?categoria=veterinario&comuna=Ñuñoa" className="hover:text-emerald-700 transition-colors">Ñuñoa</Link></li>
                  <li><Link href="/explorar?categoria=veterinario&comuna=San Miguel" className="hover:text-emerald-700 transition-colors">San Miguel</Link></li>
                  <li><Link href="/explorar?categoria=veterinario&comuna=Santiago" className="hover:text-emerald-700 transition-colors">Santiago Centro</Link></li>
                </ul>
              </div>

              {/* Adiestramiento */}
              <div>
                <Link href="/explorar?categoria=adiestramiento" className="text-sm font-bold text-emerald-700 hover:text-emerald-500 mb-4 block">Adiestramiento</Link>
                <ul className="space-y-3 text-[13px] text-slate-500">
                  <li><Link href="/explorar?categoria=adiestramiento&comuna=Providencia" className="hover:text-emerald-700 transition-colors">Providencia</Link></li>
                  <li><Link href="/explorar?categoria=adiestramiento&comuna=Las Condes" className="hover:text-emerald-700 transition-colors">Las Condes</Link></li>
                  <li><Link href="/explorar?categoria=adiestramiento&comuna=Ñuñoa" className="hover:text-emerald-700 transition-colors">Ñuñoa</Link></li>
                  <li><Link href="/explorar?categoria=adiestramiento&comuna=Lo Barnechea" className="hover:text-emerald-700 transition-colors">Lo Barnechea</Link></li>
                  <li><Link href="/explorar?categoria=adiestramiento&comuna=Vitacura" className="hover:text-emerald-700 transition-colors">Vitacura</Link></li>
                </ul>
              </div>

            </div>
          </details>
        </div>
      </div>

      {/* BANDA INFERIOR — copyright + legal + social en una fila */}
      <div className="border-t border-slate-200 py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">© 2026 Pawnecta. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <Link href="/terminos" className="hover:text-emerald-700 transition-colors">Términos y Condiciones</Link>
            <span className="text-slate-300">·</span>
            <Link href="/privacidad" className="hover:text-emerald-700 transition-colors">Política de Privacidad</Link>
          </div>
          <div className="flex items-center gap-2">
            {socialLinks.map(({ name, href, Icon }) => (
              <Link
                key={name}
                href={href}
                aria-label={name}
                target="_blank"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all"
              >
                <Icon size={18} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </div>

    </footer>
  );
}

export default Footer;
