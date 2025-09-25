<script setup lang="ts">
    const user = useUser()
</script>

<template>
    <div>
        <p v-if="user">Hello, {{ user.name }}</p>
        <p v-else>Loading...</p>
    </div>
</template>