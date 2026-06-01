import { Injectable } from '@angular/core';
import { HELP_CATALOG } from './help.catalog';
import { HelpTopic } from './help.models';

@Injectable({ providedIn: 'root' })
export class HelpResolverService {
  resolve(key: string): HelpTopic {
    return HELP_CATALOG[key as keyof typeof HELP_CATALOG] ?? {
      key,
      title: 'Help unavailable',
      sections: [
        {
          paragraphs: [`No help content is registered for "${key}".`],
        },
      ],
    };
  }
}
