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
const teacherCell = computed(() => courseDetails.value?.teacherCell ?? null)

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
                        {{ dbCourse?.name }}
                    </h1>
                    <div class="flex items-center space-x-2">
                        <NuxtLink
                            v-if="isTeacher"
                            :to="`/courses/${courseId}/cell`"
                            class="text-blue-500 hover:underline"
                        >
                            {{ teacherCell ? 'Editar Célula' : 'Crear Célula' }}
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

            
            <!-- Teacher's Cell Information -->
            <div v-if="isTeacher" class='mt-6'>
                <h2 class='text-xl font-semibold mb-4'>
                    Tu Célula
                </h2>
                <div v-if="teacherCell">
                    <p class="mb-4">Nombre de la célula: <strong>{{ teacherCell.name }}</strong></p>

                    <h3 class="text-lg font-semibold mb-2">Estudiantes en tu Célula</h3>
                    <ul v-if="teacherCell.students && teacherCell.students.length > 0" class="space-y-3">
                        <li v-for="student in teacherCell.students" :key="student.id.toString()" class="p-4 border rounded-md bg-white shadow-sm">
                            <p class="font-medium">{{ student.name || 'Name not available' }}</p>
                            <p class="text-sm text-gray-600">{{ student.email || 'Email not available' }}</p>
                        </li>
                    </ul>
                    <p v-else class="text-gray-500">No hay estudiantes asignados a tu célula.</p>
                </div>
                <div v-else>
                    <p>Aún no has creado una célula para este curso.</p>
                    <NuxtLink
                        :to="`/courses/${courseId}/cell`"
                        class="text-blue-500 hover:underline"
                    >
                        Crear una ahora
                    </NuxtLink>
                </div>
            </div>

            <UDivider class="my-8" />

            <div v-if="courseDetails" class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Teachers Column -->
                <div class="md:col-span-1">
                    <h2 class="text-xl font-semibold mb-4">Teachers</h2>
                    <ul class="space-y-3">
                        <li v-for="teacher in courseDetails.teachers" :key="teacher.id.toString()" class="flex items-center gap-3">
                            <UAvatar :src="teacher.photoUrl" :alt="teacher.name" />
                            <span>{{ teacher.name }}</span>
                        </li>
                    </ul>
                </div>

                <!-- Students Column -->
                <div class="md:col-span-1">
                    <h2 class="text-xl font-semibold mb-4">Students</h2>
                    <ul class="space-y-3">
                        <li v-for="student in courseDetails.students" :key="student.id.toString()" class="flex items-center gap-3">
                            <UAvatar :src="student.photoUrl" :alt="student.name" />
                            <span>{{ student.name }}</span>
                        </li>
                    </ul>
                </div>

                <!-- Cells Column -->
                <div class="md:col-span-1">
                    <h2 class="text-xl font-semibold mb-4">Cells</h2>
                    <div class="space-y-4">
                        <div v-for="cell in courseDetails.cells.filter(c => c && c.id)" :key="cell.id.toString()">
                            <h3 class="font-semibold">{{ cell.name }}</h3>
                            <ul v-if="cell.students && cell.students.length > 0" class="pl-4 mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <li v-for="student in cell.students.filter(s => s && s.id)" :key="student.id.toString()" class="flex items-center gap-2">
                                    <UAvatar :src="student.photoUrl" :alt="student.name" size="2xs" />
                                    <span>{{ student.name }}</span>
                                </li>
                            </ul>
                            <p v-else class="pl-4 mt-2 text-xs text-gray-400">No students in this cell.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
