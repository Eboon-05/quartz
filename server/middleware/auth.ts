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
    const protectedRoutes = ['/api/auth/me', '/api/courses', '/api/student'];
    const url = getRequestURL(event);

    // Comprobamos si la ruta actual está en la lista de rutas protegidas.
    if (protectedRoutes.some(route => url.pathname.startsWith(route))) {
        const sessionCookie = getCookie(event, 'auth-session');

        if (!sessionCookie) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Unauthorized: No session found.',
            });
        }

        try {
            // Parse session data
            const sessionData = JSON.parse(sessionCookie);
            const { credentials, userInfo } = sessionData;

            if (!credentials?.access_token || !userInfo) {
                throw new Error('Invalid session data.');
            }

            // Set up OAuth2 client with stored credentials
            oauth2client.setCredentials(credentials);

            // Check if token is still valid by making a simple API call
            try {
                const oauth2 = google.oauth2({
                    auth: oauth2client,
                    version: 'v2'
                });
                
                // Verify token is still valid
                await oauth2.userinfo.get();
                
                // If we get here, token is valid
                event.context.user = userInfo;
                event.context.oauth2client = oauth2client;
                
            } catch (apiError) {
                // Token might be expired, attempt refresh if refresh_token exists
                if (credentials.refresh_token) {
                    try {
                        const { credentials: newCredentials } = await oauth2client.refreshAccessToken();
                        oauth2client.setCredentials(newCredentials);
                        
                        // Update session with new credentials
                        const updatedSession = {
                            ...sessionData,
                            credentials: newCredentials
                        };
                        
                        setCookie(event, 'auth-session', JSON.stringify(updatedSession), {
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'lax',
                            maxAge: 60 * 60 * 24 * 7, // 7 days
                        });
                        
                        // Set context with refreshed credentials
                        event.context.user = userInfo;
                        event.context.oauth2client = oauth2client;
                        
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                        
                        // Clear invalid session
                        deleteCookie(event, 'auth-session');
                        
                        throw createError({
                            statusCode: 401,
                            statusMessage: 'Session expired. Please re-authenticate.',
                        });
                    }
                } else {
                    throw new Error('No refresh token available.');
                }
            }

        } catch (error) {
            console.error('Authentication error:', error);
            
            // Clear invalid session
            deleteCookie(event, 'auth-session');
            
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid or expired session. Please re-authenticate.',
            });
        }
    }
});
