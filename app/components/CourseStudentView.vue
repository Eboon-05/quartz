<script setup lang="ts">
import type { CourseDetailsResponse } from '../../shared/types/courseDetailsResponse'
import type { DBCell, DBUser } from '../../shared/types/db'
import { useGlobalLoading } from '~/composables/useGlobalLoading'

const props = defineProps<{
    courseDetails: CourseDetailsResponse
    courseId: string
}>()

const user = useUser()
const toast = useToast()
const { showLoading, hideLoading } = useGlobalLoading()

// Funcionalidad de sincronización
const isSyncing = ref(false)

async function syncCourse() {
    if (isSyncing.value) return
    
    isSyncing.value = true
    showLoading('Sincronizando con Google Classroom...')
    
    try {
        const result = await $fetch(`/api/courses/${props.courseId}/sync`, {
            method: 'POST',
        })
        
        toast.add({
            title: 'Sincronización exitosa',
            description: `${result.syncedTeachers} profesores y ${result.syncedStudents} estudiantes sincronizados.`,
            color: 'success',
            icon: 'i-heroicons-check-circle',
        })
        
        // Refrescar datos después de la sincronización
        await refreshCookie(`student-assignments-${props.courseId}`)
        await navigateTo(`/courses/${props.courseId}`, { replace: true })
        
    } catch (error) {
        if (typeof error === 'object' && error !== null && ('data' in error || 'statusMessage' in error)) {
            const fetchError = error as { data?: { message?: string }, statusMessage?: string }
            toast.add({
                title: 'Error de sincronización',
                description: fetchError.data?.message || fetchError.statusMessage || 'Error desconocido.',
                color: 'error',
                icon: 'i-heroicons-exclamation-triangle',
            })
        } else {
            toast.add({
                title: 'Error inesperado',
                description: 'Ocurrió un error inesperado durante la sincronización.',
                color: 'error',
                icon: 'i-heroicons-exclamation-triangle',
            })
        }
    } finally {
        isSyncing.value = false
        hideLoading()
    }
}

// Obtener asignaciones del estudiante para este curso
const { data: assignmentsData, pending: _assignmentsPending } = await useFetch<{
    assignments: Array<{
        id: string
        title: string
        dueDate: string
        status: 'pending' | 'in_progress' | 'completed' | 'overdue'
        description: string
        grade?: number
    }>
}>(`/api/courses/${props.courseId}/assignments`, {
    key: `student-assignments-${props.courseId}`,
})

const assignments = computed(() => assignmentsData.value?.assignments || [])

// Stats calculadas
const stats = computed(() => ({
    totalAssignments: assignments.value.length,
    completedAssignments: assignments.value.filter(a => a.status === 'completed').length,
    pendingAssignments: assignments.value.filter(a => a.status === 'pending').length,
    averageGrade: assignments.value
        .filter(a => a.grade)
        .reduce((acc, a) => acc + a.grade!, 0) / assignments.value.filter(a => a.grade).length || 0,
}))

// Computed properties
const upcomingAssignments = computed(() => 
    assignments.value
        .filter(a => a.status === 'pending')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 3)
)

const recentGrades = computed(() =>
    assignments.value
        .filter(a => a.status === 'completed' && a.grade)
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
        .slice(0, 3)
)


const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
        return `${Math.ceil(diffInHours)} horas`
    }
    return `${Math.ceil(diffInHours / 24)} días`
}

// Buscar mi célula
const myCell = computed(() => {
    if (!user.value?.id) return null
    const userId = user.value.id
    return props.courseDetails.cells.find((cell: DBCell) => 
        cell.students?.some((student: DBUser) => student.id.toString().includes(userId))
    )
})

// Buscar mis compañeros de célula
const cellmates = computed(() => {
    if (!myCell.value) return []
    return myCell.value.students?.filter((student: DBUser) => 
        student.id.toString() !== user.value?.id
    ) || []
})
</script>

