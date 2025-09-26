<script setup lang="ts">
import type { oauth2_v2 } from 'googleapis'
import {
    useCodeClient,
    type ImplicitFlowSuccessResponse,
    type ImplicitFlowErrorResponse,
} from 'vue3-google-signin'
import { useUser } from '~/composables/useUser'

const user = useUser()

// Si ya está autenticado, redirigir al dashboard
watchEffect(() => {
    if (user.value) {
        navigateTo('/dashboard')
    }
})

const handleOnSuccess = async (response: ImplicitFlowSuccessResponse) => {
    try {
        const data = await $fetch<{ user: oauth2_v2.Schema$Userinfo | null }>('/api/auth/get-token', {
            method: 'POST',
            body: {
                code: response.code,
            },
        })

        if (data.user) {
            user.value = data.user
            navigateTo('/dashboard')
        }
    } catch (error) {
        console.error('Error during login:', error)
    }
}

const handleOnError = (errorResponse: ImplicitFlowErrorResponse) => {
    console.log('Error: ', errorResponse)
}

const { isReady, login } = useCodeClient({
    onSuccess: handleOnSuccess,
    onError: handleOnError,
    scope: [
        'https://www.googleapis.com/auth/classroom.courses',
        'https://www.googleapis.com/auth/classroom.rosters',
        'https://www.googleapis.com/auth/classroom.coursework.students',
        'https://www.googleapis.com/auth/classroom.profile.emails',
        'https://www.googleapis.com/auth/classroom.profile.photos',
    ],
})

const features = [
    {
        icon: 'i-heroicons-academic-cap',
        title: 'Gestión de Cursos',
        description: 'Sincroniza automáticamente con Google Classroom y organiza tus cursos de manera inteligente.',
    },
    {
        icon: 'i-heroicons-users',
        title: 'Células de Aprendizaje',
        description: 'Crea y gestiona células de estudiantes para un aprendizaje más personalizado.',
    },
    {
        icon: 'i-heroicons-chart-bar',
        title: 'Análisis Detallado',
        description: 'Obtén reportes completos del rendimiento académico de tus estudiantes.',
    },
    {
        icon: 'i-heroicons-lightning-bolt',
        title: 'Sincronización Instantánea',
        description: 'Mantén toda la información actualizada en tiempo real con Google Classroom.',
    },
    {
        icon: 'i-heroicons-shield-check',
        title: 'Seguro y Confiable',
        description: 'Integración segura con OAuth2 y almacenamiento encriptado de datos.',
    },
    {
        icon: 'i-heroicons-sparkles',
        title: 'Interfaz Moderna',
        description: 'Diseño intuitivo y responsive que se adapta a cualquier dispositivo.',
    },
]

const testimonials = [
    {
        name: 'María González',
        role: 'Profesora de Matemáticas',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
        quote: 'Quartz ha transformado la manera en que gestiono mis cursos. La sincronización con Classroom es perfecta.',
    },
    {
        name: 'Carlos Rodríguez',
        role: 'Coordinador Académico',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        quote: 'Los reportes detallados me permiten tomar decisiones informadas sobre el rendimiento estudiantil.',
    },
    {
        name: 'Ana Martínez',
        role: 'Profesora de Ciencias',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
        quote: 'La gestión de células ha mejorado significativamente la participación de mis estudiantes.',
    },
]

const stats = [
    { number: '500+', label: 'Profesores Activos' },
    { number: '15,000+', label: 'Estudiantes Gestionados' },
    { number: '1,200+', label: 'Cursos Sincronizados' },
    { number: '99.9%', label: 'Tiempo de Actividad' },
]
</script>

