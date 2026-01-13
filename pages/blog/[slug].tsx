import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { GetStaticProps, GetStaticPaths } from "next";
import { BLOG_POSTS, BlogPost } from "../../lib/blogData";
import { Calendar, Clock, User, ChevronLeft, Share2, ArrowRight } from "lucide-react";

interface Props {
    post: BlogPost;
    relatedPosts: BlogPost[];
}

import { Check } from "lucide-react";
import { useState } from "react";

const ShareButton = ({ title, text }: { title: string, text: string }) => {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        const url = window.location.href;

        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    text,
                    url
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            // Fallback to clipboard
            try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    };

    return (
        <button
            onClick={handleShare}
            className={`flex items-center gap-2 transition-all duration-300 ${copied ? "text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full" : "hover:text-emerald-600"
                }`}
            title="Compartir"
        >
            {copied ? (
                <>
                    <Check size={18} />
                    <span className="font-medium">¡Link copiado!</span>
                </>
            ) : (
                <Share2 size={20} />
            )}
        </button>
    );
};

export default function BlogPostPage({ post, relatedPosts }: Props) {
    if (!post) return null;

    return (
        <div className="bg-slate-50 min-h-screen pb-20 pt-24 font-sans text-slate-600 antialiased">
            <Head>
                <title>{post.title} — Blog Pawnecta</title>
                <meta name="description" content={post.excerpt} />

                {/* OG Tags */}
                <meta property="og:title" content={post.title} />
                <meta property="og:description" content={post.excerpt} />
                <meta property="og:image" content={post.coverImage} />
                <meta property="og:type" content="article" />
            </Head>

            <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                {/* Back Link */}
                <div className="mb-8">
                    <Link href="/blog" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors">
                        <ChevronLeft size={16} className="mr-1" /> Volver al Blog
                    </Link>
                </div>

                {/* Article Card - Paper Style */}
                <article className="bg-white rounded-3xl p-8 md:p-14 shadow-sm border-2 border-slate-300 overflow-hidden mb-16">

                    {/* Header */}
                    <header className="mb-10 text-center md:text-left border-b border-slate-300 pb-10">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-6">
                            {post.tags.map(tag => (
                                <span key={tag} className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 uppercase tracking-wide">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight tracking-tight">
                            {post.title}
                        </h1>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm text-slate-500 font-medium">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                    <User size={16} />
                                </div>
                                <span className="text-slate-900">{post.author}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Calendar size={16} className="text-slate-400" />
                                <span>{post.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock size={16} className="text-slate-400" />
                                <span>{post.readTime}</span>
                            </div>
                        </div>
                    </header>

                    {/* Featured Image */}
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-12 shadow-sm border-2 border-slate-300">
                        <Image
                            src={post.coverImage}
                            alt={post.title}
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>

                    {/* Content */}
                    <div
                        className="prose prose-slate prose-lg max-w-none 
                        prose-headings:text-slate-900 prose-headings:font-bold prose-headings:tracking-tight
                        prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-lg
                        prose-a:text-emerald-600 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-slate-800 prose-strong:font-bold
                        prose-li:text-slate-600 prose-li:marker:text-emerald-500
                        prose-blockquote:border-l-4 prose-blockquote:border-emerald-200 prose-blockquote:bg-emerald-50/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-slate-700
                        prose-img:rounded-2xl prose-img:shadow-sm"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />

                    {/* Share / Footer of Article */}
                    <div className="mt-16 pt-8 border-t border-slate-300 flex items-center justify-between text-slate-400 text-sm">
                        <span>Compartir este artículo</span>
                        <div className="flex gap-4">
                            <ShareButton title={post.title} text={post.excerpt} />
                        </div>
                    </div>
                </article>

                {/* Related Articles Section */}
                {relatedPosts.length > 0 && (
                    <section className="border-t border-slate-300 pt-16 mt-16">
                        <h2 className="text-2xl font-bold text-slate-900 mb-8">Te podría interesar</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {relatedPosts.map((relatedPost) => (
                                <Link href={`/blog/${relatedPost.slug}`} key={relatedPost.id} className="group">
                                    <article className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border-2 border-slate-300 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300">
                                        {/* Image */}
                                        <div className="relative h-48 overflow-hidden">
                                            <Image
                                                src={relatedPost.coverImage}
                                                alt={relatedPost.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 flex flex-col flex-grow">
                                            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                                                {relatedPost.title}
                                            </h3>
                                            <p className="text-slate-500 text-sm line-clamp-2 mb-4">
                                                {relatedPost.excerpt}
                                            </p>
                                            <div className="mt-auto flex items-center text-emerald-600 font-bold text-xs uppercase tracking-wide">
                                                Leer más <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </article>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

export const getStaticPaths: GetStaticPaths = async () => {
    const paths = BLOG_POSTS.map((post) => ({
        params: { slug: post.slug },
    }));

    return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
    const post = BLOG_POSTS.find((p) => p.slug === params?.slug);

    if (!post) {
        return {
            notFound: true,
        };
    }

    // Find related posts (exclude current post)
    const relatedPosts = BLOG_POSTS
        .filter(p => p.id !== post.id)
        .slice(0, 3);

    return {
        props: {
            post,
            relatedPosts
        },
    };
};
