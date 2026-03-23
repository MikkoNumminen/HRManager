import messages from "../../../messages/en.json";

type NestedMessages = Record<string, string | Record<string, string>>;
const typedMessages = messages as NestedMessages;

function substitute(template: string, values?: Record<string, unknown>): string {
  if (!values) return template;
  return template.replace(/{(\w+)}/g, (_, k) => String(values[k] ?? `{${k}}`));
}

export async function getTranslations(namespace: string) {
  const ns = typedMessages[namespace] as Record<string, string> | undefined;
  return function t(key: string, values?: Record<string, unknown>): string {
    const template = ns?.[key] ?? `${namespace}.${key}`;
    return substitute(template, values);
  };
}
