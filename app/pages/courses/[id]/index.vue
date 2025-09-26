<script setup lang='ts'>
import type { DBCourse } from '#shared/types/db'
import type { CourseDetailsResponse } from '#shared/types/courseDetailsResponse'
import { RecordId } from 'surrealdb'

const route = useRoute()
const user = useUser()
const courseId = computed(() => route.params.id as string)

// Fetch the full course details from our new endpoint
const { data: courseDetails, pending: pendingDetails, error: detailsError } = useFetch<CourseDetailsResponse>(`/api/courses/${courseId.value}/details`, {
    key: `course-details-${courseId.value}`,
})

const dbCourse = computed<DBCourse | null>(() => courseDetails.value?.course ?? null)



const isOwner = computed(() => {
    if (!courseDetails.value?.owner || !user.value?.id) return false
    const userId = new RecordId('user', user.value.id)
    // SurrealDB RecordId needs to be compared by its string representation
    return courseDetails.value.owner.id.toString() === userId.toString()
})

const isTeacher = computed(() => courseDetails.value?.isTeacher ?? false)
const isCoord = computed(() => courseDetails.value?.isCoord ?? false)

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

const needsRoleSetup = computed(() => {
    if (!courseDetails.value || pendingDetails.value) return false
    // The owner does not need to choose a role initially, but other users do.
    return !isOwner.value && !isTeacher.value && !isCoord.value
})

function handleRoleSet() {
    // Refresh data to get the new role and UI state
    refreshNuxtData(`course-details-${courseId.value}`)
}

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

        <InitialSetupForm 
            v-else-if="needsRoleSetup"
            :course-id="courseId"
            @role-set="handleRoleSet"
        />

        <!-- If role is defined, show the course management content -->
        <div v-else-if="courseDetails">
            <div class='mb-6'>
                <div class="flex justify-between items-center">
                    <h1 class='text-2xl font-bold'>
                        {{ dbCourse?.name }}
                    </h1>
                    <div class="flex items-center space-x-2">
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
                        <CourseTabViewStats :course-details="courseDetails" />
                    </div>
                </template>
            </UTabs>
        </div>
    </div>
</template>
