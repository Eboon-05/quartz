<script setup lang='ts'>
const route = useRoute()
const user = useUser()
const courseId = computed(() => route.params.id as string)

// Define a more specific type for our DB course record
interface DbCourse {
    id: string
    ownerId: string
    teachers: string[]
    coords: string[]
}

interface CourseDetailsResponse {
    course: DbCourse
}

// Fetch the full course details from our new endpoint
const { data: courseDetails, pending: pendingDetails, error: detailsError } = useFetch<CourseDetailsResponse>(`/api/courses/${courseId.value}`, {
    key: `course-details-${courseId.value}`,
})

const dbCourse = computed(() => courseDetails.value?.course as DbCourse | null)

// Helper function to check if the user's role is defined for this course
const isRoleDefined = computed(() => {
    if (!dbCourse.value || !user.value?.id) {
        return false
    }
    const userId = user.value.id
    const isTeacher = dbCourse.value.teachers?.includes(userId)
    const isCoordinator = dbCourse.value.coords?.includes(userId)
    return isTeacher || isCoordinator
})

// We only fetch students if the role is defined
const { data: studentsData, pending: pendingStudents } = useFetch(`/api/courses/${courseId.value}/students`, {
    // This fetch will only run if the computed property isRoleDefined is true
    immediate: isRoleDefined.value,
    watch: [isRoleDefined],
})

const students = computed(() => studentsData.value?.students?.filter(s => s.userId) || [])

</script>

<template>
    <div class='p-4 sm:p-6 lg:p-8'>
        <div v-if="pendingDetails" class="text-gray-500">Loading course details...</div>
        <div v-else-if="detailsError" class="text-red-500">
            <p>Error loading course: {{ detailsError.statusMessage }}</p>
            <NuxtLink to="/dashboard" class="text-blue-500 hover:underline">Return to Dashboard</NuxtLink>
        </div>
        
        <!-- If role is not defined, show the setup form -->
        <InitialSetupForm v-else-if="!isRoleDefined" :course-id="courseId" />

        <!-- If role is defined, show the course management content -->
        <div v-else>
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
                <div v-if='pendingStudents' class='text-gray-500'>
                    Loading students...
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
    </div>
</template>
