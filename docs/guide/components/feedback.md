---
title: Feedback
---

<script setup>
import { Alert, Btn, Loading, NotificationService, Notifications } from '@ghentcdh/crouton-vue';
</script>

# Feedback

## Alert

<ClientOnly>
<div class="demo demo-stack">
  <Alert type="info" message="This is an info message." />
  <Alert type="success" message="Operation completed successfully." />
  <Alert type="warning" message="Proceed with caution." />
  <Alert type="error" message="Something went wrong." />
</div>
</ClientOnly>

```vue
<Alert type="warning" message="Proceed with caution." />
```

## Loading

<ClientOnly>
<div class="demo">
  <Loading :loading="true" />
</div>
</ClientOnly>

```vue
<Loading :loading="isLoading" />
```

## Notifications

Toasts shown by `NotificationService` disappear after 5 seconds. They need one `<Notifications />` mounted in your app (`ShellComponent` already includes it).

<ClientOnly>
<div class="demo">
  <Btn @click="NotificationService.info('Info toast')">Info</Btn>
  <Btn color="primary" @click="NotificationService.success('Saved')">Success</Btn>
  <Btn color="secondary" @click="NotificationService.warning('Check your input')">Warning</Btn>
  <Btn color="error" @click="NotificationService.error('Save failed')">Error</Btn>
  <Notifications />
</div>
</ClientOnly>

```ts
NotificationService.success('Saved');
NotificationService.error('Save failed');
```
