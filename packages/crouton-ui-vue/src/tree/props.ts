export interface TreeNode {
  id: string;
  label: string;
  tag?: string;
  children?: TreeNode[];
}

export type TreeProps = {
  data: TreeNode[];
  active?: string;
};

export type TreeEmits = {
  select: [node: TreeNode];
};