<template>
    <div class="space-y-6">
        <!-- Loading State -->
        <div v-if="_assignmentsPending" class="flex justify-center py-16">
            <div class="text-center">
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
                <p class="text-gray-600 dark:text-gray-300">Cargando información del curso...</p>
            </div>
        </div>

        <!-- Content -->
        <div v-else>
            <!-- Header del estudiante -->
        <div class="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        ¡Hola, {{ user?.given_name }}! 👋
                    </h2>
                    <p class="text-gray-600 dark:text-gray-300">
                        Bienvenido a <span class="font-semibold">{{ courseDetails.course.name }}</span>
                    </p>
                </div>
                <div class="flex items-center space-x-3">
                    <UButton
                        :label="isSyncing ? 'Sincronizando...' : 'Sincronizar'"
                        :icon="isSyncing ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-path'"
                        :loading="isSyncing"
                        :disabled="isSyncing"
                        color="primary"
                        variant="outline"
                        size="sm"
                        @click="syncCourse"
                    />
                    <UAvatar 
                        :src="user?.picture || ''" 
                        :alt="user?.name || 'Usuario'" 
                        size="xl" 
                    />
                </div>
            </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <UCard>
                <div class="flex items-center space-x-3">
                    <div class="p-2 bg-info-100 dark:bg-info-900 rounded-lg">
                        <UIcon name="i-heroicons-clipboard-document-list" class="w-6 h-6 text-info-600" />
                    </div>
                    <div>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.totalAssignments }}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Tareas Totales</p>
                    </div>
                </div>
            </UCard>

            <UCard>
                <div class="flex items-center space-x-3">
                    <div class="p-2 bg-success-100 dark:bg-success-900 rounded-lg">
                        <UIcon name="i-heroicons-check-circle" class="w-6 h-6 text-success-600" />
                    </div>
                    <div>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.completedAssignments }}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Completadas</p>
                    </div>
                </div>
            </UCard>

            <UCard>
                <div class="flex items-center space-x-3">
                    <div class="p-2 bg-warning-100 dark:bg-warning-900 rounded-lg">
                        <UIcon name="i-heroicons-clock" class="w-6 h-6 text-warning-600" />
                    </div>
                    <div>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.pendingAssignments }}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Pendientes</p>
                    </div>
                </div>
            </UCard>

            <UCard>
                <div class="flex items-center space-x-3">
                    <div class="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
                        <UIcon name="i-heroicons-star" class="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.averageGrade.toFixed(1) }}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Promedio</p>
                    </div>
                </div>
            </UCard>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Contenido principal -->
            <div class="lg:col-span-2 space-y-6">
                <!-- Próximas Tareas -->
                <UCard>
                    <template #header>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <UIcon name="i-heroicons-clock" class="w-5 h-5 text-warning-500" />
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                                    Próximas Tareas
                                </h3>
                            </div>
                            <UBadge :label="upcomingAssignments.length.toString()" color="warning" />
                        </div>
                    </template>

                    <div class="space-y-4">
                        <div 
                            v-for="assignment in upcomingAssignments" 
                            :key="assignment.id"
                            class="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div class="flex-1">
                                <div class="flex items-center space-x-2 mb-1">
                                    <h4 class="font-medium text-gray-900 dark:text-white">
                                        {{ assignment.title }}
                                    </h4>
                                </div>
                                <p class="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                    {{ assignment.description }}
                                </p>
                                <div class="flex items-center space-x-1 text-xs text-gray-500">
                                    <UIcon name="i-heroicons-calendar" class="w-3 h-3" />
                                    <span>Vence en {{ formatTimeAgo(assignment.dueDate) }}</span>
                                </div>
                            </div>
                            <UButton size="xs" icon="i-heroicons-arrow-right" variant="ghost" />
                        </div>

                        <div v-if="upcomingAssignments.length === 0" class="text-center py-8">
                            <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-success-400 mx-auto mb-4" />
                            <p class="text-gray-500 dark:text-gray-400">
                                ¡Excelente! No tienes tareas pendientes
                            </p>
                        </div>
                    </div>
                </UCard>

                <!-- Información del Curso -->
                <UCard>
                    <template #header>
                        <div class="flex items-center space-x-2">
                            <UIcon name="i-heroicons-academic-cap" class="w-5 h-5 text-primary-500" />
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                                Información del Curso
                            </h3>
                        </div>
                    </template>

                    <div class="space-y-4">
                        <div class="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div>
                                <h4 class="font-medium text-gray-900 dark:text-white mb-1">
                                    {{ courseDetails.course.name }}
                                </h4>
                                <div class="text-sm text-gray-500 space-y-1">
                                    <p>{{ courseDetails.teachers.length }} profesores</p>
                                    <p>{{ courseDetails.students.length }} estudiantes</p>
                                    <p>{{ courseDetails.cells.length }} células</p>
                                </div>
                            </div>
                            <UButton size="sm" variant="ghost" icon="i-heroicons-arrow-top-right-on-square">
                                Ver detalles
                            </UButton>
                        </div>
                    </div>
                </UCard>
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">
                <!-- Mi Célula -->
                <UCard>
                    <template #header>
                        <div class="flex items-center space-x-2">
                            <UIcon name="i-heroicons-users" class="w-5 h-5 text-success-500" />
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                                Mi Célula
                            </h3>
                        </div>
                    </template>

                    <div v-if="myCell" class="text-center">
                        <div class="p-4 bg-success-50 dark:bg-success-900/20 rounded-lg mb-4">
                            <UIcon name="i-heroicons-user-group" class="w-8 h-8 text-success-600 mx-auto mb-2" />
                            <h4 class="font-medium text-gray-900 dark:text-white mb-2">
                                {{ myCell.name }}
                            </h4>
                            <p class="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                {{ myCell.students?.length || 0 }} miembros
                            </p>
                        </div>
                        
                        <div v-if="cellmates.length > 0" class="space-y-2">
                            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Compañeros:</p>
                            <div class="flex flex-wrap gap-2">
                                <div v-for="cellmate in cellmates" :key="cellmate.id.toString()" class="flex items-center space-x-2">
                                    <UAvatar :src="cellmate.photoUrl" :alt="cellmate.name" size="xs" />
                                    <span class="text-xs text-gray-600 dark:text-gray-400">{{ cellmate.name }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div v-else class="text-center py-6">
                        <UIcon name="i-heroicons-user-plus" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p class="text-gray-500 dark:text-gray-400 text-sm">
                            Aún no estás asignado a una célula
                        </p>
                    </div>
                </UCard>

                <!-- Calificaciones Recientes -->
                <UCard>
                    <template #header>
                        <div class="flex items-center space-x-2">
                            <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-warning-500" />
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                                Calificaciones Recientes
                            </h3>
                        </div>
                    </template>

                    <div class="space-y-3">
                        <div 
                            v-for="assignment in recentGrades" 
                            :key="assignment.id"
                            class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                            <div class="flex-1">
                                <p class="font-medium text-gray-900 dark:text-white text-sm">
                                    {{ assignment.title }}
                                </p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    {{ formatDate(assignment.dueDate) }}
                                </p>
                            </div>
                            <UBadge 
                                :label="assignment.grade!.toString()" 
                                color="success"
                                size="sm"
                            />
                        </div>

                        <div v-if="recentGrades.length === 0" class="text-center py-4">
                            <UIcon name="i-heroicons-clipboard-document-list" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                                No hay calificaciones aún
                            </p>
                        </div>
                    </div>
                </UCard>

                <!-- Mis Profesores -->
                <UCard>
                    <template #header>
                        <div class="flex items-center space-x-2">
                            <UIcon name="i-heroicons-user-group" class="w-5 h-5 text-primary-500" />
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                                Mis Profesores
                            </h3>
                        </div>
                    </template>

                    <div class="space-y-3">
                        <div 
                            v-for="teacher in courseDetails.teachers" 
                            :key="teacher.id.toString()"
                            class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <UAvatar :src="teacher.photoUrl" :alt="teacher.name" size="sm" />
                            <div class="flex-1">
                                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ teacher.name }}</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">{{ teacher.email }}</p>
                            </div>
                        </div>
                    </div>
                </UCard>
            </div>
        </div>
        </div>
    </div>
</template>

<style scoped>
/* Animaciones suaves para transiciones */
.transition-colors {
    transition: background-color 0.2s ease-in-out;
}
</style>
