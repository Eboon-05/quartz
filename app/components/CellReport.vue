<script setup lang="ts">
import { ref, computed } from 'vue'
import { DateTime } from 'luxon'
import type { RecordId } from 'surrealdb'
import type { DBUser, Work, IsAssigned } from '#shared/types/db'

// --- Tipos para la respuesta de la API ---
interface ApiResponse {
    courseRecordId: RecordId<'course'>
    students: DBUser[]
    submissionsResult: [{ '->is_assigned': IsAssigned[] }[]]
    works: Work[]
}

// --- Tipos para el informe procesado ---
interface ProcessedStudentReport {
    student: DBUser
    summary: {
        onTime: number
        late: number
        pending: number
        notSubmitted: number
        averageGrade: number | null
    }
    works: ProcessedWorkStatus[]
}

interface ProcessedWorkStatus {
    work: Work
    submission: IsAssigned | null
    status: 'on-time' | 'late' | 'pending' | 'not-submitted'
}

// --- Props y obtención de datos ---
const props = defineProps({
    cellId: {
        type: String,
        required: true,
    },
})

const { data: apiData, pending, error } = await useFetch<ApiResponse>(`/api/cells/${props.cellId}/report`)

// --- Lógica de procesamiento en el cliente ---
const processedReport = computed<ProcessedStudentReport[]>(() => {
    if (!apiData.value) return []

    const { students, works, submissionsResult } = apiData.value
    const allSubmissions = submissionsResult.flat().flatMap(s => s['->is_assigned'] || [])

    return students.map(student => {
        const studentSubmissions = allSubmissions.filter(s => s.in.toString() === student.id.toString())
        let totalGrade = 0
        let gradedCount = 0

        const workStatuses: ProcessedWorkStatus[] = works.map(work => {
            const submission = studentSubmissions.find(s => s.out.toString() === work.id.toString()) || null
            let status: ProcessedWorkStatus['status'] = 'not-submitted'

            const dueDate = work.dueDate ? DateTime.fromObject(work.dueDate) : null

            if (submission) {
                // TODO: La fecha de entrega no viene en el nuevo objeto de submission.
                // Asumimos 'on-time' por ahora.
                status = 'on-time'

                if (submission.grade !== null && submission.grade !== undefined) {
                    totalGrade += submission.grade
                    gradedCount++
                }
            } else if (dueDate && DateTime.now() > dueDate) {
                status = 'pending'
            }

            return { work, submission, status }
        })

        const summary = {
            onTime: workStatuses.filter(ws => ws.status === 'on-time').length,
            late: workStatuses.filter(ws => ws.status === 'late').length,
            pending: workStatuses.filter(ws => ws.status === 'pending').length,
            notSubmitted: workStatuses.filter(ws => ws.status === 'not-submitted').length,
            averageGrade: gradedCount > 0 ? totalGrade / gradedCount : null,
        }

        return { student, summary, works: workStatuses }
    })
})

// --- Funciones de UI ---
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

function formatDueDate(work: Work) {
    if (!work.dueDate) return 'N/A'
    return DateTime.fromObject(work.dueDate).toLocaleString(DateTime.DATE_SHORT)
}
</script>

<template>
    <div class="p-4">
        <h2 class="text-2xl font-bold mb-4">Informe de Rendimiento de la Célula</h2>

        <div v-if="pending">Cargando informe...</div>
        <div v-else-if="error">Error al cargar el informe: {{ error.message }}</div>
        <div v-else-if="processedReport && processedReport.length > 0">
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
                    <tbody v-for="studentReport in processedReport" :key="studentReport.student.id.toString()" class="divide-y divide-gray-200">
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
                                                <td class="border-t px-4 py-2">{{ formatDueDate(workStatus.work) }}</td>
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