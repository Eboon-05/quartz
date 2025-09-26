<script setup lang='ts'>
import type { CourseDetailsResponse } from '#shared/types/courseDetailsResponse'

const props = defineProps<{ courseDetails: CourseDetailsResponse }>()

const stats = computed(() => {
    const studentCount = props.courseDetails.students?.length ?? 0
    const teacherCount = props.courseDetails.teachers?.length ?? 0
    const coordCount = props.courseDetails.coords?.length ?? 0
    const cellCount = props.courseDetails.cells?.length ?? 0
    
    const avgStudentsPerCell = cellCount > 0 ? (studentCount / cellCount).toFixed(1) : 'N/A'

    return [
        { label: 'Alumnos', value: studentCount },
        { label: 'Profesores', value: teacherCount },
        { label: 'Coordinadores', value: coordCount },
        { label: 'Células', value: cellCount },
        { label: 'Alumnos / Célula', value: avgStudentsPerCell },
    ]
})
</script>

<template>
    <div>
        <h2 class="text-xl font-semibold mb-4">Estadísticas del Curso</h2>
        
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <UCard v-for="stat in stats" :key="stat.label">
                <div class="text-center">
                    <p class="text-3xl font-bold">{{ stat.value }}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ stat.label }}</p>
                </div>
            </UCard>
        </div>

        <UDivider class="my-8" />

        <h3 class="text-lg font-semibold mb-4">Coordinadores del Curso</h3>
        <ul v-if="courseDetails.coords && courseDetails.coords.length > 0" class="space-y-3">
            <li v-for="coord in courseDetails.coords" :key="coord.id.toString()" class="flex items-center gap-3 p-3 bg-white rounded-md border shadow-sm">
                <UAvatar :src="coord.photoUrl" :alt="coord.name" />
                <div>
                    <p class="font-medium">{{ coord.name }}</p>
                    <p class="text-sm text-gray-600">{{ coord.email }}</p>
                </div>
            </li>
        </ul>
        <p v-else class="text-gray-500">No hay coordinadores asignados a este curso.</p>
    </div>
</template>
