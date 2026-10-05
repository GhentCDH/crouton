const ROWS = [
  { id: 'e1', groupId: 'g1', label: 'Groceries', amount: 42.5 },
  { id: 'e2', groupId: 'g1', label: 'Train', amount: 18 },
];

const repository = {
  findAllByParent: async (groupId: string, params: any, ctx: any) => {
    const rows = ROWS.filter((r) => r.groupId === groupId);
    return { data: rows, count: rows.length };
  },
  findOneByParent: async (groupId: string, id: string) =>
    ROWS.find((r) => r.groupId === groupId && r.id === id) ?? null,
  createByParent: async (groupId: string, data: any) => ({ id: 'e9', groupId, ...data }),
  updateByParent: async (groupId: string, id: string, data: any) => ({ id, groupId, ...data }),
  deleteByParent: async (groupId: string, id: string) => ({ id, groupId }),
};

export default repository;
