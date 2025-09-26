<script setup lang='ts'>
import type { CourseDetailsResponse } from '#shared/types/courseDetailsResponse'
import CellReport from './CellReport.vue'

defineProps<{ courseDetails: CourseDetailsResponse, courseId: string }>()
</script>

<template>
    <div>
        <div v-if="courseDetails.teacherCell">
            <div class="flex justify-between items-center mb-4">
                <h2 class='text-xl font-semibold'>
                    Tu Célula: {{ courseDetails.teacherCell.name }}
                </h2>
                <NuxtLink
                    :to="`/courses/${courseId}/cell`"
                    class="text-blue-500 hover:underline"
                >
                    Editar Célula
                </NuxtLink>
            </div>

            <CellReport :cell-id="courseDetails.teacherCell.id.toString().split(':')[1]" />
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
</template>
