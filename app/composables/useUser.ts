// This composable will provide a global, reactive state for the user's information.
// By using useState, Nuxt ensures that this state is preserved during navigation
// and can be shared across all components and pages.
import type { oauth2_v2 } from "googleapis"

export const useUser = () => useState<oauth2_v2.Schema$Userinfo | null>('user', () => null)
