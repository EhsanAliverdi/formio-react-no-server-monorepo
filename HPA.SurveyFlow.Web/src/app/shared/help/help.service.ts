import { Injectable, inject } from '@angular/core';
import { SlidePanelService } from '../components/slide-panel/slide-panel.service';
import { HelpContentComponent } from './help-content.component';
import { HelpResolverService } from './help-resolver.service';

@Injectable({ providedIn: 'root' })
export class HelpService {
  private resolver = inject(HelpResolverService);
  private slidePanel = inject(SlidePanelService);

  open(key: string): void {
    const topic = this.resolver.resolve(key);
    this.slidePanel.openComponent(
      HelpContentComponent,
      { title: topic.title, width: 'w-full sm:w-[440px]' },
      { topic },
    );
  }
}
