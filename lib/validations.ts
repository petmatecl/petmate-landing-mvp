import { z } from 'zod';

const email = z.string().email().max(254);
const uuid = z.string().uuid();

export const notifyProviderSchema = z.object({
  email: email.optional(),
  auth_user_id: uuid.optional(),
  nombre: z.string().min(1).max(100),
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

export const pushSubscribeSchema = z.object({
  userId: z.string().min(1),
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

export const newMessageSchema = z.object({
  recipientAuthId: uuid,
  senderName: z.string().min(1).max(100),
  messagePreview: z.string().max(300).optional(),
  chatUrl: z.string().max(500).optional(),
});

export const waitlistSchema = z.object({
  email: email,
  comuna: z.string().max(100).optional(),
  categoria: z.string().max(100).optional(),
  rol: z.string().max(20).optional(),
});

export const autoModerarSchema = z.object({
  evaluacionId: z.string().min(1),
  servicioId: z.string().min(1),
  clienteId: z.string().min(1),
  rating: z.number().min(1).max(5),
  comentario: z.string().min(1).max(1000),
});

export const evaluacionNotifySchema = z.object({
  proveedorId: z.string().min(1),
  servicioTitulo: z.string().min(1).max(200),
  rating: z.number().min(1).max(5),
  comentario: z.string().min(1).max(1000),
  isFirst: z.boolean().optional(),
});

export const logConsentSchema = z.object({
  documentVersion: z.string().min(1).max(50),
});
