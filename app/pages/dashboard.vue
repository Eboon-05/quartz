<script setup lang="ts">
import type { classroom_v1 } from 'googleapis'

const user = useUser()

interface CoursesResponse {
    courses: classroom_v1.Schema$Course[]
}

const { data, pending, error } = useFetch<CoursesResponse>('/api/courses', {
    lazy: true,
})

const courses = computed(() => data.value?.courses ?? [])

async function startCourse(courseId: string) {
    try {
        await $fetch('/api/courses/start', {
            method: 'POST',
            body: { courseId },
        })
        // TODO: Handle successful course start, e.g., show a notification or navigate
        console.log('Course started successfully:', courseId)
    } catch (error) {
        console.error('Error starting course:', error)
        // TODO: Show an error message to the user
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

        <UDivider class="my-6" />

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
                <UCard v-for="course in courses" :key="course.id!">
                    <template #header>
                        <h3 class="font-semibold truncate" :title="course.name ?? ''">
                            {{ course.name }}
                        </h3>
                    </template>

                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {{ course.section || 'No section specified' }}
                    </p>

                    <template #footer>
                        <UButton
                            block
                            label="Start"
                            @click="startCourse(course.id!)"
                        />
                    </template>
                </UCard>
            </div>
            <div v-else>
                <p>No active courses found where you are a teacher.</p>
            </div>
        </template>
    </div>
</template>