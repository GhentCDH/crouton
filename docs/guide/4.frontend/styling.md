# Custom styling

The crouton components are built on **Tailwind CSS 4** and **daisyUI**. The `@ghentcdh/crouton-vue/styles.css` entry bundles everything the components need, including a daisyUI theme called `ugent` (Ghent University corporate colors). Because everything is themed through daisyUI's CSS variables, you can restyle the whole admin UI without touching any component.

## Default setup

In your application stylesheet, import Tailwind and the crouton styles, and activate the `ugent` theme:

```css
/* style.css */
@import 'tailwindcss';
@import '@ghentcdh/crouton-vue/styles.css';

@plugin "daisyui" {
  themes: ugent --default;
}
```

## Overriding theme variables

The `ugent` theme is just a set of daisyUI CSS variables. Override them on `:root` (or on a `[data-theme]` selector) after the imports:

```css
:root,
[data-theme='ugent'] {
  --color-primary: #8a2432; /* your brand color */
  --color-primary-content: #fdf2f4;
  --color-secondary: #0f6b3f;
  --radius-field: 0.5rem; /* input & button rounding */
  --radius-box: 1rem; /* cards, modals */
}
```

Commonly used variables: `--color-primary`, `--color-secondary`, `--color-accent`, `--color-neutral`, the `--color-base-100/200/300` surface colors, their `*-content` text counterparts, the state colors (`--color-info`, `--color-success`, `--color-warning`, `--color-error`), and the `--radius-*` / `--border` sizing variables. See the [daisyUI theme documentation](https://daisyui.com/docs/themes/) for the full list.

## Defining your own theme

Instead of patching `ugent`, you can register a complete daisyUI theme and make it the default:

```css
@import 'tailwindcss';
@import '@ghentcdh/crouton-vue/styles.css';

@plugin "daisyui/theme" {
  name: 'mytheme';
  default: true;
  color-scheme: light;

  --color-base-100: oklch(100% 0 0);
  --color-base-200: oklch(98% 0 0);
  --color-base-300: oklch(95% 0 0);
  --color-base-content: #202020;
  --color-primary: #8a2432;
  --color-primary-content: #fdf2f4;
  --color-secondary: #0f6b3f;
  --color-secondary-content: #ecfdf3;
  /* ... */
}
```

Switching themes at runtime works the daisyUI way, with a `data-theme` attribute:

```html
<html data-theme="mytheme"></html>
```

## Targeted overrides

The components use regular daisyUI class names (`btn`, `modal`, `table`, `drawer`, `alert`, …), so narrow tweaks are plain CSS:

```css
/* example: denser admin tables */
.table :where(td, th) {
  padding-block: 0.375rem;
}
```

Prefer theme variables over class overrides where possible — they survive component updates better.

::: tip
Your own pages can use any Tailwind utility and daisyUI component alongside crouton — it's all one design system, so custom views automatically match the generated admin UI.
:::
