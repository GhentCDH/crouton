import { type CanActivate, Injectable, type Type } from '@nestjs/common';

@Injectable()
export class SecurityGuardRegistry {
  constructor(
    private readonly guards: Record<string, Type<CanActivate>> = {},
  ) {}

  resolve(name: string): Type<CanActivate> {
    const g = this.guards[name];
    if (!g)
      throw new Error(
        `Unknown security guard "${name}". Register it in security.guards.`,
      );
    return g;
  }

  classes(): Type<CanActivate>[] {
    return Object.values(this.guards);
  }
}
