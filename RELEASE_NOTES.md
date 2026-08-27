## 0.0.1-alpha.41 (2026-08-27)

### 🚀 Features

- add i18n ([#86](https://github.com/GhentCDH/crouton/pull/86))
- use crouton form instead of autosaveform ([#87](https://github.com/GhentCDH/crouton/pull/87))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.40 (2026-08-24)

### 🚀 Features

- update docs & update ui autosave ([#83](https://github.com/GhentCDH/crouton/pull/83))
- **api:** auto-derive includes for manyToOne relations in sub-resources ([#80](https://github.com/GhentCDH/crouton/pull/80))
- **codegen:** include relations by default; hide the reverse side of a relation by default ([#75](https://github.com/GhentCDH/crouton/pull/75))
- **forms-vue:** add date control with daisyUI datepicker ([#77](https://github.com/GhentCDH/crouton/pull/77))

### 🩹 Fixes

- preserve prisma relation writes in hooks ([#79](https://github.com/GhentCDH/crouton/pull/79))
- hide errors on new form ([#84](https://github.com/GhentCDH/crouton/pull/84))
- hide errors on new form ([#85](https://github.com/GhentCDH/crouton/pull/85))
- **autocomplete:** resolve stored id back to its label on edit ([#82](https://github.com/GhentCDH/crouton/pull/82))
- **core:** map Prisma Decimal, BigInt, and Buffer to correct JSON schema types ([#76](https://github.com/GhentCDH/crouton/pull/76))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.39 (2026-08-14)

### 🚀 Features

- support default values ([#71](https://github.com/GhentCDH/crouton/pull/71))
- show enums on status page ([#73](https://github.com/GhentCDH/crouton/pull/73))
- **cli:** default new resources to non-draft; drop redundant relation fieldInput.type ([#72](https://github.com/GhentCDH/crouton/pull/72))

### 🩹 Fixes

- **vue:** unwrap isDev ComputedRef in templates ([#74](https://github.com/GhentCDH/crouton/pull/74))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.38 (2026-08-13)

### 🚀 Features

- draft & menu visibility endpoints + frontend controls ([#69](https://github.com/GhentCDH/crouton/pull/69))
- **api:** honor sort and relation override on auto-included findOne … ([#66](https://github.com/GhentCDH/crouton/pull/66))
- **canvas:** edit field options from visual canvas via right sidebar ([#65](https://github.com/GhentCDH/crouton/pull/65))

### 🩹 Fixes

- resource schemas ([#67](https://github.com/GhentCDH/crouton/pull/67))
- deps ([#68](https://github.com/GhentCDH/crouton/pull/68))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.37 (2026-08-10)

### 🚀 Features

- update CroutonPlugin for initialization ([#53](https://github.com/GhentCDH/crouton/pull/53))
- add custom format renderer for field-level custom components ([#54](https://github.com/GhentCDH/crouton/pull/54))
- relation table renderer ([#55](https://github.com/GhentCDH/crouton/pull/55))
- support custom components in table cells ([#56](https://github.com/GhentCDH/crouton/pull/56))
- resource json editor component ([#57](https://github.com/GhentCDH/crouton/pull/57))
- relation table ([#59](https://github.com/GhentCDH/crouton/pull/59))
- expose buildviews ([867934b](https://github.com/GhentCDH/crouton/commit/867934b))
- table view canvas ([#64](https://github.com/GhentCDH/crouton/pull/64))
- **cli:** normalize schema naming ([#61](https://github.com/GhentCDH/crouton/pull/61))
- **crouton-editor-vue:** live drag-and-drop form canvas ([#58](https://github.com/GhentCDH/crouton/pull/58))
- **resource:** version resource.json with auto-migration, JSON schema & draft flag ([#60](https://github.com/GhentCDH/crouton/pull/60))

### 🩹 Fixes

- multiple http request on edit ([#49](https://github.com/GhentCDH/crouton/pull/49))
- auto-save PATCH sends only changed fields instead of full form ([#50](https://github.com/GhentCDH/crouton/pull/50))
- resolve broken relation control mapping for sub-resources ([#51](https://github.com/GhentCDH/crouton/pull/51))
- redirect to main route ([#52](https://github.com/GhentCDH/crouton/pull/52))
- order sections by sectionOrder to work findOne ([eed0148](https://github.com/GhentCDH/crouton/commit/eed0148))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.36 (2026-08-04)

### 🚀 Features

- status page ([#45](https://github.com/GhentCDH/crouton/pull/45))
- add fieldView/fieldTable column variants ([#46](https://github.com/GhentCDH/crouton/pull/46))
- **crouton-core:** configure package for npm publishing ([#43](https://github.com/GhentCDH/crouton/pull/43))

### 🩹 Fixes

- patch request ([697ea16](https://github.com/GhentCDH/crouton/commit/697ea16))
- **cli:** add generated workspace deps to frontend and backend apps ([#41](https://github.com/GhentCDH/crouton/pull/41))
- **create-crouton:** use getRuntimeConfig for API_URL in frontend template ([e1fd0d9](https://github.com/GhentCDH/crouton/commit/e1fd0d9))
- **crouton-api:** include manyToOne relations and config.include ([#42](https://github.com/GhentCDH/crouton/pull/42))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6
- Claude Opus 4.8

## 0.0.1-alpha.35 (2026-07-17)

### 🚀 Features

- relation autocomplete as normal autocomplete ([e9cd67c](https://github.com/GhentCDH/crouton/commit/e9cd67c))
- **cli:** run prisma-case-format after db pull for PascalCase
  models ([0d0ac8f](https://github.com/GhentCDH/crouton/commit/0d0ac8f))

### 🩹 Fixes

- **crouton-vue:** react to query param changes in page display
  mode ([1df4b00](https://github.com/GhentCDH/crouton/commit/1df4b00))

### ❤️ Thank You

- Bo Vandersteene
- Claude Opus 4.6

## 0.0.1-alpha.33 (2026-07-16)

### 🩹 Fixes

- resource table and display ([1a40029](https://github.com/GhentCDH/crouton/commit/1a40029))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.32 (2026-07-16)

### 🚀 Features

- add separate PUT /:id and PATCH /:id support for CRUD resources ([#40](https://github.com/GhentCDH/crouton/pull/40))

### 🩹 Fixes

- **crouton-api:** exclude manyToOne relations from _count in
  findAll ([31d0c32](https://github.com/GhentCDH/crouton/commit/31d0c32))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.31 (2026-07-16)

### 🚀 Features

- **crouton-cli:** use right package versions ([8146f3a](https://github.com/GhentCDH/crouton/commit/8146f3a))

### 🩹 Fixes

- **crouton-api:** fix display mode ([8c78375](https://github.com/GhentCDH/crouton/commit/8c78375))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.30 (2026-07-16)

### 🚀 Features

- default height for app.vue ([e34b27c](https://github.com/GhentCDH/crouton/commit/e34b27c))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.29 (2026-07-16)

### 🚀 Features

- config.json ([4e71d4c](https://github.com/GhentCDH/crouton/commit/4e71d4c))
- **crouton-cli:** init db dev ([edbe5e8](https://github.com/GhentCDH/crouton/commit/edbe5e8))

### 🩹 Fixes

- building crouton-api ([0f7a0ad](https://github.com/GhentCDH/crouton/commit/0f7a0ad))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.28 (2026-07-15)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.27 (2026-07-15)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.26 (2026-07-10)

### 🚀 Features

- **create-crouton:** add --prefix option for Nx subfolder
  layout ([9c49ef6](https://github.com/GhentCDH/crouton/commit/9c49ef6))

### 🩹 Fixes

- warning on displayvalue ([f8a8162](https://github.com/GhentCDH/crouton/commit/f8a8162))
- **create-crouton:** remove crouton-core dep, add database URL
  prompt ([fab1ea8](https://github.com/GhentCDH/crouton/commit/fab1ea8))

### ❤️ Thank You

- Bo Vandersteene
- Claude Opus 4.6

## 0.0.1-alpha.25 (2026-07-10)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.24 (2026-07-10)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.23 (2026-07-10)

### 🩹 Fixes

- publish CLI packages from dist directory ([1dad20f](https://github.com/GhentCDH/crouton/commit/1dad20f))

### ❤️ Thank You

- Bo Vandersteene
- Claude Opus 4.6

## 0.0.1-alpha.22 (2026-07-09)

### 🩹 Fixes

- scope create-crouton and add-crouton under @ghentcdh ([d41a9a3](https://github.com/GhentCDH/crouton/commit/d41a9a3))
- styling ([ed56c0e](https://github.com/GhentCDH/crouton/commit/ed56c0e))

### ❤️ Thank You

- Bo Vandersteene
- Claude Opus 4.6

## 0.0.1-alpha.21 (2026-07-09)

### 🚀 Features

- add create-crouton and add-crouton CLI tools ([#36](https://github.com/GhentCDH/crouton/pull/36))

### 🩹 Fixes

- add BigInt ([#37](https://github.com/GhentCDH/crouton/pull/37))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.20 (2026-06-30)

### 🩹 Fixes

- dropNullableFromRfequired ([ddae67c](https://github.com/GhentCDH/crouton/commit/ddae67c))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.19 (2026-06-30)

### 🩹 Fixes

- relation errors ([#34](https://github.com/GhentCDH/crouton/pull/34))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.18 (2026-06-30)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.17 (2026-06-29)

### 🩹 Fixes

- relation requirements ([15d0cfd](https://github.com/GhentCDH/crouton/commit/15d0cfd))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.16 (2026-06-29)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.15 (2026-06-29)

### 🩹 Fixes

- styling ([a36c41d](https://github.com/GhentCDH/crouton/commit/a36c41d))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.14 (2026-06-26)

### 🩹 Fixes

- styling error ([65921b0](https://github.com/GhentCDH/crouton/commit/65921b0))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.13 (2026-06-26)

### 🩹 Fixes

- cjs error ([98409f1](https://github.com/GhentCDH/crouton/commit/98409f1))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.12 (2026-06-26)

### 🩹 Fixes

- build + linking of the style.css ([c8eaf36](https://github.com/GhentCDH/crouton/commit/c8eaf36))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.11 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.10 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.9 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.8 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.7 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.6 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.5 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.4 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.3 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.2 (2026-06-24)

This was a version bump only, there were no code changes.
