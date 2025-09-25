<script setup lang="ts">
    import type { oauth2_v2 } from "googleapis"
    import {
        useCodeClient,
        type ImplicitFlowSuccessResponse,
        type ImplicitFlowErrorResponse,
    } from "vue3-google-signin"
    import { useUser } from "~/composables/useUser"

    const user = useUser()

    const handleOnSuccess = async (response: ImplicitFlowSuccessResponse) => {
        try {
            const data = await $fetch<{ user: oauth2_v2.Schema$Userinfo | null; }>(
                '/api/auth/get-token', {
                method: 'POST',
                body: {
                    code: response.code,
                },
            });

            // Set the user state with the data returned from the server
            if (data.user) {
                user.value = data.user;
                navigateTo('/dashboard');
            }
        } catch (error) {
            console.error('Error during login:', error);
            // Optionally, show a toast or notification to the user
        }
    };

    const handleOnError = (errorResponse: ImplicitFlowErrorResponse) => {
        console.log("Error: ", errorResponse);
    };

    const { isReady, login } = useCodeClient({
        onSuccess: handleOnSuccess,
        onError: handleOnError,
        scope: [
            "https://www.googleapis.com/auth/classroom.courses",
            "https://www.googleapis.com/auth/classroom.rosters",
            "https://www.googleapis.com/auth/classroom.coursework.students",
            "https://www.googleapis.com/auth/classroom.profile.emails",
            "https://www.googleapis.com/auth/classroom.profile.photos",
        ],
    });
</script>

<template>
    <div class="p-4">
        <div v-if="user" class="flex items-center gap-4">
            <UAvatar :src="user.picture ?? ''" :alt="user.name ?? 'User'" />
            <div>
                <p class="font-bold">Welcome, {{ user.given_name }}!</p>
                <p class="text-sm text-gray-500">{{ user.email }}</p>
            </div>
            <ULink href="/dashboard">Dashboard</ULink>
        </div>
        <div v-else>
            <UButton :disabled="!isReady" @click="() => login()"
                >Login with Google</UButton
            >
        </div>
    </div>
</template>
