/**
 * Mapea errores de Supabase/Backend a mensajes amigables para el usuario.
 */
export function mapError(error: any): string {
    if (!error) return "Ocurrió un error desconocido.";

    const msg = (error.message || "").toLowerCase();
    const code = error.code || "";

    // Auth
    if (msg.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
    if (msg.includes("email not confirmed")) return "Debes confirmar tu correo electrónico antes de iniciar sesión.";
    if (msg.includes("user not found")) return "Usuario no encontrado.";
    if (msg.includes("password should be at least")) return "La contraseña debe tener al menos 6 caracteres.";

    // DB Constraints
    if (code === "23505") return "Ya existe un registro con estos datos (ej. correo o RUT duplicado).";
    if (code === "23503") return "Operación inválida: referencia a dato inexistente.";
    if (code === "42501") return "No tienes permisos para realizar esta acción.";

    // Custom App Errors
    if (msg.includes("profile incomplete")) return "Debes completar tu perfil para continuar.";
    if (msg.includes("role mismatch")) return "No tienes el perfil necesario para esta acción.";

    // Fallback
    return error.message || "Error inesperado. Intenta nuevamente.";
}
