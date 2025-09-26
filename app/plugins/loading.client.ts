export default defineNuxtPlugin(() => {
    const { showLoading, hideLoading } = useGlobalLoading()
    
    // Intercept $fetch calls to show loading for long operations
    const originalFetch = $fetch
    
    // @ts-expect-error - Override global $fetch
    globalThis.$fetch = async (...args: Parameters<typeof $fetch>) => {
        const [url] = args
        
        // Show loading for specific endpoints that might take time
        const showLoadingForUrl = (url: string | URL | Request) => {
            const urlString = url.toString()
            return (
                urlString.includes('/api/courses/start') ||
                urlString.includes('/api/courses/') && urlString.includes('/sync') ||
                urlString.includes('/api/auth/')
            )
        }
        
        let loadingTimer: NodeJS.Timeout | null = null
        
        try {
            if (showLoadingForUrl(url)) {
                // Delay showing loading by 200ms to avoid flashing for quick requests
                loadingTimer = setTimeout(() => {
                    if (url.toString().includes('/sync')) {
                        showLoading('Sincronizando datos...')
                    } else if (url.toString().includes('/start')) {
                        showLoading('Iniciando curso...')
                    } else {
                        showLoading('Procesando...')
                    }
                }, 200)
            }
            
            const result = await originalFetch(...args)
            return result
        } finally {
            if (loadingTimer) {
                clearTimeout(loadingTimer)
            }
            hideLoading()
        }
    }
})
