<script setup lang='ts'>
import type { DBCourse } from '../../../shared/types/db'
import type { CourseDetailsResponse } from '../../../shared/types/courseDetailsResponse'
import { RecordId } from 'surrealdb'
import { useGlobalLoading } from '~/composables/useGlobalLoading'

const route = useRoute()
const user = useUser()
const courseId = computed(() => route.params.id as string)

// Fetch the full course details from our new endpoint
const { data: courseDetails, pending: pendingDetails, error: detailsError } = useFetch<CourseDetailsResponse>(`/api/courses/${courseId.value}/details`, {
    key: `course-details-${courseId.value}`,
})

const dbCourse = computed<DBCourse | null>(() => courseDetails.value?.course ?? null)



const _isOwner = computed(() => {
    if (!courseDetails.value?.owner || !user.value?.id) return false
    const userId = new RecordId('user', user.value.id)
    // SurrealDB RecordId needs to be compared by its string representation
    return courseDetails.value.owner.id.toString() === userId.toString()
})

const isTeacher = computed(() => courseDetails.value?.isTeacher ?? false)
const isCoord = computed(() => courseDetails.value?.isCoord ?? false)
const isStudent = computed(() => courseDetails.value?.isStudent ?? false)

const tabs = computed(() => [
    {
        slot: 'cell',
        label: 'Célula',
        disabled: !isTeacher.value,
    },
    {
        slot: 'students',
        label: 'Alumnos',
    },
    {
        slot: 'teachers',
        label: 'Profesores',
    },
    {
        slot: 'stats',
        label: 'Estadísticas',
    },
])

const defaultTab = computed(() => {
    if (isCoord.value) return 'stats'
    if (isTeacher.value) return 'cell'
    return 'students' // Default for others, though they might not have roles yet
})

// No longer needed - all teachers from Classroom are automatically teachers in the app

const isSyncing = ref(false)
const toast = useToast()
const { showLoading, hideLoading } = useGlobalLoading()

async function syncCourse() {
    if (!dbCourse.value || isSyncing.value) return
    
    isSyncing.value = true
    showLoading('Sincronizando con Google Classroom...')
    
    try {
        const result = await $fetch(`/api/courses/${dbCourse.value.id}/sync`, {
            method: 'POST',
        })
        
        toast.add({
            title: 'Sincronización exitosa',
            description: `${result.syncedTeachers} profesores y ${result.syncedStudents} estudiantes sincronizados.`,
            color: 'success',
            icon: 'i-heroicons-check-circle',
        })
        
        // Refresh course details after successful sync
        await refreshCookie(`course-details-${courseId.value}`)
        window.location.reload()
        
    } catch (error) {
        // Type guard to check if the error looks like a FetchError
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
            console.error(error)
        }
    } finally {
        isSyncing.value = false
        hideLoading()
    }
}
</script>

<template>
    <div class='p-4 sm:p-6 lg:p-8'>
        <div v-if="pendingDetails" class="text-gray-500">Loading course details...</div>
        <div v-else-if="detailsError" class="text-red-500">
            <p>Error loading course: {{ detailsError.statusMessage }}</p>
            <NuxtLink to="/dashboard" class="text-blue-500 hover:underline">Return to Dashboard</NuxtLink>
        </div>

        <!-- Show the course management content -->
        <div v-else-if="courseDetails">
            <!-- Vista del Estudiante -->
            <div v-if="isStudent && !isTeacher && !isCoord">
                <CourseStudentView :course-details="courseDetails" :course-id="courseId" />
            </div>
            
            <!-- Vista del Profesor/Coordinador (interfaz original con tabs) -->
            <div v-else>
                <div class='mb-6'>
                    <div class="flex justify-between items-center">
                        <h1 class='text-2xl font-bold'>
                            {{ dbCourse?.name }}
                        </h1>
                        <div class="flex items-center space-x-2">
                            <UButton
                                v-if="isTeacher || isStudent"
                                :label="isSyncing ? 'Sincronizando...' : 'Sincronizar con Classroom'"
                                :icon="isSyncing ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-path'"
                                :loading="isSyncing"
                                :disabled="isSyncing"
                                color="primary"
                                variant="outline"
                                @click="syncCourse"
                            />
                        </div>
                    </div>
                    <p class='text-gray-500'>
                        Course ID: {{ courseId }}
                    </p>
                </div>

                <UTabs :items="tabs" :default-index="tabs.findIndex(t => t.slot === defaultTab)">
                    <template #cell>
                        <div class="p-4">
                            <CourseTabViewCell :course-details="courseDetails" :course-id="courseId" />
                        </div>
                    </template>
                    <template #students>
                        <div class="p-4">
                            <CourseTabViewStudents :course-details="courseDetails" />
                        </div>
                    </template>
                    <template #teachers>
                        <div class="p-4">
                            <CourseTabViewTeachers :course-details="courseDetails" />
                        </div>
                    </template>
                    <template #stats>
                        <div class="p-4">
                            <CourseTabViewStats :course-details="courseDetails" :course-id="courseId" />
                        </div>
                    </template>
                </UTabs>
            </div>
        </div>
    </div>
</template>
