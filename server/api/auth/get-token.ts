import { google } from 'googleapis'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { googleClientSecret, public: { googleClientId } } = useRuntimeConfig(event)

    if (!body.code) {
        throw createError({
            statusCode: 400,
            statusMessage: 'No code provided'
        })
    }

    try {
        const oauth2client = new google.auth.OAuth2(
            googleClientId,
            googleClientSecret,
            'postmessage'
        );
        const { tokens } = await oauth2client.getToken(body.code);

        oauth2client.setCredentials(tokens);

        const oauth2 = google.oauth2({
            version: 'v2',
            auth: oauth2client,
        })
        const { data: userInfo } = await oauth2.userinfo.get();

        // Defensive check to ensure we have a user ID
        if (!userInfo || !userInfo.id) {
            throw createError({
                statusCode: 500,
                statusMessage: 'Failed to retrieve user ID from Google.',
            });
        }

        if (tokens.refresh_token) {
            const db = await getDB();

            await db.upsert('token', {
                id: userInfo.id,
                refresh_token: tokens.refresh_token,
                expiry_date: tokens.expiry_date,
            })
        }

        setCookie(event, 'google_access_token', tokens.access_token!, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
            sameSite: 'lax',
            maxAge: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 60 * 60, // Expira en 1 hora o lo que diga Google
        });

        return {
            user: userInfo,
        };
    } catch (error) {
        console.error("Error exchanging Google code:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to exchange code for tokens",
            data: {
                error
            }
        });
    }
})
