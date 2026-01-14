import Head from "next/head";
import { Card } from "../components/Shared/Card";
import { Section } from "../components/Shared/Section";

export default function StyleGuide() {
    return (
        <>
            <Head>
                <title>Pawnecta UI Style Guide</title>
                <meta name="robots" content="noindex" />
            </Head>

            <div className="bg-slate-50 min-h-screen pb-24">
                <header className="bg-slate-900 text-white py-12 px-8">
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-4xl font-bold font-outfit">UI Style Guide & Surface System</h1>
                        <p className="mt-4 text-emerald-400 font-mono text-sm">
                            Definitive Source of Truth for High Contrast Standards
                        </p>
                    </div>
                </header>

                <main>
                    {/* SECTION 1: SURFACES */}
                    <Section variant="default">
                        <h2 className="text-2xl font-bold mb-8">1. Surfaces & Cards (On Slate-100)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Card Basic */}
                            <div className="space-y-2">
                                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Default Card</span>
                                <Card>
                                    <h3 className="text-lg font-bold">Standard Card</h3>
                                    <p className="text-slate-600 mt-2">
                                        Bg: White<br />
                                        Border: 2px Solid (Variable)<br />
                                        Shadow: SM + Ring
                                    </p>
                                </Card>
                            </div>

                            {/* Card Hoverable */}
                            <div className="space-y-2">
                                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Hoverable Card</span>
                                <Card hoverable onClick={() => alert("Clicked!")}>
                                    <h3 className="text-lg font-bold text-emerald-700">Hover Me</h3>
                                    <p className="text-slate-600 mt-2">
                                        Transform: -y-1<br />
                                        Border: Emerald-500<br />
                                        Cursor: Pointer
                                    </p>
                                </Card>
                            </div>

                            {/* Card Padding Variants */}
                            <div className="space-y-4">
                                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Padding Variants</span>
                                <Card padding="s"><p>Small (p-4)</p></Card>
                                <Card padding="m"><p>Medium (p-6)</p></Card>
                                <Card padding="l"><p>Large (p-8)</p></Card>
                            </div>
                        </div>
                    </Section>

                    {/* SECTION 2: SECTION VARIANTS */}
                    <div className="border-t-4 border-emerald-500 relative">
                        <span className="absolute top-0 right-0 bg-emerald-500 text-white text-xs px-2 py-1 font-bold">SECTION BOUNDARY</span>
                    </div>

                    <Section variant="white">
                        <h2 className="text-2xl font-bold mb-4">2. Section Variant: White</h2>
                        <p className="mb-8 text-slate-600">Used for highlighting or hero sections. Must contrast with neighbors.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Card>
                                <h3 className="font-bold">Card on White</h3>
                                <p>Border is CRITICAL here.</p>
                            </Card>
                            <div className="p-6 border-2 border-dashed border-slate-300 rounded-lg">
                                <p className="text-center text-slate-400">Content without Card (Should not happen for boxed content)</p>
                            </div>
                        </div>
                    </Section>

                    <Section variant="alt">
                        <h2 className="text-2xl font-bold mb-4">3. Section Variant: Alt (Slate-2xx)</h2>
                        <p className="mb-8 text-slate-600">Used for secondary content blocks to create separation.</p>
                        <Card>
                            <h3 className="font-bold">Card on Alt</h3>
                            <p>Excellent natural contrast.</p>
                        </Card>
                    </Section>

                    <Section variant="dark">
                        <h2 className="text-2xl font-bold text-white mb-4">4. Section Variant: Dark</h2>
                        <p className="mb-8 text-slate-400">High impact sections.</p>
                        <Card>
                            <h3 className="font-bold">Card on Dark</h3>
                            <p>Maximum pop.</p>
                        </Card>
                    </Section>
                </main>
            </div>
        </>
    );
}
