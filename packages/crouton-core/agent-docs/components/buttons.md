---
title: Buttons, icons & menus
---

<script setup>
import { ref } from 'vue';
import { Btn, BtnBadge, Icon, IconEnum, SubMenu } from '@ghentcdh/crouton-vue';

const lastAction = ref('—');
const userMenu = {
  label: 'Jane Doe',
  items: [
    { label: 'Profile', action: () => (lastAction.value = 'Profile') },
    {
      label: 'Language',
      items: [
        { label: 'English', action: () => (lastAction.value = 'English') },
        { label: 'Nederlands', action: () => (lastAction.value = 'Nederlands') },
      ],
    },
    { label: 'Logout', action: () => (lastAction.value = 'Logout') },
  ],
};
</script>

# Buttons, icons & menus

## Colors & variants

<ClientOnly>
<div class="demo">
  <Btn>Default</Btn>
  <Btn color="primary">Primary</Btn>
  <Btn color="secondary">Secondary</Btn>
  <Btn color="error">Error</Btn>
  <Btn color="primary" outline>Outline</Btn>
  <Btn color="primary" :disabled="true">Disabled</Btn>
</div>
</ClientOnly>

```vue
<Btn color="primary">Primary</Btn>
<Btn color="primary" outline>Outline</Btn>
<Btn color="primary" :disabled="true">Disabled</Btn>
```

## Sizes

`size` accepts `xs`, `sm` (default), `lg` (same as `sm`) and `xl`.

<ClientOnly>
<div class="demo">
  <Btn color="primary" size="xs">xs</Btn>
  <Btn color="primary" size="sm">sm (default)</Btn>
  <Btn color="primary" size="xl">xl</Btn>
</div>
</ClientOnly>

```vue
<Btn color="primary" size="xs">XSmall</Btn>
```

## Icon buttons & tooltips

Icon-only buttons need an `aria-label`; `tooltip` shows a native hover/focus hint.

<ClientOnly>
<div class="demo">
  <Btn :icon="IconEnum.Edit" color="secondary" size="xs" tooltip="Edit" aria-label="Edit" />
  <Btn :icon="IconEnum.View" color="secondary" size="xs" tooltip="View" aria-label="View" />
  <Btn :icon="IconEnum.Delete" color="error" size="xs" tooltip="Delete" aria-label="Delete" />
  <Btn color="primary" outline tooltip="Copies the record without its relations">Duplicate</Btn>
</div>
</ClientOnly>

```vue
<Btn :icon="IconEnum.Edit" color="secondary" size="xs" tooltip="Edit" aria-label="Edit" />
<Btn color="primary" outline tooltip="Copies the record without its relations">Duplicate</Btn>
```

## Badges

<ClientOnly>
<div class="demo">
  <BtnBadge>Badge</BtnBadge>
  <BtnBadge :icon="IconEnum.Check">With icon</BtnBadge>
  <BtnBadge color="secondary">Secondary badge</BtnBadge>
</div>
</ClientOnly>

```vue
<BtnBadge :icon="IconEnum.Check">With icon</BtnBadge>
```

## Menu

`SubMenu` renders a `popovertarget` button with a popover list. Esc, an outside click or choosing an item closes it; nested `items` open a submenu.

<ClientOnly>
<div class="demo">
  <SubMenu v-bind="userMenu" />
  <span class="demo-note">Last action: {{ lastAction }}</span>
</div>
</ClientOnly>

```vue
<SubMenu
  label="Jane Doe"
  :items="[
    { label: 'Profile', action: openProfile },
    { label: 'Language', items: [{ label: 'English', action: setEn }] },
    { label: 'Logout', action: logout },
  ]"
/>
```

## Icons

`Icon` takes an `IconEnum` name (or any Vue component) and an optional `size`. The same names work for `Btn :icon`.

<ClientOnly>
<div class="demo">
  <div v-for="name in Object.values(IconEnum)" :key="name" class="flex flex-col items-center gap-1 w-24 text-xs">
    <Icon :icon="name" size="lg" />
    <code>{{ name }}</code>
  </div>
</div>
</ClientOnly>

```vue
<Icon :icon="IconEnum.Edit" size="lg" />
```
