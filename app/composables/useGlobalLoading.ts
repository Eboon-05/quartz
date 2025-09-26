interface LoadingState {
    visible: boolean
    message: string
}

const globalLoadingState = ref<LoadingState>({
    visible: false,
    message: 'Cargando...'
})

export const useGlobalLoading = () => {
    const showLoading = (message: string = 'Cargando...') => {
        globalLoadingState.value = {
            visible: true,
            message
        }
    }

    const hideLoading = () => {
        globalLoadingState.value.visible = false
    }

    const setLoadingMessage = (message: string) => {
        globalLoadingState.value.message = message
    }

    const isLoading = computed(() => globalLoadingState.value.visible)

    return {
        showLoading,
        hideLoading,
        setLoadingMessage,
        isLoading,
        loadingState: readonly(globalLoadingState)
    }
}
