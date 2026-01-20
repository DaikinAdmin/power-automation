declare module '@editorjs/header' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';

  export interface HeaderConfig {
    placeholder?: string;
    levels?: number[];
    defaultLevel?: number;
  }

  export interface HeaderData {
    text: string;
    level: number;
  }

  export default class Header implements BlockTool {
    constructor(options: BlockToolConstructorOptions<HeaderData, HeaderConfig>);
    render(): HTMLElement;
    save(blockContent: HTMLElement): HeaderData;
    validate(savedData: HeaderData): boolean;
    static get toolbox(): { icon: string; title: string };
  }
}

declare module '@editorjs/paragraph' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';

  export interface ParagraphConfig {
    placeholder?: string;
    preserveBlank?: boolean;
  }

  export interface ParagraphData {
    text: string;
  }

  export default class Paragraph implements BlockTool {
    constructor(options: BlockToolConstructorOptions<ParagraphData, ParagraphConfig>);
    render(): HTMLElement;
    save(blockContent: HTMLElement): ParagraphData;
    static get toolbox(): { icon: string; title: string };
  }
}

declare module '@editorjs/list' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';

  export interface ListConfig {
    defaultStyle?: 'ordered' | 'unordered';
  }

  export interface ListData {
    style: 'ordered' | 'unordered';
    items: string[];
  }

  export default class List implements BlockTool {
    constructor(options: BlockToolConstructorOptions<ListData, ListConfig>);
    render(): HTMLElement;
    save(blockContent: HTMLElement): ListData;
    static get toolbox(): { icon: string; title: string };
  }
}

declare module '@editorjs/quote' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';

  export interface QuoteConfig {
    quotePlaceholder?: string;
    captionPlaceholder?: string;
  }

  export interface QuoteData {
    text: string;
    caption: string;
    alignment: 'left' | 'center';
  }

  export default class Quote implements BlockTool {
    constructor(options: BlockToolConstructorOptions<QuoteData, QuoteConfig>);
    render(): HTMLElement;
    save(blockContent: HTMLElement): QuoteData;
    static get toolbox(): { icon: string; title: string };
  }
}

declare module '@editorjs/code' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';

  export interface CodeConfig {
    placeholder?: string;
  }

  export interface CodeData {
    code: string;
  }

  export default class Code implements BlockTool {
    constructor(options: BlockToolConstructorOptions<CodeData, CodeConfig>);
    render(): HTMLElement;
    save(blockContent: HTMLElement): CodeData;
    static get toolbox(): { icon: string; title: string };
  }
}

declare module '@editorjs/warning' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';

  export interface WarningConfig {
    titlePlaceholder?: string;
    messagePlaceholder?: string;
  }

  export interface WarningData {
    title: string;
    message: string;
  }

  export default class Warning implements BlockTool {
    constructor(options: BlockToolConstructorOptions<WarningData, WarningConfig>);
    render(): HTMLElement;
    save(blockContent: HTMLElement): WarningData;
    static get toolbox(): { icon: string; title: string };
  }
}

declare module '@editorjs/delimiter' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';

  export default class Delimiter implements BlockTool {
    constructor(options: BlockToolConstructorOptions);
    render(): HTMLElement;
    save(): {};
    static get toolbox(): { icon: string; title: string };
  }
}

declare module '@editorjs/table' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';

  export interface TableConfig {
    rows?: number;
    cols?: number;
    withHeadings?: boolean;
  }

  export interface TableData {
    withHeadings: boolean;
    content: string[][];
  }

  export default class Table implements BlockTool {
    constructor(options: BlockToolConstructorOptions<TableData, TableConfig>);
    render(): HTMLElement;
    save(blockContent: HTMLElement): TableData;
    static get toolbox(): { icon: string; title: string };
  }
}

declare module '@editorjs/checklist' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';

  export interface ChecklistConfig {}

  export interface ChecklistItem {
    text: string;
    checked: boolean;
  }

  export interface ChecklistData {
    items: ChecklistItem[];
  }

  export default class Checklist implements BlockTool {
    constructor(options: BlockToolConstructorOptions<ChecklistData, ChecklistConfig>);
    render(): HTMLElement;
    save(blockContent: HTMLElement): ChecklistData;
    static get toolbox(): { icon: string; title: string };
  }
}

declare module '@editorjs/raw' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';

  export interface RawConfig {
    placeholder?: string;
  }

  export interface RawData {
    html: string;
  }

  export default class Raw implements BlockTool {
    constructor(options: BlockToolConstructorOptions<RawData, RawConfig>);
    render(): HTMLElement;
    save(blockContent: HTMLElement): RawData;
    static get toolbox(): { icon: string; title: string };
  }
}