<template>
    <div class="min-h-screen">
        <!-- Header/Navigation -->
        <header class="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 dark:bg-gray-900/80 dark:border-gray-800">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16">
                    <div class="flex items-center space-x-2">
                        <UIcon name="i-heroicons-cube-transparent" class="w-8 h-8 text-primary-500" />
                        <span class="text-xl font-bold text-gray-900 dark:text-white">Quartz</span>
                    </div>
                    <div class="flex items-center space-x-4">
                        <UButton 
                            :disabled="!isReady" 
                            size="lg"
                            icon="i-heroicons-arrow-right-on-rectangle"
                            @click="login"
                        >
                            Iniciar Sesión
                        </UButton>
                    </div>
                </div>
            </div>
        </header>

        <!-- Hero Section -->
        <section class="relative overflow-hidden bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
                <div class="text-center max-w-4xl mx-auto">
                    <UBadge color="primary" variant="subtle" size="lg" class="mb-6">
                        <UIcon name="i-heroicons-sparkles" class="w-4 h-4 mr-2" />
                        El futuro de la educación digital
                    </UBadge>
                    
                    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                        <span class="text-primary-600">Quartz</span>
                        <br>
                        El dashboard de
                        <span class="bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
                            Semillero Digital
                        </span>
                    </h1>
                    
                    <p class="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                        Transforma la gestión educativa con nuestra plataforma integral. Sincroniza con Google Classroom, 
                        gestiona células de aprendizaje y obtén insights poderosos sobre el rendimiento estudiantil.
                    </p>
                    
                    <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <UButton 
                            :disabled="!isReady" 
                            size="xl"
                            icon="i-heroicons-rocket-launch"
                            class="shadow-lg"
                            @click="login"
                        >
                            Comenzar Ahora
                        </UButton>
                        <UButton 
                            variant="ghost" 
                            size="xl"
                            icon="i-heroicons-play-circle"
                            color="neutral"
                        >
                            Ver Demo
                        </UButton>
                    </div>
                </div>
            </div>
            
            <!-- Background decoration -->
            <div class="absolute inset-0 -z-10">
                <div class="absolute top-0 -left-4 w-72 h-72 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
                <div class="absolute top-0 -right-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
                <div class="absolute -bottom-8 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
            </div>
        </section>

        <!-- Stats Section -->
        <section class="py-16 bg-white dark:bg-gray-900">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    <div v-for="stat in stats" :key="stat.label" class="text-center">
                        <div class="text-3xl lg:text-4xl font-bold text-primary-600 mb-2">{{ stat.number }}</div>
                        <div class="text-gray-600 dark:text-gray-300">{{ stat.label }}</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Features Section -->
        <section class="py-24 bg-gray-50 dark:bg-gray-800">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-16">
                    <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Características Poderosas
                    </h2>
                    <p class="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Todo lo que necesitas para revolucionar tu experiencia educativa en una sola plataforma.
                    </p>
                </div>
                
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <UCard v-for="feature in features" :key="feature.title" class="hover:shadow-lg transition-shadow duration-300">
                        <template #header>
                            <div class="flex items-center space-x-3">
                                <div class="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
                                    <UIcon :name="feature.icon" class="w-6 h-6 text-primary-600" />
                                </div>
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ feature.title }}</h3>
                            </div>
                        </template>
                        
                        <p class="text-gray-600 dark:text-gray-300">{{ feature.description }}</p>
                    </UCard>
                </div>
            </div>
        </section>

        <!-- Testimonials Section -->
        <section class="py-24 bg-white dark:bg-gray-900">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-16">
                    <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Lo que dicen nuestros usuarios
                    </h2>
                    <p class="text-xl text-gray-600 dark:text-gray-300">
                        Educadores de todo el mundo confían en Quartz
                    </p>
                </div>
                
                <div class="grid md:grid-cols-3 gap-8">
                    <UCard v-for="testimonial in testimonials" :key="testimonial.name" class="text-center">
                        <div class="mb-6">
                            <UAvatar 
                                :src="testimonial.avatar" 
                                :alt="testimonial.name" 
                                size="xl" 
                                class="mx-auto mb-4"
                            />
                            <blockquote class="text-gray-600 dark:text-gray-300 italic mb-4">
                                "{{ testimonial.quote }}"
                            </blockquote>
                            <h4 class="font-semibold text-gray-900 dark:text-white">{{ testimonial.name }}</h4>
                            <p class="text-sm text-gray-500 dark:text-gray-400">{{ testimonial.role }}</p>
                        </div>
                    </UCard>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="py-24 bg-gradient-to-r from-primary-600 to-blue-600">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 class="text-3xl lg:text-4xl font-bold text-white mb-4">
                    ¿Listo para transformar tu educación?
                </h2>
                <p class="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                    Únete a cientos de educadores que ya están usando Quartz para mejorar su gestión académica.
                </p>
                <UButton 
                    :disabled="!isReady" 
                    size="xl"
                    variant="solid"
                    icon="i-heroicons-arrow-right"
                    class="shadow-lg bg-white text-primary-600 hover:bg-gray-50"
                    @click="login"
                >
                    Comenzar Gratis
                </UButton>
            </div>
        </section>

        <!-- Footer -->
        <footer class="bg-gray-900 text-white py-12">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col md:flex-row justify-between items-center">
                    <div class="flex items-center space-x-2 mb-4 md:mb-0">
                        <UIcon name="i-heroicons-cube-transparent" class="w-8 h-8 text-primary-400" />
                        <span class="text-xl font-bold">Quartz</span>
                    </div>
                    <div class="text-gray-400 text-center md:text-right">
                        <p>&copy; 2025 Quartz - Semillero Digital. Todos los derechos reservados.</p>
                        <p class="text-sm mt-1">Transformando la educación, un curso a la vez.</p>
                    </div>
                </div>
            </div>
        </footer>
    </div>
</template>

<style scoped>
@keyframes blob {
    0% {
        transform: translate(0px, 0px) scale(1);
    }
    33% {
        transform: translate(30px, -50px) scale(1.1);
    }
    66% {
        transform: translate(-20px, 20px) scale(0.9);
    }
    100% {
        transform: translate(0px, 0px) scale(1);
    }
}

.animate-blob {
    animation: blob 7s infinite;
}

.animation-delay-2000 {
    animation-delay: 2s;
}

.animation-delay-4000 {
    animation-delay: 4s;
}
</style>
