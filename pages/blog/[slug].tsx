import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { GetStaticProps, GetStaticPaths } from "next";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { BLOG_POSTS, BlogPost } from "../../lib/blogData";
import { Calendar, Clock, User, ChevronLeft, Share2 } from "lucide-react";

interface Props {
    post: BlogPost;
}

export default function BlogPostPage({ post }: Props) {
    if (!post) return null;

    return (
        <div className="min-h-screen bg-white">
            <Head>
                <title>{post.title} — Blog Pawnecta</title>
                <meta name="description" content={post.excerpt} />

                {/* OG Tags */}
                <meta property="og:title" content={post.title} />
                <meta property="og:description" content={post.excerpt} />
                <meta property="og:image" content={post.coverImage} />
                <meta property="og:type" content="article" />
            </Head>

            <main className="pt-24 pb-20">
                {/* Article Header */}
                <article className="max-w-3xl mx-auto px-4 sm:px-6">
                    <Link href="/blog" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-emerald-600 mb-8 transition-colors">
                        <ChevronLeft size={16} className="mr-1" /> Volver al Blog
                    </Link>

                    <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
                        {post.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 mb-8 border-b border-slate-100 pb-8">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                                <User size={16} />
                            </div>
                            <span className="font-medium text-slate-900">{post.author}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Calendar size={16} />
                            <span>{post.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock size={16} />
                            <span>{post.readTime}</span>
                        </div>
                    </div>

                    {/* Featured Image */}
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-10 shadow-lg">
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
                        className="prose prose-slate prose-lg md:prose-xl max-w-none 
                        prose-headings:text-slate-900 prose-headings:font-bold
                        prose-p:text-slate-600 prose-p:leading-relaxed
                        prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-slate-800
                        prose-li:text-slate-600
                        prose-img:rounded-xl"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />

                    {/* Tags & Share */}
                    <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex gap-2">
                            {post.tags.map(tag => (
                                <span key={tag} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </article>
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

    return {
        props: {
            post,
        },
    };
};
