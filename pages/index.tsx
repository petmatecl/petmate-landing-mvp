import { FormEvent, useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch('/api/join-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      setOk(true);
      form.reset();
    } catch (e:any) {
      setErr(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-6">
      <header className="w-full max-w-4xl py-10">
        <h1 className="text-4xl md:text-5xl font-bold">Tu casa y tus mascotas, en buenas manos.</h1>
        <p className="mt-3 text-lg text-white/80">Conecta con cuidadores verificados para tus viajes. Pagos protegidos y reseñas reales (pronto).</p>
      </header>

      <section className="w-full max-w-4xl grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
          <h2 className="text-2xl font-semibold mb-4">Únete a la lista de espera</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <input className="input" name="name" placeholder="Nombre" required />
            <input className="input" name="email" placeholder="Email" type="email" required />
            <input className="input" name="city" placeholder="Ciudad" />
            <select className="input" name="role" defaultValue="owner" required>
              <option value="owner">Soy dueño/a</option>
              <option value="sitter">Quiero cuidar</option>
              <option value="both">Ambos</option>
            </select>
            <input className="input" name="when_travel" placeholder="¿Cuándo viajas? (mes/año)" />
            <button disabled={loading} className="btn w-full">{loading ? 'Enviando…' : 'Anotarme'}</button>
            {ok && <p className="text-emerald-400">¡Listo! Te avisaremos en el lanzamiento.</p>}
            {err && <p className="text-red-400">{err}</p>}
          </form>
        </div>

        <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
          <h3 className="text-xl font-semibold">¿Cómo funciona?</h3>
          <ol className="mt-3 space-y-2 text-white/80 list-decimal list-inside">
            <li>Publica tu estadía o postula como cuidador/a.</li>
            <li>Chatea, verifica perfiles y confirma la reserva.</li>
            <li>Checklist con fotos en Check‑in / Check‑out.</li>
          </ol>
          <div className="mt-6 text-sm text-white/60">
            <p><strong>Nota:</strong> Durante el MVP inicial el servicio es gratuito y sin pagos integrados.</p>
          </div>
        </div>
      </section>

      <footer className="mt-16 text-sm text-white/50">
        PetMate © {new Date().getFullYear()} — Beta temprana
      </footer>
    </main>
  );
}
