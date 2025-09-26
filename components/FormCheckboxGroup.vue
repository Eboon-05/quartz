<script setup lang="ts">
import type { DBUser } from '#shared/types/db'

const props = defineProps<{ 
    options: DBUser[] 
}>()

const model = defineModel<string[]>()
</script>

<template>
    <div class="space-y-2">
        <UCheckbox
            v-for="option in props.options"
            :key="option.id.toString()"
            :model-value="model?.includes(option.id.toString())"
            :label="option.name"
            @update:model-value="(value: boolean) => {
                if (!model) return
                const optionId = option.id.toString()
                if (value) {
                    if (!model.includes(optionId)) {
                        model.push(optionId)
                    }
                } else {
                    const index = model.indexOf(optionId)
                    if (index > -1) {
                        model.splice(index, 1)
                    }
                }
            }"
        />
    </div>
</template>
