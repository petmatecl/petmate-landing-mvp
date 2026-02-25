import * as React from 'react';

interface Props {
    nombre: string;
}

export const AprobacionProveedorEmail: React.FC<Readonly<Props>> = ({
    nombre,
}) => (
    <div style={{ fontFamily: 'sans-serif', color: '#1A202C' }}>
        <h1 style={{ color: '#1A6B4A' }}>¡Bienvenido(a) a Pawnecta, {nombre}! 🐾</h1>
        <p>
            ¡Buenas noticias! Tu solicitud ha sido <strong>aprobada</strong> por nuestro equipo.
            Ya puedes empezar a publicar tus servicios de cuidado de mascotas y conectar con dueños en todo Chile.
        </p>
        <p>Para empezar, ingresa a tu panel de proveedor y haz clic en &quot;Publicar nuevo servicio&quot;.</p>
        <a
            href="https://pawnecta.com/proveedor"
            style={{
                display: 'inline-block',
                backgroundColor: '#1A6B4A',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 'bold',
                marginTop: '16px',
                marginBottom: '16px'
            }}
        >
            Ir a mi Panel de Proveedor
        </a>
        <p>Si tienes alguna duda, no dudes en responder a este correo.</p>
        <p>El equipo de Pawnecta.</p>
    </div>
);

export default AprobacionProveedorEmail;
