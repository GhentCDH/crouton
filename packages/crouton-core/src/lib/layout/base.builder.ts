import type { ElementBuilder } from './layout.builder';

export abstract class Builder<TYPE> {
  constructor(protected readonly type: string) {}
  abstract build(): TYPE;
}

export abstract class BuilderWithElements<TYPE, CONTROL_TYPE> extends Builder<TYPE> {
  protected elements: Array<ElementBuilder<CONTROL_TYPE>> = [];

  addControl(control: ElementBuilder<CONTROL_TYPE>) {
    this.elements.push(control);
    return this;
  }

  addControls(...controls: Array<ElementBuilder<CONTROL_TYPE>>) {
    this.elements.push(...controls);
    return this;
  }

  protected buildElements() {
    return this.elements.map((e) => e.build());
  }
}
