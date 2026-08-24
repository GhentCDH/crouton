/**
 * NestJS interceptor: parse `Accept-Language`, resolve against supported
 * languages, store in AsyncLocalStorage, set `Vary` and `Content-Language`
 * response headers.
 */

import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';

import { resolveLanguage } from '@ghentcdh/crouton-core';

import { TranslationRegistry } from './translation.registry';
import { runWithLanguage } from './language.context';

@Injectable()
export class LanguageInterceptor implements NestInterceptor {
  constructor(private readonly registry: TranslationRegistry) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    const acceptLanguage = request.headers['accept-language'] as
      | string
      | undefined;
    const resolved = resolveLanguage(
      acceptLanguage,
      this.registry.languages,
      this.registry.defaultLanguage,
    );

    response.setHeader('Vary', 'Accept-Language');
    response.setHeader('Content-Language', resolved);

    return runWithLanguage(resolved, () => next.handle());
  }
}
