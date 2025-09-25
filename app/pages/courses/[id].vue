<script setup lang='ts'>
const route = useRoute()
const courseId = computed(() => route.params.id)
</script>

<template>
    <div class='p-4 sm:p-6 lg:p-8'>
        <h1 class='text-2xl font-bold mb-4'>
            Manage Course
        </h1>
        <p>
            Course ID: {{ courseId }}
        </p>
    </div>
</template>
