<script setup lang="ts">
// We need the courseId to fetch the correct students
const props = defineProps({
    courseId: {
        type: String,
        required: true,
    },
})

// Form state
const selectedRole = ref<'teacher' | 'coordinator' | null>(null)
const selectedStudents = ref<string[]>([])
const step = ref(1)

// Data fetching for students
const { data: studentsData, pending } = useFetch(`/api/courses/${props.courseId}/students`, {
    lazy: true, // Don't block navigation
    server: false, // Fetch only on the client
})

const allStudents = computed(() => {
    // Filter out any students without a valid profile or ID for safety
    return studentsData.value?.students?.filter(s => s.userId && s.profile) || []
})

// This computed property will be true if all students are selected
const allSelected = computed({
    get() {
        return allStudents.value.length > 0 && selectedStudents.value.length === allStudents.value.length
    },
    set(value: boolean) {
        if (value) {
            selectedStudents.value = allStudents.value.map(s => s.userId!)
        } else {
            selectedStudents.value = []
        }
    },
})

function handleRoleSelection(role: 'teacher' | 'coordinator') {
    selectedRole.value = role
    if (role === 'teacher') {
        step.value = 2 // Move to student selection
    } else {
        // If coordinator, we can proceed to finish
        handleSubmit()
    }
}

function handleSubmit() {
    // For now, we just log the data as requested.
    // Later, this will call an API endpoint to save the information.
    console.log('Setup complete. Data to be saved:')
    console.log({ 
        role: selectedRole.value,
        students: selectedRole.value === 'teacher' ? selectedStudents.value : undefined,
    })

    alert('Configuración registrada en la consola. ¡Gracias!')
    // Here you might want to emit an event to the parent to hide the form
}
</script>

<template>
    <div class="max-w-2xl mx-auto p-6 bg-white border border-gray-200 rounded-lg shadow-md">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">Configuración Inicial del Curso</h2>
        
        <!-- Step 1: Role Selection -->
        <div v-if="step === 1">
            <p class="text-gray-600 mb-4">Para continuar, por favor, indica tu rol en este curso.</p>
            <div class="flex gap-4">
                <button 
                    class="flex-1 p-6 text-center bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    @click="handleRoleSelection('teacher')">
                    <span class="text-lg font-semibold">Soy Profesor</span>
                </button>
                <button 
                    class="flex-1 p-6 text-center bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    @click="handleRoleSelection('coordinator')">
                    <span class="text-lg font-semibold">Soy Coordinador</span>
                </button>
            </div>
        </div>

        <!-- Step 2: Student Selection (for teachers) -->
        <div v-if="step === 2">
            <h3 class="text-xl font-semibold text-gray-700 mb-2">Selecciona tu Célula de Alumnos</h3>
            <p class="text-gray-600 mb-4">Elige los alumnos que estarán a tu cargo.</p>

            <div v-if="pending" class="text-center text-gray-500">Cargando alumnos...</div>
            
            <div v-else-if="allStudents.length > 0">
                <div class="mb-4 p-3 bg-gray-50 rounded-md border">
                    <label class="flex items-center gap-2">
                        <input v-model="allSelected" type="checkbox" class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                        <span class="font-medium text-gray-700">Seleccionar todos</span>
                    </label>
                </div>

                <ul class="space-y-2 max-h-96 overflow-y-auto pr-2">
                    <template v-for="(student, index) in allStudents" :key="student.userId || index">
                        <li v-if="student.userId">
                            <label class="flex items-center p-3 bg-white rounded-md border hover:bg-gray-50 transition-colors">
                                <input 
                                    v-model="selectedStudents" 
                                    :value="student.userId" 
                                    type="checkbox" 
                                    class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                <span class="ml-3 text-gray-800">{{ student.profile?.name?.fullName }}</span>
                            </label>
                        </li>
                    </template>
                </ul>

                <div class="mt-6 flex justify-end">
                    <button class="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors" @click="handleSubmit">
                        Confirmar Célula
                    </button>
                </div>
            </div>

            <div v-else class="text-center text-gray-500">No se encontraron alumnos en este curso.</div>
        </div>
    </div>
</template>
