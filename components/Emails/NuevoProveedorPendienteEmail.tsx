import * as React from 'react';

/**
 * Sprint Ola-1 A3 (2026-08-14) — email al admin cuando entra una solicitud
 * nueva de alta de proveedor. Motivación: hallazgo del PO 2026-08-11 de 8
 * solicitudes acumuladas 6 semanas sin respuesta por ausencia de mecanismo
 * de notificación. Ver BACKLOG.md > PEDIDOS DIRECTOS DEL PO.
 *
 * Destino: `contacto@pawnecta.com` (Zoho operativo desde cierre email 08-11).
 * Trigger: fire-and-forget desde /api/auth/signup post-INSERT exitoso con
 * rol=proveedor. Si el envío falla, no bloquea el flow del proveedor.
 */
interface Props {
    proveedorNombre: string;
    proveedorEmail: string;
    proveedorRut?: string | null;
    comuna?: string | null;
    fechaSolicitud: string; // ISO
}

export const NuevoProveedorPendienteEmail = ({
    proveedorNombre,
    proveedorEmail,
    proveedorRut,
    comuna,
    fechaSolicitud,
}: Readonly<Props>): React.ReactElement => (
    <div style={{ fontFamily: 'sans-serif', color: '#1A202C', maxWidth: '560px', margin: '0 auto', padding: '20px' }}>
        <h1 style={{ color: '#0F5A3E', fontSize: '20px', margin: '0 0 16px' }}>
            Nueva solicitud de proveedor pendiente
        </h1>
        <p style={{ margin: '0 0 20px', color: '#4A5568' }}>
            Un proveedor completó su registro y espera revisión de su cuenta.
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0 0 24px' }}>
            <tbody>
                <tr>
                    <td style={{ padding: '8px 0', color: '#718096', fontSize: '13px', width: '120px' }}>Nombre</td>
                    <td style={{ padding: '8px 0', color: '#1A202C', fontWeight: 600 }}>{proveedorNombre}</td>
                </tr>
                <tr>
                    <td style={{ padding: '8px 0', color: '#718096', fontSize: '13px', borderTop: '1px solid #E2E8F0' }}>Email</td>
                    <td style={{ padding: '8px 0', color: '#1A202C', borderTop: '1px solid #E2E8F0' }}>{proveedorEmail}</td>
                </tr>
                {proveedorRut && (
                    <tr>
                        <td style={{ padding: '8px 0', color: '#718096', fontSize: '13px', borderTop: '1px solid #E2E8F0' }}>RUT</td>
                        <td style={{ padding: '8px 0', color: '#1A202C', fontFamily: 'monospace', borderTop: '1px solid #E2E8F0' }}>{proveedorRut}</td>
                    </tr>
                )}
                {comuna && (
                    <tr>
                        <td style={{ padding: '8px 0', color: '#718096', fontSize: '13px', borderTop: '1px solid #E2E8F0' }}>Comuna</td>
                        <td style={{ padding: '8px 0', color: '#1A202C', borderTop: '1px solid #E2E8F0' }}>{comuna}</td>
                    </tr>
                )}
                <tr>
                    <td style={{ padding: '8px 0', color: '#718096', fontSize: '13px', borderTop: '1px solid #E2E8F0' }}>Fecha</td>
                    <td style={{ padding: '8px 0', color: '#1A202C', borderTop: '1px solid #E2E8F0' }}>
                        {new Date(fechaSolicitud).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                </tr>
            </tbody>
        </table>

        <a
            href="https://www.pawnecta.com/admin?tab=aprobaciones"
            style={{
                display: 'inline-block',
                backgroundColor: '#0F5A3E',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
            }}
        >
            Revisar en el panel de admin
        </a>

        <p style={{ margin: '32px 0 0', color: '#718096', fontSize: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
            Este aviso se envía automáticamente cada vez que entra una solicitud nueva de proveedor.
            Un proveedor esperando aprobación demasiado tiempo es un aviso de marketing perdido — apunta
            a responder dentro de 24-48h.
        </p>
    </div>
);

export default NuevoProveedorPendienteEmail;
