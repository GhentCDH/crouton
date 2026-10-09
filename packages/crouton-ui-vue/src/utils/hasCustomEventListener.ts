import { camelize, getCurrentInstance, toHandlerKey } from 'vue';

function normalizeEventName(eventName: string) {
  return eventName
    .replace(/[:\s_-]+(.)/g, (_, char: string) => char.toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

export function hasCustomEventListener(eventName: string) {
  const instance = getCurrentInstance();
  if (!instance) {
    return false;
  }

  const props = instance.vnode.props;
  if (!props) {
    return false;
  }

  const normalized = normalizeEventName(eventName);
  const camelized = camelize(eventName);

  const possibleKeys = [
    toHandlerKey(eventName),
    toHandlerKey(camelized),
    toHandlerKey(normalized),
    `on:${eventName}`,
    `on:${camelized}`,
    `on:${normalized}`,
  ];

  return possibleKeys.some((key) =>
    Boolean((props as Record<string, unknown>)[key]),
  );
}
