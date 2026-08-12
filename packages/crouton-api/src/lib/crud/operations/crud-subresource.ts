import { def } from './decorator.utils';
import type { CrudRepository } from '../crud-repository.factory';

export const deleteChild = () => {
  return;
  def(
    cls,
    methodName,
    async function (
      this: { repo: CrudRepository },
      parentId: string,
      childId: string,
    ) {
      return deleteChild(this.repo, sub, childId, parentId);
    },
  );
};
