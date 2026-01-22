-- Migration: Server-Side Notification Triggers
-- Date: 2026-01-22

-- 1. Generic Notification Function (or specific per trigger)
CREATE OR REPLACE FUNCTION handle_new_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    sender_name text;
    sender_avatar text;
    recipient_id uuid;
BEGIN
    -- Identify the recipient (the other participant in the conversation)
    -- We need to fetch the conversation to find the other user
    -- However, message table has sender_id, but not recipient_id directly.
    -- We can fetch recipient from conversation participants or we can assume chat logic.
    -- Better: The message sender is NEW.sender_id. The conversation has client_id and sitter_id.
    
    SELECT 
        CASE 
            WHEN c.client_id = NEW.sender_id THEN c.sitter_id 
            ELSE c.client_id 
        END INTO recipient_id
    FROM conversations c
    WHERE c.id = NEW.conversation_id;

    -- Fetch Sender Details for the notification
    SELECT nombre, foto_perfil INTO sender_name, sender_avatar
    FROM registro_petmate
    WHERE auth_user_id = NEW.sender_id;

    -- Insert Notification
    -- We use the `notifications` table structure
    -- type: 'message'
    INSERT INTO notifications (user_id, type, title, message, link, metadata, created_at, read)
    VALUES (
        recipient_id,
        'message',
        'Mensaje de ' || COALESCE(sender_name, 'Usuario'),
        substring(NEW.content from 1 for 50),
        '/mensajes?id=' || NEW.conversation_id,
        jsonb_build_object('conversationId', NEW.conversation_id, 'senderId', NEW.sender_id),
        NOW(),
        false
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Messages
DROP TRIGGER IF EXISTS on_new_message_notify ON messages;
CREATE TRIGGER on_new_message_notify
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION handle_new_message_notification();


-- 2. New Booking Request (Postulacion Created)
CREATE OR REPLACE FUNCTION handle_new_application_notification()
RETURNS TRIGGER AS $$
DECLARE
    client_name text;
    trip_service text;
BEGIN
    -- Postulacion is created by Client (usually) linking to a Sitter
    -- recipient = NEW.sitter_id
    -- sender = auth.uid() (but trigger runs as generic, we can get client from 'viajes' link or 'origen')
    
    -- If created by client (solicitud_cliente), notify sitter.
    -- If created by sitter (postulacion_sitter), notify client? 
    -- Let's handle 'solicitud_cliente' (Direct Request)
    
    IF NEW.origen = 'solicitud_cliente' THEN
        -- Link to trip to get service type
        SELECT servicio INTO trip_service FROM viajes WHERE id = NEW.viaje_id;
        
        -- Get Client Name (Owner of the trip)
        SELECT nombre INTO client_name
        FROM registro_petmate
        WHERE auth_user_id = (SELECT user_id FROM viajes WHERE id = NEW.viaje_id);

        INSERT INTO notifications (user_id, type, title, message, link, metadata, created_at, read)
        VALUES (
            NEW.sitter_id, -- Recipient (Sitter)
            'request',
            'Nueva Solicitud de Reserva',
            COALESCE(client_name, 'Un usuario') || ' te ha enviado una solicitud para ' || COALESCE(trip_service, 'servicio'),
            '/sitter?tab=solicitudes', -- Or deep link
            jsonb_build_object('applicationId', NEW.id, 'tripId', NEW.viaje_id),
            NOW(),
            false
        );
    END IF;

    -- If 'postulacion_sitter' (Sitter applying to a public trip), notify Client
    IF NEW.origen = 'postualcion_sitter' OR NEW.origen = 'postulacion_sitter' THEN
       -- Notify Client
       -- (Implementation pending detailed Logic, skipping for MVP unless requested, focusing on BookingModal flow which is 'solicitud_cliente')
       NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_application_notify ON postulaciones;
CREATE TRIGGER on_new_application_notify
AFTER INSERT ON postulaciones
FOR EACH ROW
EXECUTE FUNCTION handle_new_application_notification();


-- 3. Review Submitted (Notify Sitter or Admin?)
-- Notify Admin maybe? Or Sitter "You have a new pending review"
CREATE OR REPLACE FUNCTION handle_new_review_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify Sitter that a review is pending?
    INSERT INTO notifications (user_id, type, title, message, link, metadata, created_at, read)
    VALUES (
        NEW.sitter_id::uuid, -- Assuming sitter_id is uuid or text, cast if needed
        'opportunity', -- Or 'system'
        'Nueva Reseña Recibida',
        'Has recibido una nueva reseña. Estará visible una vez que sea moderada.',
        '/sitter',
        jsonb_build_object('reviewId', NEW.id),
        NOW(),
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_review_notify ON reviews;
CREATE TRIGGER on_new_review_notify
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION handle_new_review_notification();

-- 4. Block Direct Inserts to Notifications (Optional but recommended by prompt)
-- We can revoke insert from anon/authenticated, or Update RLS Policy to False.
-- DO NOT RUN REVOKE IF using 'send_notification' RPC which is SECURITY DEFINER.
-- If 'send_notification' is used, it bypasses RLS.
-- If we keep RLS as 'false' for inserts, direct client inserts fail.
-- Let's Ensure RLS policy for INSERT is FALSE or dropped.

DROP POLICY IF EXISTS "Users can create their own notifications" ON notifications;
-- Create a policy that effectively denies insert for public (if we rely on Triggers/RPC)
-- or just don't have an insert policy.
-- If no INSERT policy exists and RLS is enabled, inserts are blocked.
