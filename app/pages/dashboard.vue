<script setup lang="ts">
import { useGlobalLoading } from '~/composables/useGlobalLoading'

const user = useUser()
const { showLoading, hideLoading } = useGlobalLoading()

interface Course {
    classroom: {
        id: string
        name: string
        section?: string
        descriptionHeading?: string
        alternateLink?: string
        courseState?: string
    }
    db: Record<string, unknown> | null
    role: 'teacher' | 'student'
}

interface CoursesResponse {
    courses: Course[]
}

const { data, pending, error, refresh } = useFetch<CoursesResponse>('/api/courses', {
    lazy: true,
})

const courses = computed(() => data.value?.courses ?? [])

async function startCourse(courseId: string) {
    try {
        showLoading('Clonando curso...')
        await $fetch('/api/courses/start', {
            method: 'POST',
            body: { courseId },
        })
        await refresh()
    } catch (error) {
        console.error('Error starting course:', error)
    } finally {
        hideLoading()
    }
}
</script>

<template>
    <div class="p-4 sm:p-6 lg:p-8">
        <h1 class="text-2xl font-bold mb-4">
            Dashboard
        </h1>
        <p v-if="user">
            Hello, {{ user.name }}
        </p>
        <p v-else>
            Loading user...
        </p>

        <hr class="my-6 border-gray-200 dark:border-gray-800">

        <h2 class="text-xl font-semibold mb-4">
            Your Courses
        </h2>

        <div v-if="pending">
            <p>Loading courses...</p>
        </div>

        <div v-else-if="error">
            <UAlert
                icon="i-heroicons-exclamation-triangle"
                color="error"
                variant="soft"
                title="Error fetching courses"
                :description="error.statusMessage || 'An unexpected error occurred.'"
            />
        </div>

                <template v-else-if="data">
            <div v-if="courses.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <UCard v-for="course in courses" :key="course.classroom.id" class="hover:shadow-lg transition-shadow duration-300">
                    <template #header>
                        <div class="flex justify-between items-start">
                            <h3 class="font-semibold truncate flex-1" :title="course.classroom.name">
                                {{ course.classroom.name }}
                            </h3>
                            <UBadge 
                                :label="course.role === 'teacher' ? 'Profesor' : 'Estudiante'"
                                :color="course.role === 'teacher' ? 'primary' : 'info'"
                                size="xs"
                                class="ml-2"
                            />
                        </div>
                    </template>

                    <div class="space-y-3">
                        <p class="text-sm text-gray-600 dark:text-gray-300">
                            {{ course.classroom.descriptionHeading }}
                        </p>
                        
                        <div class="flex items-center justify-between">
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                {{ course.classroom.section }}
                            </p>
                            <div v-if="course.db" class="flex items-center space-x-1">
                                <UIcon name="i-heroicons-check-circle" class="w-3 h-3 text-success-500" />
                                <span class="text-xs text-success-600 dark:text-success-400">Configurado</span>
                            </div>
                            <div v-else class="flex items-center space-x-1">
                                <UIcon name="i-heroicons-exclamation-circle" class="w-3 h-3 text-warning-500" />
                                <span class="text-xs text-warning-600 dark:text-warning-400">Sin configurar</span>
                            </div>
                        </div>
                    </div>

                    <template #footer>
                        <div class="flex space-x-2">
                            <UButton
                                v-if="!course.db"
                                :label="course.role === 'student' ? 'Unirse' : 'Configurar'"
                                :icon="course.role === 'student' ? 'i-heroicons-user-plus' : 'i-heroicons-cog-6-tooth'"
                                block
                                @click="startCourse(course.classroom.id)"
                            />
                            <NuxtLink v-else :to="`/courses/${course.classroom.id}`" class="flex-1">
                                <UButton
                                    :label="course.role === 'student' ? 'Ver Curso' : 'Gestionar'"
                                    :icon="course.role === 'student' ? 'i-heroicons-eye' : 'i-heroicons-cog-6-tooth'"
                                    color="primary"
                                    variant="soft"
                                    block
                                />
                            </NuxtLink>
                        </div>
                    </template>
                </UCard>
            </div>
            <div v-else class="text-center py-12">
                <UIcon name="i-heroicons-academic-cap" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No hay cursos disponibles
                </h3>
                <p class="text-gray-500 dark:text-gray-400">
                    No tienes cursos activos en este momento. Los cursos aparecerán aquí cuando sean sincronizados desde Google Classroom.
                </p>
            </div>
        </template>
    </div>
</template>