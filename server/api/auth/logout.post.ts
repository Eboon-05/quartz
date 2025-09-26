export default defineEventHandler(async (event) => {
    try {
        // Clear both session and legacy cookies
        deleteCookie(event, 'auth-session')
        deleteCookie(event, 'google_access_token')
        
        return {
            message: 'Logged out successfully',
            success: true
        }
    } catch (error) {
        console.error('Logout error:', error)
        
        throw createError({
            statusCode: 500,
            statusMessage: 'Error during logout'
        })
    }
})
