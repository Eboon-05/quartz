// This endpoint is protected by the server/middleware/auth.ts middleware.
// The middleware verifies the access token and attaches the user info to event.context.user.
// All this endpoint needs to do is return that user information.

export default defineEventHandler((event) => {
    // The user object is attached to the context by our auth middleware.
    // If the middleware failed (e.g., no token or invalid token),
    // it would have thrown an error, and this code would not be reached.
    return {
        user: event.context.user,
    };
});
