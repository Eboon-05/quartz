import type { oauth2_v2 } from 'googleapis'

export default defineNuxtPlugin(async () => {
    const user = useUser()

    // If the user state is already populated (e.g., from SSR), do nothing.
    if (user.value) {
        return
    }

    try {
        // Fetch the user information from our /api/auth/me endpoint.
        const data = await $fetch<{ user: oauth2_v2.Schema$Userinfo }>('/api/auth/me', {
            retry: 0, // Do not retry on 401 errors
        })

        // If the fetch is successful, update the user state.
        if (data.user) {
            user.value = data.user
        }
    } catch {
        // If the fetch fails (e.g., 401 Unauthorized), the user is not logged in.
        // The user state will remain null, which is the correct behavior.
        user.value = null
    }
})
