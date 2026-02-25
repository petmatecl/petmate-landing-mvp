import * as React from 'react';

interface Props {
    nombre: string;
    motivo_rechazo: string;
}

export const RechazoProveedorEmail: React.FC<Readonly<Props>> = ({
    nombre,
    motivo_rechazo
}) => (
    <div style={{ fontFamily: 'sans-serif', color: '#1A202C' }}>
        <h1 style={{ color: '#E53E3E' }}>Sobre tu solicitud en Pawnecta</h1>
        <p>Hola {nombre},</p>
        <p>
            Hemos revisado tu solicitud para ofrecer servicios como proveedor en Pawnecta y,
            lamentablemente, en esta ocasión <strong>no ha sido aprobada</strong>.
        </p>

        <div style={{ backgroundColor: '#FFF5F5', borderLeft: '4px solid #F56565', padding: '16px', margin: '20px 0' }}>
            <strong>Motivo:</strong>
            <p style={{ margin: '8px 0 0 0' }}>{motivo_rechazo}</p>
        </div>

        <p>
            Si crees que esto es un error o si puedes subsanar el motivo indicado, te invitamos a
            responder a este correo con la información adicional necesaria.
        </p>

        <p>Atentamente,</p>
        <p>El equipo de verificación de Pawnecta.</p>
    </div>
);

export default RechazoProveedorEmail;
