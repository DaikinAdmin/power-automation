// lib/content-placeholders.ts
import { DomainConfig } from './domain-config';

export function replacePlaceholders(text: string, config: DomainConfig): string {
  return text
    .replace(/\{\{phone\}\}/g, config.contacts.phoneFormatted)
    .replace(/\{\{email\}\}/g, config.contacts.email)
    .replace(/\{\{address\}\}/g, config.contacts.address.join(", "))
    .replace(/\{\{siteName\}\}/g, config.siteName);
}

// EditorJS List v2 stores items as objects: { content: string, items: NestedItem[], meta?: any }
// Older List v1 and simple lists store items as plain strings
function processListItem(item: any, config: DomainConfig): any {
  if (typeof item === 'string') {
    return replacePlaceholders(item, config);
  }
  return {
    ...item,
    ...(item.content !== undefined && {
      content: replacePlaceholders(item.content, config),
    }),
    ...(item.text !== undefined && {
      text: replacePlaceholders(item.text, config),
    }),
    ...(Array.isArray(item.items) && {
      items: item.items.map((sub: any) => processListItem(sub, config)),
    }),
  };
}

export function processEditorJSContent(
  content: { blocks: any[]; version?: string; time?: number },
  config: DomainConfig
) {
  return {
    ...content,
    blocks: content.blocks.map((block) => ({
      ...block,
      data: {
        ...block.data,
        ...(block.data.text && {
          text: replacePlaceholders(block.data.text, config),
        }),
        ...(block.data.caption && {
          caption: replacePlaceholders(block.data.caption, config),
        }),
        ...(block.data.title && {
          title: replacePlaceholders(block.data.title, config),
        }),
        ...(block.data.message && {
          message: replacePlaceholders(block.data.message, config),
        }),
        ...(Array.isArray(block.data.items) && {
          items: block.data.items.map((item: any) => processListItem(item, config)),
        }),
        ...(Array.isArray(block.data.content) && {
          content: block.data.content.map((row: any) =>
            Array.isArray(row)
              ? row.map((cell: string) => (typeof cell === 'string' ? replacePlaceholders(cell, config) : cell))
              : row
          ),
        }),
      },
    })),
  };
}