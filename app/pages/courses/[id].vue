<script setup lang='ts'>
const route = useRoute()
const courseId = computed(() => route.params.id as string)

// Fetch the list of students for this course
const { data: courseData, pending, error } = useFetch(`/api/courses/${courseId.value}/students`, {
    // The key ensures that if the courseId changes, the data is re-fetched.
    key: `students-for-${courseId.value}`,
})

const students = computed(() => courseData.value?.students?.filter(s => s.userId) || [])
</script>

<template>
    <div class='p-4 sm:p-6 lg:p-8'>
        <div class='mb-6'>
            <h1 class='text-2xl font-bold'>
                Manage Course
            </h1>
            <p class='text-gray-500'>
                Course ID: {{ courseId }}
            </p>
        </div>

        <div>
            <h2 class='text-xl font-semibold mb-4'>
                Enrolled Students
            </h2>
            <div v-if='pending' class='text-gray-500'>
                Loading students...
            </div>
            <div v-else-if='error' class='text-red-500'>
                Failed to load students. Please try again.
            </div>
            <ul v-else-if='students.length > 0' class='space-y-3'>
                <template v-for='(student, index) in students' :key='student.userId || index'>
                    <li v-if='student.userId' class='p-4 border rounded-md bg-white shadow-sm'>
                        <p class='font-medium'>{{ student.profile?.name?.fullName || 'Name not available' }}</p>
                        <p class='text-sm text-gray-600'>{{ student.profile?.emailAddress || 'Email not available' }}</p>
                    </li>
                </template>
            </ul>
            <div v-else class='text-gray-500'>
                No students are enrolled in this course.
            </div>
        </div>
    </div>
</template>
