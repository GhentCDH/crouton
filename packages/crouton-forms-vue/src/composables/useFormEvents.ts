import { type InjectionKey, inject, provide } from 'vue';

/**
 * Event names that renderers can dispatch up to the form host. Expand this
 * union as new events are needed.
 */
export type FormEventName = 'create' | 'view';

/**
 * Payload passed along with every form event. `type` is user-defined (e.g.
 * `'author'`, `'keyword'`) so the host can decide what entity to act on.
 */
export type FormEventPayload<TData = any, TResult = any> = {
  event: FormEventName;
  type: string;
  data?: TData;
  id?: string | number;
  options?: Record<string, any>;
  onSuccess?: (result: TResult) => void;
  onError?: (error: unknown) => void;
};

export type FormEventDispatch = <TData = any, TResult = any>(
  payload: FormEventPayload<TData, TResult>,
) => void;

export type FormEvents = {
  dispatch: FormEventDispatch;
};

const createFormEvents = (dispatch: FormEventDispatch): FormEvents => ({
  dispatch,
});

const FORM_EVENTS_KEY: InjectionKey<FormEvents> = Symbol('json-forms:events');

/**
 * Bootstraps the form event helper and provides it to descendant renderers.
 * Call this in the component that hosts `<JsonForms>`, passing a dispatch
 * function (typically a wrapper around the component's Vue `emit`) so events
 * bubble up to the parent.
 */
export const provideFormEvents = (dispatch: FormEventDispatch): FormEvents => {
  const events = createFormEvents(dispatch);
  provide(FORM_EVENTS_KEY, events);
  return events;
};

/**
 * Inject the form events helper inside a custom control renderer. Returns a
 * no-op when no provider is found, so renderers stay safe to use standalone.
 */
export const useFormEvents = (): FormEvents => {
  return inject(
    FORM_EVENTS_KEY,
    createFormEvents(() => {
      // placeholder
    }),
  );
};
