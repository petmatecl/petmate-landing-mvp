import { z } from 'zod';

const email = z.string().email().max(254);
const uuid = z.string().uuid();

// Migrado a verifySession + id-only payload (sweep 1bc1897 / Sprint
// agendamiento Sprint 3 pattern). El server resuelve email/nombre desde
// `proveedores` por proveedorId.
export const notifyProviderSchema = z.object({
  proveedorId: uuid,
  estado: z.enum(['aprobado', 'rechazado']),
  motivo: z.string().max(500).optional(),
});

export const welcomeSchema = z.object({
  userId: z.string().optional(),
  email: email,
  nombre: z.string().min(1).max(100),
  rol: z.enum(['usuario', 'proveedor']),
  confirmationUrl: z.string().url().optional().nullable(),
});

export const loginSchema = z.object({
  email: email,
  role: z.enum(['client', 'caretaker', 'admin']),
});

export const pushSendSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).max(200),
  message: z.string().max(500).optional(),
  url: z.string().max(500).optional(),
});

// `userId` se removio del schema — el endpoint deriva el user de la
// session (verifySession) y NO consume el campo del payload. Schema
// previo lo exigia pero el handler lo ignoraba, contrato confuso.
// Cualquier caller existente que mande `userId` extra: ignorado por
// Zod (passthrough false default), sin error.
export const pushSubscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});

export const notificationCreateSchema = z.object({
  userId: uuid,
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(500),
  link: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Migrado a id-only — el server resuelve recipient, sender_name y content
// desde `messages` + `conversations` por messageId. Defensa contra payloads
// manipulados (nadie puede fabricar el contenido del email).
export const newMessageSchema = z.object({
  messageId: uuid,
});

export const waitlistSchema = z.object({
  email: email,
  comuna: z.string().max(100).optional(),
  categoria: z.string().max(100).optional(),
  rol: z.string().max(20).optional(),
});

// Migrado a id-only. Server resuelve cliente_id/servicio_id/rating/comentario
// desde `evaluaciones` por evaluacionId. Authz: caller === evaluacion.usuario_id.
export const autoModerarSchema = z.object({
  evaluacionId: uuid,
});

// Migrado a id-only. Server resuelve proveedor/servicio/rating/comentario
// desde `evaluaciones` por evaluacionId, e infiere `isFirst` con count
// server-side cuando el caller es admin (no se acepta del cliente).
// Authz OR: caller === evaluacion.usuario_id  ||  isAdmin(caller).
export const evaluacionNotifySchema = z.object({
  evaluacionId: uuid,
});

export const logConsentSchema = z.object({
  documentVersion: z.string().min(1).max(50),
});

// Sprint 3 agendamiento — payloads de los dos endpoints de notificacion.
// Ambos reciben solo el agendamientoId; el server resuelve todo lo demas
// (joins a usuarios_buscadores, proveedores, servicios_publicados) para
// que el cliente no pueda fabricar datos del email.
export const agendamientoNotifySchema = z.object({
  agendamientoId: uuid,
});
