
const fs = require('fs');

const filename = 'c:/Aldo/PetMate/petmate-landing-mvp/pages/sitter.tsx';
// Placeholder lines in current file are likely 669-671.
// 669: <div ... placeholder ...>
// 670: <h2>...</h2>
// 671: </div>

const startLine = 669; // 1-based
const endLine = 671;   // 1-based

const content = fs.readFileSync(filename, 'utf-8');
const lines = content.split('\n');

const startIdx = startLine - 1;
const endIdx = endLine;

console.log(`Replacing lines ${startLine} to ${endLine}`);
if (lines.length > startIdx) {
    console.log("First line to remove:", lines[startIdx].trim());
}
if (lines.length >= endIdx) {
    console.log("Last line to remove:", lines[endIdx - 1].trim());
}

// Sidebar Content (Reconstructed from Step 2279)
// Note: Escaping quotes and backticks in the string literal.
const sidebarCode = `                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden group hover:shadow-2xl hover:shadow-emerald-900/10 transition-all duration-300">
                                {/* Header con gradiente premium */}
                                <div className="h-32 bg-gradient-to-br from-emerald-600 to-teal-800 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                </div>
                                
                                <div className="px-6 pb-6 text-center -mt-16 relative">
                                    <div className="relative w-32 h-32 mx-auto mb-4">
                                        <div
                                            className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white cursor-pointer group-avatar"
                                            onClick={() => setIsLightboxOpen(true)}
                                        >
                                            {profileData.foto_perfil ? (
                                                <Image
                                                    src={profileData.foto_perfil}
                                                    alt="Foto perfil"
                                                    fill
                                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full bg-slate-50 text-slate-300">
                                                    <User size={48} strokeWidth={1.5} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Botón Editar (Lápiz) Flotante */}
                                        <label className="absolute bottom-1 right-1 p-2 bg-white/90 backdrop-blur-sm border border-slate-100 rounded-full shadow-lg cursor-pointer hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition-all z-10 hover:scale-110 active:scale-95">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoUpload}
                                                disabled={uploading}
                                            />
                                            {uploading ? (
                                                <Loader2 className="animate-spin w-4 h-4" />
                                            ) : (
                                                <Edit2 size={16} />
                                            )}
                                        </label>
                                    </div>

                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">{displayName}</h2>
                                    <p className="text-sm text-slate-500 font-medium">{email}</p>

                                    {/* Estado de Verificación Premium */}
                                    <div className="mt-6 flex items-center justify-center gap-2">
                                        <div className={\`
                                            px-4 py-2 rounded-xl border flex items-center gap-2 text-sm font-semibold transition-colors
                                            \${profileData.aprobado
                                                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                                : profileData.certificado_antecedentes
                                                    ? "bg-amber-50 border-amber-100 text-amber-700"
                                                    : "bg-slate-50 border-slate-100 text-slate-600"
                                            }
                                        \`}>
                                            {profileData.aprobado ? (
                                                <> <ShieldCheck size={18} /> <span>Verificado</span> </>
                                            ) : profileData.certificado_antecedentes ? (
                                                <> <Clock size={18} /> <span>En Revisión</span> </>
                                            ) : (
                                                <> <ShieldAlert size={18} /> <span>No Verificado</span> </>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <p className="mt-3 text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                                        {profileData.aprobado
                                            ? "Perfil activo y visible para clientes."
                                            : profileData.certificado_antecedentes
                                                ? "Validando documentos..."
                                                : "Sube tu certificado para activar."}
                                    </p>

                                </div>

                                {/* Stats & Documents Section */}
                                <div className="bg-slate-50/50 border-t border-slate-100 p-6 space-y-6">
                                    
                                    {/* Reviews Stats */}
                                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                                <Star size={18} fill="currentColor" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Valoración</p>
                                                <p className="text-sm font-bold text-slate-900 flex items-center gap-1">
                                                    {averageRating.toFixed(1)} <span className="text-slate-400 font-normal">({reviews.length})</span>
                                                </p>
                                            </div>
                                        </div>
                                        <Link href="/sitter/reviews" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
                                            Ver todas
                                        </Link>
                                    </div>

                                    {/* Documentos */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <FileCheck size={14} className="text-slate-400" /> Documentación
                                        </h4>
                                        {profileData.certificado_antecedentes ? (
                                            <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm group/file hover:border-emerald-200 transition-colors">
                                                <div className="p-2.5 bg-slate-100 text-slate-500 rounded-lg group-hover/file:bg-emerald-50 group-hover/file:text-emerald-600 transition-colors">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-700 truncate">Antecedentes.pdf</p>
                                                    <div className="flex gap-3 mt-1.5">
                                                        <button 
                                                            onClick={() => handleViewDocument(profileData.certificado_antecedentes)}
                                                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                                        >
                                                            <Eye size={10} /> Ver
                                                        </button>
                                                        <button 
                                                            onClick={handleDeleteDocument}
                                                            disabled={uploading}
                                                            className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                                                        >
                                                           {uploading ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />} Eliminar
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-emerald-500">
                                                    <CheckCircle2 size={16} />
                                                </div>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-400 hover:bg-emerald-50/30 cursor-pointer transition-all group/upload">
                                                <div className="p-3 bg-slate-100 text-slate-400 rounded-full group-hover/upload:bg-emerald-100 group-hover/upload:text-emerald-600 transition-colors">
                                                    <Upload size={20} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-bold text-slate-700 group-hover/upload:text-emerald-700">Subir Certificado</p>
                                                    <p className="text-[10px] text-slate-400">PDF o Imagen</p>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    className="hidden"
                                                    onChange={handleCertUpload}
                                                    disabled={uploading}
                                                />
                                            </label>
                                        )}
                                    </div>

                                    {/* Galería */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                             <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                <ImagePlus size={14} className="text-slate-400" /> Galería
                                            </h4>
                                            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                                                {profileData.galeria.length}/6
                                            </span>
                                        </div>
                                       
                                        <div className="grid grid-cols-3 gap-2">
                                            {(profileData.galeria as string[]).map((photo, index) => (
                                                <div
                                                    key={index}
                                                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group/photo shadow-sm hover:shadow-md transition-all"
                                                    onClick={() => setSelectedImage(photo)}
                                                >
                                                    <Image
                                                        src={photo}
                                                        alt={\`Foto \${index + 1}\`}
                                                        fill
                                                        className="object-cover transition-transform duration-500 group-hover/photo:scale-110"
                                                        unoptimized
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeletePhoto(index);
                                                            }}
                                                            className="p-1 bg-white/20 hover:bg-red-500 backdrop-blur-md rounded-full text-white transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {/* Add Button */}
                                            {profileData.galeria.length < 6 && (
                                                <label className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 text-slate-400 hover:text-emerald-600 transition-all">
                                                    <Plus size={24} />
                                                    <span className="text-[10px] font-bold">Añadir</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        className="hidden"
                                                        onChange={handleGalleryUpload}
                                                        disabled={uploading}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-2 sm:hidden text-center">
                                        <Link href={userId ? \`/sitter/\${userId}\` : '/explorar'} target="_blank" className="text-xs font-bold text-emerald-600 hover:underline">
                                           Ver perfil público ↗
                                        </Link>
                                    </div>

                                </div>
                            </div>`;

const finalLines = [...lines.slice(0, startIdx), sidebarCode, ...lines.slice(endIdx)];

fs.writeFileSync(filename, finalLines.join('\n'), 'utf-8');
console.log("Restoration done.");
