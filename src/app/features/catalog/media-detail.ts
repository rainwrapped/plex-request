import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TitleCasePipe } from '@angular/common';

import type { FeedItem, MediaDetails } from '../../../../shared/models';

@Component({
  selector: 'app-media-detail',
  imports: [TitleCasePipe],
  templateUrl: './media-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaDetail {
  readonly item = input<FeedItem | null>(null);
  readonly details = input<MediaDetails | null>(null);
  readonly loading = input(false);

  protected buildImdbSearchUrl(title: string, year: number): string {
    return `https://www.imdb.com/find/?q=${encodeURIComponent(`${title} ${year}`)}`;
  }

  protected buildRottenTomatoesSearchUrl(title: string, year: number): string {
    return `https://www.rottentomatoes.com/search?search=${encodeURIComponent(`${title} ${year}`)}`;
  }
}
