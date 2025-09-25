import { google } from 'googleapis';

// Este middleware se ejecutará en las rutas de la API que lo necesiten.
// Comprueba la existencia de un token de acceso en las cookies, lo verifica con Google
// y obtiene la información del usuario. La información del usuario se adjunta al contexto del evento
// para un fácil acceso en los endpoints de la API protegidos.

const config = useRuntimeConfig()

const oauth2client = new google.auth.OAuth2(
    config.public.googleClientId,
    config.googleClientSecret
);

export default defineEventHandler(async (event) => {
    // Definimos las rutas que queremos proteger.
    const protectedRoutes = ['/api/auth/me', '/api/courses'];
    const url = getRequestURL(event);

    // Comprobamos si la ruta actual está en la lista de rutas protegidas.
    if (protectedRoutes.some(route => url.pathname.startsWith(route))) {
        const accessToken = getCookie(event, 'google_access_token');

        if (!accessToken) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Unauthorized: No token provided.',
            });
        }

        try {
            // Establecemos las credenciales en el cliente de OAuth2.
            oauth2client.setCredentials({ access_token: accessToken });

            // Obtenemos la información del usuario usando el SDK de googleapis.
            const oauth2 = google.oauth2({
                auth: oauth2client,
                version: 'v2'
            });
            const { data: userInfo } = await oauth2.userinfo.get();

            if (!userInfo) {
                throw new Error('Failed to fetch user info.');
            }

            // Adjuntamos la información del usuario al contexto del evento.
            event.context.user = userInfo;

        } catch (error) {
            // Si el token es inválido (expirado o malicioso), Google devolverá un error.
            console.error('Invalid token:', error);
            throw createError({
                statusCode: 401,
                statusMessage: 'Unauthorized: Invalid token.',
            });
        }
    }
});
