import Head from 'next/head';
import NotFoundContent from '../components/Shared/NotFoundContent';

export default function Custom404() {
    return (
        <>
            <Head>
                <title>Página no encontrada | Pawnecta</title>
            </Head>
            <NotFoundContent />
        </>
    );
}
