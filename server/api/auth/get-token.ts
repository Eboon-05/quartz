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

        // Store refresh token in database for future use
        if (tokens.refresh_token) {
            const db = await getDB();

            await db.upsert('token', {
                id: userInfo.id,
                refresh_token: tokens.refresh_token,
                expiry_date: tokens.expiry_date,
            })
        }

        // Create session data with all necessary information
        const sessionData = {
            credentials: tokens,
            userInfo: userInfo,
            created_at: new Date().toISOString()
        };

        // Set session cookie with all auth data
        setCookie(event, 'auth-session', JSON.stringify(sessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days (much longer than access token)
        });

        // Also set legacy cookie for backward compatibility (temporary)
        setCookie(event, 'google_access_token', tokens.access_token!, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 60 * 60,
        });

        return {
            user: userInfo,
            session_created: true,
            token_expires: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
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
