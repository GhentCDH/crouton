---
title: Cards & layout
---

<script setup>
import { ref } from 'vue';
import { Btn, Card, Collapse, CollapseRow, Drawer, IconEnum } from '@ghentcdh/crouton-vue';

const lastAction = ref('—');
const collapseActions = [
  { icon: IconEnum.Edit, tooltip: 'Edit', onClick: () => (lastAction.value = 'Edit') },
  { icon: IconEnum.Delete, tooltip: 'Delete', onClick: () => (lastAction.value = 'Delete') },
];
</script>

# Cards & layout

## Card

<ClientOnly>
<div class="demo">
  <Card class="w-64">
    <template #title>Card title</template>
    Card body content goes here.
    <template #actions>
      <Btn color="primary" size="sm">Action</Btn>
    </template>
  </Card>
  <Card class="w-64">
    <template #title>Simple card</template>
    No actions, just content.
  </Card>
</div>
</ClientOnly>

```vue
<Card>
  <template #title>Card title</template>
  Card body content goes here.
  <template #actions>
    <Btn color="primary" size="sm">Action</Btn>
  </template>
</Card>
```

## Collapse

<ClientOnly>
<div class="demo demo-stack">
  <Collapse title="Open by default" :opened="true">
    <CollapseRow title="Item 1" label="Value 1" />
    <CollapseRow title="Item 2" label="Value 2" description="A description" />
  </Collapse>
  <Collapse title="Closed by default" :opened="false">
    <CollapseRow title="Hidden item" label="Revealed on expand" />
  </Collapse>
  <Collapse title="With actions" :opened="true" :actions="collapseActions">
    <CollapseRow title="Item" label="Icon actions in the header" />
  </Collapse>
  <span class="demo-note">Last action: {{ lastAction }}</span>
</div>
</ClientOnly>

```vue
<Collapse title="With actions" :opened="true" :actions="[{ icon: IconEnum.Edit, tooltip: 'Edit', onClick: edit }]">
  <CollapseRow title="Item 2" label="Value 2" description="A description" />
</Collapse>
```

## Drawer

Three-column layout with collapsible side panels. Only the slots you fill (`left-drawer`, `right-drawer`) get a panel.

<ClientOnly>
<div class="demo demo-stack">
  <div class="h-64 border border-base-300 rounded">
    <Drawer :width-left="160" :width-right="160">
      <template #left-drawer>Left panel</template>
      <div class="p-4">Main content</div>
      <template #right-drawer>Right panel</template>
    </Drawer>
  </div>
</div>
</ClientOnly>

```vue
<Drawer :width-left="160" :initial-right-open="false">
  <template #left-drawer>Navigation</template>
  Main content
  <template #right-drawer>Details</template>
</Drawer>
```
