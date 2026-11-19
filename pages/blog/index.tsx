import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { BLOG_POSTS } from "../../lib/blogData";
import { Calendar, Clock, ArrowRight,
    Sun, ThermometerSun, Cat, ClipboardList, Heart, Home as HomeIcon, Hotel, Footprints, Store, Dog, FileText, Book } from "lucide-react";

// Sprint blog-img-fix (2026-11-19) — placeholder gris con ícono Lucide
// cuando coverImage es vacío. Mapeo compartido con blog/[slug].tsx.
const COVER_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" }>> = {
    Sun, ThermometerSun, Cat, ClipboardList, Heart, Home: HomeIcon, Hotel, Footprints, Store, Dog, FileText, Book,
};

export default function BlogIndex() {
    return (
        <div className="min-h-screen bg-white">
            <Head>
                <title>Blog Pawnecta - Consejos para el cuidado de tu mascota</title>
                <meta name="description" content="Descubre consejos, guías y noticias sobre el cuidado de perros y gatos en el Blog de Pawnecta Chile." />
            </Head>

            <div className="pt-24 pb-20">
                {/* Hero Section */}
                <div className="bg-slate-50 py-16 mb-16 border-b border-slate-300">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-accent-100 text-accent-800 font-medium uppercase tracking-widest text-xs mb-4">
                            Blog Pawnecta
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                            Aprende a cuidar mejor <br />
                            <span className="text-accent-700">a tu mejor amigo</span>
                        </h1>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Consejos expertos, guías de salud y todo lo que necesitas saber para la felicidad de tus mascotas.
                        </p>
                    </div>
                </div>


                {/* Grid */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {BLOG_POSTS.map((post) => (
                            <Link href={`/blog/${post.slug}`} key={post.id} className="group">
                                <article className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border-2 border-slate-300 shadow-sm hover:shadow-md hover:shadow-accent-900/5 transition-all duration-300">
                                    {/* Image — sprint blog-img-fix: placeholder gris si coverImage vacío */}
                                    <div className="relative h-64 overflow-hidden">
                                        {post.coverImage ? (
                                            <Image
                                                src={post.coverImage}
                                                alt={post.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (() => {
                                            const Icon = post.coverIcon && COVER_ICONS[post.coverIcon] ? COVER_ICONS[post.coverIcon] : FileText;
                                            return (
                                                <div className="w-full h-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                                    <Icon size={80} aria-hidden="true" />
                                                </div>
                                            );
                                        })()}
                                        <div className="absolute top-4 left-4 flex gap-2">
                                            {post.tags.map(tag => (
                                                <span key={tag} className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-slate-700 shadow-sm">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 flex flex-col flex-grow">
                                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-3 font-medium">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                <span>{post.date}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock size={14} />
                                                <span>{post.readTime}</span>
                                            </div>
                                        </div>

                                        <h2 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-accent-600 transition-colors line-clamp-2">
                                            {post.title}
                                        </h2>
                                        <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-3">
                                            {post.excerpt}
                                        </p>

                                        <div className="mt-auto flex items-center text-accent-700 font-medium text-sm">
                                            Leer artículo <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </article>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div >
    );
}
