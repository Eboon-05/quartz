interface LoadingState {
    visible: boolean
    message: string
}

// Use globalThis to ensure state persists across the entire app
const getGlobalState = () => {
    if (typeof globalThis !== 'undefined') {
        if (!globalThis.__nuxt_global_loading_state) {
            globalThis.__nuxt_global_loading_state = reactive<LoadingState>({
                visible: false,
                message: 'Cargando...'
            })
        }
        return globalThis.__nuxt_global_loading_state
    }
    
    // Fallback for SSR
    return reactive<LoadingState>({
        visible: false,
        message: 'Cargando...'
    })
}

export function useGlobalLoading() {
    const globalLoadingState = getGlobalState()

    const showLoading = (message: string = 'Cargando...') => {
        globalLoadingState.visible = true
        globalLoadingState.message = message
    }

    const hideLoading = () => {
        globalLoadingState.visible = false
    }

    const setLoadingMessage = (message: string) => {
        globalLoadingState.message = message
    }

    const isLoading = computed(() => globalLoadingState.visible)

    return {
        showLoading,
        hideLoading,
        setLoadingMessage,
        isLoading,
        loadingState: readonly(globalLoadingState)
    }
}

// Export as default as well for better compatibility
export default useGlobalLoading

// Extend globalThis type for TypeScript
declare global {
    var __nuxt_global_loading_state: LoadingState | undefined
}
