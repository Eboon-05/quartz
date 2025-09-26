<script setup lang='ts'>
import type { DBCourse } from '#shared/types/db'
import type { CourseDetailsResponse } from '#shared/types/courseDetailsResponse'
import { RecordId } from 'surrealdb'

const route = useRoute()
const user = useUser()
const courseId = computed(() => route.params.id as string)

// Fetch the full course details from our new endpoint
const { data: courseDetails, pending: pendingDetails, error: detailsError } = useFetch<CourseDetailsResponse>(`/api/courses/${courseId.value}`, {
    key: `course-details-${courseId.value}`,
})

const dbCourse = computed<DBCourse | null>(() => courseDetails.value?.course ?? null)


// Students are now fetched as part of the main course details
const students = computed(() => courseDetails.value?.students || [])

const isOwner = computed(() => {
    if (!courseDetails.value?.owner || !user.value?.id) return false
    const userId = new RecordId('user', user.value.id)
    return courseDetails.value.owner.id === userId
})

async function syncCourse() {
    if (!dbCourse.value) return
    try {
        const result = await $fetch(`/api/courses/${dbCourse.value.id}/sync`, {
            method: 'POST',
        })
        alert(`Sync successful! ${result.syncedTeachers} teachers and ${result.syncedStudents} students updated.`)
        // Optionally, you could refresh data here
    } catch (error) {
        // Type guard to check if the error looks like a FetchError
        if (typeof error === 'object' && error !== null && ('data' in error || 'statusMessage' in error)) {
            const fetchError = error as { data?: { message?: string }, statusMessage?: string }
            alert(`Sync failed: ${fetchError.data?.message || fetchError.statusMessage || 'An unknown error occurred.'}`)
        } else {
            alert('An unexpected error occurred.')
            console.error(error)
        }
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

        <!-- If role is defined, show the course management content -->
        <div v-else>
            <div class='mb-6'>
                <div class="flex justify-between items-center">
                    <h1 class='text-2xl font-bold'>
                        Manage Course
                    </h1>
                    <div class="flex items-center space-x-2">
                        <!-- TODO: La lógica para crear o editar una célula debe implementarse aquí.
                                 El texto del botón y la ruta deben cambiar dependiendo de si el usuario
                                 ya tiene una célula en este curso. -->
                        <NuxtLink
                            :to="`/courses/${courseId}/cell`"
                            class="text-blue-500 hover:underline"
                        >
                            Gestionar Célula
                        </NuxtLink>
                        <UButton
                            v-if="isOwner"
                            label="Sync with Classroom"
                            icon="i-heroicons-arrow-path"
                            @click="syncCourse"
                        />
                    </div>
                </div>
                <p class='text-gray-500'>
                    Course ID: {{ courseId }}
                </p>
            </div>

            <div>
                <h2 class='text-xl font-semibold mb-4'>
                    Enrolled Students
                </h2>
                <div v-if='pendingDetails' class='text-gray-500'>
                    Loading students...
                </div>
                <ul v-else-if='students.length > 0' class='space-y-3'>
                    <template v-for='student in students' :key='student.id.id'>
                        <li class='p-4 border rounded-md bg-white shadow-sm'>
                            <p class='font-medium'>{{ student.name || 'Name not available' }}</p>
                            <p class='text-sm text-gray-600'>{{ student.email || 'Email not available' }}</p>
                        </li>
                    </template>
                </ul>
                <div v-else class='text-gray-500'>
                    No students are enrolled in this course.
                </div>
            </div>
        </div>
    </div>
</template>
