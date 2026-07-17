import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TitleCasePipe } from '@angular/common';

import type { FeedItem } from '../../../../shared/models';

@Component({
  selector: 'app-feed-card',
  imports: [TitleCasePipe],
  templateUrl: './feed-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedCard {
  readonly item = input.required<FeedItem>();
  readonly selected = input(false);
  readonly active = input(false);
  readonly canRequest = input(false);

  readonly open = output<FeedItem>();
  readonly toggle = output<string>();
}
