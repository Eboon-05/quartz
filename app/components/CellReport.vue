<script setup lang="ts">
import { ref } from 'vue'
import type { User, Work, IsAssigned } from '~/shared/types/db'

// Tipos para el informe (deben coincidir con el backend)
interface StudentReport {
    student: User
    summary: {
        onTime: number
        late: number
        pending: number
        notSubmitted: number
        averageGrade: number | null
    }
    works: WorkStatus[]
}

interface WorkStatus {
    work: Work
    submission: IsAssigned | null
    status: 'on-time' | 'late' | 'pending' | 'not-submitted'
}

const props = defineProps({
    cellId: {
        type: String,
        required: true,
    },
})

const { data: report, pending, error } = await useFetch<StudentReport[]>(`/api/cells/${props.cellId}/report`)

const expandedStudents = ref<string[]>([])

function toggleStudent(studentId: string) {
    const index = expandedStudents.value.indexOf(studentId)
    if (index > -1) {
        expandedStudents.value.splice(index, 1)
    } else {
        expandedStudents.value.push(studentId)
    }
}

function getStatusClass(status: string) {
    switch (status) {
        case 'on-time': return 'bg-green-100 text-green-800'
        case 'late': return 'bg-yellow-100 text-yellow-800'
        case 'pending': return 'bg-red-100 text-red-800'
        case 'not-submitted': return 'bg-gray-100 text-gray-800'
        default: return ''
    }
}

function formatGrade(grade: number | null | undefined) {
    if (grade === null || grade === undefined) return 'N/A'
    return grade.toFixed(1)
}
</script>

<template>
    <div class="p-4">
        <h2 class="text-2xl font-bold mb-4">Informe de Rendimiento de la Célula</h2>

        <div v-if="pending">Cargando informe...</div>
        <div v-else-if="error">Error al cargar el informe: {{ error.message }}</div>
        <div v-else-if="report && report.length > 0">
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estudiante</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">A Tiempo</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarde</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pendiente</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promedio</th>
                            <th class="px-6 py-3" />
                        </tr>
                    </thead>
                    <tbody v-for="studentReport in report" :key="studentReport.student.id.toString()" class="divide-y divide-gray-200">
                        <tr class="cursor-pointer hover:bg-gray-50" @click="toggleStudent(studentReport.student.id.toString())">
                            <td class="px-6 py-4 whitespace-nowrap">{{ studentReport.student.name }}</td>
                            <td class="px-6 py-4 whitespace-nowrap">{{ studentReport.summary.onTime }}</td>
                            <td class="px-6 py-4 whitespace-nowrap">{{ studentReport.summary.late }}</td>
                            <td class="px-6 py-4 whitespace-nowrap">{{ studentReport.summary.pending }}</td>
                            <td class="px-6 py-4 whitespace-nowrap">{{ formatGrade(studentReport.summary.averageGrade) }}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button class="text-indigo-600 hover:text-indigo-900">
                                    {{ expandedStudents.includes(studentReport.student.id.toString()) ? 'Ocultar' : 'Ver' }} Detalles
                                </button>
                            </td>
                        </tr>
                        <tr v-if="expandedStudents.includes(studentReport.student.id.toString())">
                            <td colspan="6" class="p-0">
                                <div class="p-4 bg-gray-50">
                                    <h4 class="font-bold mb-2">Detalle de Trabajos</h4>
                                    <table class="min-w-full bg-white border">
                                        <thead class="bg-gray-100">
                                            <tr>
                                                <th class="px-4 py-2 text-left">Trabajo</th>
                                                <th class="px-4 py-2 text-left">Fecha Límite</th>
                                                <th class="px-4 py-2 text-left">Estado</th>
                                                <th class="px-4 py-2 text-left">Calificación</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="workStatus in studentReport.works" :key="workStatus.work.id.toString()">
                                                <td class="border-t px-4 py-2">{{ workStatus.work.title }}</td>
                                                <td class="border-t px-4 py-2">{{ workStatus.work.dueDate ? new Date(workStatus.work.dueDate).toLocaleDateString() : 'N/A' }}</td>
                                                <td class="border-t px-4 py-2">
                                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" :class="getStatusClass(workStatus.status)">
                                                        {{ workStatus.status }}
                                                    </span>
                                                </td>
                                                <td class="border-t px-4 py-2">{{ formatGrade(workStatus.submission?.grade) }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div v-else class="text-center py-8 text-gray-500">
            No hay estudiantes en esta célula para generar un informe.
        </div>
    </div>
</template>