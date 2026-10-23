<template>
  <FormComponentBase
    ref="innerRef"
    :id="props.id"
    :name="props.name"
    :schema="props.schema"
    :ui-schema="props.uiSchema"
    :form-data="props.formData"
    :disabled="props.disabled"
    :readonly="props.readonly"
    :error-mode="props.errorMode"
    :http="props.http"
    :renderers="props.renderers"
    :validate-on-mount="props.validateOnMount"
    @change="$emit('change', $event)"
    @submit="$emit('submit', $event)"
    @errors="$emit('errors', $event)"
    @valid="$emit('valid', $event)"
    @events="$emit('events', $event)"
  />
  <FormDebug
    :show-errors="showErrors"
    :debug-value="debugValue"
    :errors="innerRef?.errors ?? {}"
    :current-values="innerRef?.values ?? {}"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { FormComponent as FormComponentBase } from '@ghentcdh/crouton-forms-vue';
import { useCrouton } from '../composables/useCrouton';
import { JsonFormComponentEmits, JsonFormComponentProperties } from './FormComponent.properties';
import FormDebug from './debug/FormDebug.vue';

const props = defineProps(JsonFormComponentProperties);
defineEmits(JsonFormComponentEmits);

const { showErrors, debugValue } = useCrouton();
const innerRef = ref<InstanceType<typeof FormComponentBase>>();

const markSubmitted = () => innerRef.value?.markSubmitted();
const getCurrentValues = () => innerRef.value?.getCurrentValues();
const validate = () => innerRef.value?.validate();

defineExpose({ markSubmitted, getCurrentValues, validate });
</script>
