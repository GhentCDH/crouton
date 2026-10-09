import type { Component } from 'vue';
import { defineComponent, h } from 'vue';

function outlineIcon(paths: string[]): Component {
  return defineComponent({
    render() {
      return h(
        'svg',
        {
          xmlns: 'http://www.w3.org/2000/svg',
          fill: 'none',
          viewBox: '0 0 24 24',
          'stroke-width': '1.5',
          stroke: 'currentColor',
          'aria-hidden': 'true',
        },
        paths.map((d) =>
          h('path', {
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            d,
          }),
        ),
      );
    },
  });
}

const Bars3Icon = outlineIcon(['M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5']);
const BarsArrowDownIcon = outlineIcon([
  'M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21 21 17.25',
]);
const BarsArrowUpIcon = outlineIcon([
  'M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12',
]);
const CheckIcon = outlineIcon(['m4.5 12.75 6 6 9-13.5']);
const ChevronDoubleLeftIcon = outlineIcon([
  'm18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5',
]);
const ChevronDoubleRightIcon = outlineIcon([
  'm5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5',
]);
const ChevronDownIcon = outlineIcon(['m19.5 8.25-7.5 7.5-7.5-7.5']);
const ChevronLeftIcon = outlineIcon(['M15.75 19.5 8.25 12l7.5-7.5']);
const ChevronRightIcon = outlineIcon(['m8.25 4.5 7.5 7.5-7.5 7.5']);
const ChevronUpIcon = outlineIcon(['m4.5 15.75 7.5-7.5 7.5 7.5']);
const DocumentTextIcon = outlineIcon([
  'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
]);
const EyeIcon = outlineIcon([
  'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z',
  'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
]);
const FunnelIcon = outlineIcon([
  'M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z',
]);
const LanguageIcon = outlineIcon([
  'm10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802',
]);
const LinkIcon = outlineIcon([
  'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244',
]);
const PaperClipIcon = outlineIcon([
  'm18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13',
]);
const PencilSquareIcon = outlineIcon([
  'm16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10',
]);
const PlusCircleIcon = outlineIcon([
  'M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
]);
const TrashIcon = outlineIcon([
  'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
]);
const XMarkIcon = outlineIcon(['M6 18 18 6M6 6l12 12']);
const ArrowPathIcon = outlineIcon([
  'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99',
]);
const Filter = outlineIcon([
  'M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z',
]);

export enum IconEnum {
  Edit = 'Edit',
  Delete = 'Delete',
  BarsArrowDown = 'BarsArrowDown',
  BarsArrowUp = 'BarsArrowUp',
  Funnel = 'Funnel',
  Close = 'Close',
  Plus = 'Plus',
  PaperClip = 'PaperClip',
  Hamburger = 'Hamburger',
  ChevronRight = 'ChevronRight',
  ChevronLeft = 'ChevronLeft',
  ChevronDown = 'ChevronDown',
  ChevronUp = 'ChevronUp',
  DblChevronLeft = 'DblChevronLeft',
  DblChevronRight = 'DblChevronRight',
  Language = 'Language',
  Check = 'Check',
  View = 'View',
  Text = 'Text',
  Link = 'Link',
  Filter = 'Filter',
  Sync = 'Sync',
}

export const IconMap: Record<IconEnum, Component> = {
  Edit: PencilSquareIcon,
  Delete: TrashIcon,
  BarsArrowDown: BarsArrowDownIcon,
  BarsArrowUp: BarsArrowUpIcon,
  Funnel: FunnelIcon,
  Close: XMarkIcon,
  Plus: PlusCircleIcon,
  PaperClip: PaperClipIcon,
  Hamburger: Bars3Icon,
  ChevronRight: ChevronRightIcon,
  ChevronLeft: ChevronLeftIcon,
  ChevronDown: ChevronDownIcon,
  ChevronUp: ChevronUpIcon,
  DblChevronLeft: ChevronDoubleLeftIcon,
  DblChevronRight: ChevronDoubleRightIcon,
  Language: LanguageIcon,
  Check: CheckIcon,
  View: EyeIcon,
  Text: DocumentTextIcon,
  Link: LinkIcon,
  Filter,
  Sync: ArrowPathIcon,
};

export type IconDef = keyof typeof IconMap;

export type IconProp = IconDef | Component;
