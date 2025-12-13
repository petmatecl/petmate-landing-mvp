// pages/cliente.tsx
import Head from "next/head";
import Link from "next/link";
import Image from "next/image"; // Added Image
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import DateRangeAirbnb from "../components/DateRangeAirbnb";
import PetsSelectorAirbnb, { PetsValue } from "../components/PetsSelectorAirbnb";
import MyPetsSelector from "../components/Client/MyPetsSelector";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import PetCard, { Pet } from "../components/Client/PetCard";
import PetFormModal from "../components/Client/PetFormModal";
import ImageLightbox from "../components/ImageLightbox"; // Added
import ModalAlert from "../components/ModalAlert"; // Added
import { Home, Hotel, Calendar } from "lucide-react";
import { useRouter } from "next/router";

export default function ClienteDashboardPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null); // Added email
  const [clientProfile, setClientProfile] = useState<any>(null); // Datos del cliente (fechas viaje, etc)

  // Profile Photo State
  const [uploading, setUploading] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false); // Added Lightbox State

  useEffect(() => {
    // Moved fetch logic to main useEffect to coordinate userId
  }, []);

  // Estado del buscador
  const [rango, setRango] = useState<DateRange | undefined>();
  const [servicio, setServicio] = useState("domicilio");
  const [mascotas, setMascotas] = useState<PetsValue>({ dogs: 0, cats: 0 }); // Para buildSearchUrl

  // Nueva lógica: Selección de mascotas específicas
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);

  // Estado de gestión de mascotas
  const [myPets, setMyPets] = useState<Pet[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        setEmail(session.user.email || null);
        if (session.user.user_metadata?.nombre) {
          setNombre(session.user.user_metadata.nombre);
        }
        fetchPets(session.user.id);
        fetchClientProfile(session.user.id);
      }
    });
  }, []);

  async function fetchClientProfile(uid: string) {
    const { data } = await supabase.from("registro_petmate").select("*").eq("auth_user_id", uid).single();
    if (data) {
      setClientProfile(data);
      if (data.nombre && !nombre) setNombre(data.nombre);

      if (data.mascotas_viaje && Array.isArray(data.mascotas_viaje)) {
        setSelectedPetIds(data.mascotas_viaje);
      } else {
        setMascotas({ dogs: data.perros || 0, cats: data.gatos || 0 });
      }

      if (data.fecha_inicio && data.fecha_fin) {
        setRango({ from: new Date(data.fecha_inicio), to: new Date(data.fecha_fin) });
      }
      // TODO: cargar servicio si existiera columna
    }
  }

  async function fetchPets(uid: string) {
    try {
      setLoadingPets(true);
      const { data, error } = await supabase
        .from("mascotas")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setMyPets(data as Pet[]);
      }
    } catch (err) {
      console.error("Error fetching pets:", err);
    } finally {
      setLoadingPets(false);
    }
  }

  // Efecto para sincronizar contadores cuando se cargan las mascotas Y la selección guardada
  // Esto es para asegurar que si viene de DB, el contador `mascotas` refleje la realidad
  useEffect(() => {
    if (myPets.length > 0 && selectedPetIds.length > 0) {
      // Re-calcular contadores
      const selected = myPets.filter(p => selectedPetIds.includes(p.id));
      const dogs = selected.filter(p => p.tipo === 'perro').length;
      const cats = selected.filter(p => p.tipo === 'gato').length;
      setMascotas({ dogs, cats });
    }
  }, [myPets, selectedPetIds]);

  const handleEdit = (pet: Pet) => {
    setEditingPet(pet);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingPet(null);
    setIsModalOpen(true);
  };

  const handleSaved = () => {
    if (userId) fetchPets(userId);
  };

  // Modal Alert State
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertConfig({ isOpen: true, title, message, type });
  };

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, isOpen: false }));
  };

  // Logic to upload photo (Copied/Adapted from sitter.tsx)
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update Profile
      const { error: updateError } = await supabase
        .from('registro_petmate')
        .update({ foto_perfil: publicUrl })
        .eq('auth_user_id', userId);

      if (updateError) {
        throw updateError;
      }

      // 4. Update local state
      setClientProfile((prev: any) => ({ ...prev, foto_perfil: publicUrl }));
      showAlert('¡Foto actualizada!', 'Tu foto de perfil ha sido actualizada correctamente.', 'success');

    } catch (error: any) {
      console.error('Error uploading photo:', error);
      showAlert('Error', error.message || 'Error subiendo la imagen.', 'error');
    } finally {
      setUploading(false);
    }
  };


  // Construir URL de búsqueda
  const buildSearchUrl = () => {
    const params = new URLSearchParams();
    if (rango?.from) params.set("desde", rango.from.toISOString());
    if (rango?.to) params.set("hasta", rango.to.toISOString());
    params.set("servicio", servicio);
    params.set("perros", mascotas.dogs.toString());
    params.set("gatos", mascotas.cats.toString());
    return `/explorar?${params.toString()}`;
  };

  const handleSaveTrip = async () => {
    if (!userId) return;

    try {
      // Guardar intención de viaje
      const updates: any = {
        perros: mascotas.dogs,
        gatos: mascotas.cats,
        fecha_inicio: rango?.from ? format(rango.from, 'yyyy-MM-dd') : null,
        fecha_fin: rango?.to ? format(rango.to, 'yyyy-MM-dd') : null,
        mascotas_viaje: selectedPetIds
      };

      const { error } = await supabase.from("registro_petmate").update(updates).eq("auth_user_id", userId);

      if (error) {
        console.error("Error saving trip:", error);
        showAlert('Error', `Error guardando el viaje: ${error.message}`, 'error');
      } else {
        // Actualizar perfil localmente para que se refleje en la UI
        await fetchClientProfile(userId);

        // Limpiar formulario
        setRango(undefined);
        setSelectedPetIds([]);
        setMascotas({ dogs: 0, cats: 0 });

        showAlert('¡Viaje Registrado!', 'Tu viaje ha sido creado con éxito. Los cuidadores podrán ver tus fechas.', 'success');
      }

    } catch (e) {
      console.error(e);
      showAlert('Error', 'Ocurrió un error inesperado.', 'error');
    }
  };

  const handleEditTrip = () => {
    if (clientProfile) {
      if (clientProfile.fecha_inicio && clientProfile.fecha_fin) {
        setRango({ from: new Date(clientProfile.fecha_inicio), to: new Date(clientProfile.fecha_fin) });
      }
      if (clientProfile.mascotas_viaje && Array.isArray(clientProfile.mascotas_viaje)) {
        setSelectedPetIds(clientProfile.mascotas_viaje);
      }
      setMascotas({ dogs: clientProfile.perros || 0, cats: clientProfile.gatos || 0 });
      // Optional: Scroll to top or show message "Datos cargados"
    }
  };

  const displayName = nombre || "Cliente";
  const hasPets = myPets.length > 0;

  return (
    <>
      <Head>
        <title>Panel cliente — PetMate</title>
      </Head>

      <main className="bg-slate-50 min-h-[calc(100vh-80px)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8"> {/* Increased max-w to 7xl default */}

          <header className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              Hola, {displayName} 👋
            </h1>
            <p className="text-sm text-slate-600">
              Gestiona tus viajes, mascotas y perfil.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* SIDEBAR: Perfil del Cliente (Replicated from Sitter) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Tarjeta de Identidad */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                <div className="px-6 pb-6 text-center -mt-12 relative">
                  <div className="relative w-24 h-24 mx-auto">
                    <div
                      className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-white cursor-pointer group"
                      onClick={() => setIsLightboxOpen(true)}
                    >
                      {clientProfile?.foto_perfil ? (
                        <Image
                          src={clientProfile.foto_perfil}
                          alt="Foto perfil"
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          unoptimized
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-300 text-3xl">
                          👤
                        </div>
                      )}
                    </div>

                    {/* Botón Editar (Lápiz) */}
                    <label className="absolute bottom-0 right-0 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm cursor-pointer hover:bg-slate-50 text-slate-600 transition-colors z-10">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={uploading}
                      />
                      {uploading ? (
                        <span className="block w-3.5 h-3.5 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin"></span>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                      )}
                    </label>
                  </div>

                  <h2 className="mt-3 text-lg font-bold text-slate-900">
                    {displayName}
                  </h2>
                  <p className="text-sm text-slate-500">{email}</p>

                  <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
                    Cliente Verificado
                  </div>
                </div>
              </div>

              {/* Información Personal (Placeholder) */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Información Personal
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">Teléfono</div>
                    <div className="text-sm text-slate-700 font-medium">No registrado</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">Ubicación</div>
                    <div className="text-sm text-slate-700 font-medium">Las Condes, RM</div>
                  </div>
                  <button className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                    + Editar Información
                  </button>
                </div>
              </div>

            </div>

            {/* MAIN CONTENT: Plan Trip + My Pets */}
            <div className="lg:col-span-8 space-y-8">

              {/* SECTION: Planear Próximo Viaje */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100px] -mr-16 -mt-16 z-0"></div>

                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Planear próximo viaje
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
                  {/* ... Inputs ... */}
                  {/* Fecha */}
                  <div className="md:col-span-5 flex flex-col h-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 h-4"> {/* Fixed height for alignment */}
                      Fechas del viaje
                    </label>
                    <DateRangeAirbnb className="w-full" value={rango} onChange={setRango} hideLabel />
                    <p className="mt-2 text-xs text-slate-400">Selecciona la fecha de inicio y fin de tu viaje.</p>
                  </div>

                  {/* Servicio */}
                  <div className="md:col-span-3 flex flex-col h-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 h-4"> {/* Fixed height for alignment */}
                      Tipo de Servicio
                    </label>
                    <div className="flex flex-col gap-2 flex-1">
                      <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${servicio === 'domicilio' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${servicio === 'domicilio' ? 'border-emerald-500 bg-white' : 'border-slate-300 bg-white'}`}>
                          {servicio === 'domicilio' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                        </div>
                        <input type="radio" name="servicio" value="domicilio" checked={servicio === 'domicilio'} onChange={(e) => setServicio(e.target.value)} className="hidden" />
                        <div className="flex items-center gap-2">
                          <Home size={18} />
                          <span className="text-sm">Domicilio</span>
                        </div>
                      </label>
                      <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${servicio === 'hospedaje' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${servicio === 'hospedaje' ? 'border-emerald-500 bg-white' : 'border-slate-300 bg-white'}`}>
                          {servicio === 'hospedaje' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                        </div>
                        <input type="radio" name="servicio" value="hospedaje" checked={servicio === 'hospedaje'} onChange={(e) => setServicio(e.target.value)} className="hidden" />
                        <div className="flex items-center gap-2">
                          <Hotel size={18} />
                          <span className="text-sm">Hospedaje</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="md:col-span-4 flex flex-col h-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 h-4"> {/* Fixed height for alignment */}
                      Mascotas
                    </label>
                    {hasPets ? (
                      <MyPetsSelector
                        myPets={myPets}
                        selectedIds={selectedPetIds}
                        onChange={(ids, counts) => {
                          setSelectedPetIds(ids);
                          setMascotas(counts);
                        }}
                        hideLabel
                      />
                    ) : (
                      <PetsSelectorAirbnb
                        value={mascotas}
                        onChange={setMascotas}
                        className="w-full"
                        hideLabel
                      />
                    )}
                    <p className="mt-2 text-xs text-slate-400">Selecciona quiénes viajan contigo (o se quedan en casa).</p>
                  </div>

                </div>

                <div className="mt-8 flex justify-end relative z-10">
                  <button
                    onClick={handleSaveTrip}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-slate-900/20 active:scale-95"
                  >
                    Crear Viaje <span className="text-slate-400 text-sm font-normal">({rango?.from ? format(rango.from, 'd MMM', { locale: es }) : '...'})</span> ✈️
                  </button>
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SECTION: Tu Próximo Viaje Summary */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">
                    Tu próximo viaje
                  </h3>
                  {clientProfile?.fecha_inicio ? (
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xl">
                          ✈️
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {format(new Date(clientProfile.fecha_inicio), "d MMM", { locale: es })} - {clientProfile.fecha_fin ? format(new Date(clientProfile.fecha_fin), "d MMM", { locale: es }) : ''}
                          </div>
                          <div className="text-xs text-emerald-700 font-medium">
                            {clientProfile.perros > 0 ? `${clientProfile.perros} Perros` : ''} {clientProfile.gatos > 0 ? `${clientProfile.gatos} Gatos` : ''}
                            {clientProfile.mascotas_viaje?.length > 0 && Array.isArray(myPets) ?
                              ` · ${myPets.filter(p => clientProfile.mascotas_viaje.includes(p.id)).map(p => p.nombre).join(", ")}`
                              : ''
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Link
                          href={buildSearchUrl()}
                          className="flex-1 text-center bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded-lg transition-colors"
                        >
                          Buscar Sitter
                        </Link>
                        <button
                          onClick={handleEditTrip}
                          className="px-3 py-2 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-sm font-bold rounded-lg transition-colors"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-slate-400 text-sm">Sin viajes planificados</p>
                      <p className="text-xs text-slate-300 mt-1">Usa el buscador para crear uno.</p>
                    </div>
                  )}
                </div>

                {/* Mis Mascotas */}
                <div className="rounded-2xl border bg-white p-5 shadow-sm flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-base font-semibold text-slate-900">Mis Mascotas</h2>
                    <button onClick={handleAdd} className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded hover:bg-emerald-100 transition-colors">+ Agregar</button>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] pr-1">
                    {loadingPets ? (
                      <p className="text-xs text-slate-400">Cargando...</p>
                    ) : myPets.length > 0 ? (
                      myPets.map(pet => (
                        <PetCard key={pet.id} pet={pet} onEdit={handleEdit} />
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <span className="text-2xl block mb-2">🐾</span>
                        <p className="text-xs text-slate-500">Agrega a tus peludos aquí.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Empty History / Others */}
              <section className="rounded-2xl border bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">Historial y Favoritos</h2>
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Aún no tienes historial. Tus reservas pasadas aparecerán aquí.
                </div>
              </section>

            </div>

          </div>{/* End Main Grid */}
        </div>
      </main>

      {/* Modal de Mascotas */}
      {userId && (
        <PetFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={handleSaved}
          initialData={editingPet}
          userId={userId}
        />
      )}
      {/* Lightbox para Foto de Perfil */}
      {clientProfile?.foto_perfil && (
        <ImageLightbox
          src={clientProfile.foto_perfil}
          alt="Foto de perfil"
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}

      <ModalAlert
        isOpen={alertConfig.isOpen}
        onClose={closeAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </>
  );
}
