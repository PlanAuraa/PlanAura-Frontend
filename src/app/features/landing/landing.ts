import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ServiceCategory } from '../../core/interfaces/vendor.model';
import { ServiceCategoryService } from '../../core/services/service-category.service';

/**
 * Fallback Material Symbols per category slug — same small lookup Home uses
 * for its own category tiles, duplicated rather than imported so this page
 * has no dependency on Home (which must stay untouched).
 */
const CATEGORY_ICON_FALLBACKS: Record<string, string> = {
  venue: 'location_city',
  venues: 'location_city',
  catering: 'restaurant',
  caterer: 'restaurant',
  photography: 'photo_camera',
  photographer: 'photo_camera',
  videography: 'videocam',
  decor: 'local_florist',
  decoration: 'local_florist',
  florist: 'local_florist',
  music: 'music_note',
  entertainment: 'music_note',
  dj: 'music_note',
  makeup: 'face_retouching_natural',
  beauty: 'face_retouching_natural',
  planning: 'event_available',
  'event-planning': 'event_available',
  cake: 'cake',
  bakery: 'cake',
  transportation: 'directions_car',
  transport: 'directions_car',
};
const DEFAULT_CATEGORY_ICON = 'celebration';

/**
 * Public, pre-login landing page — what an anonymous visitor sees at '/'
 * (RootPage renders this instead of the client-only Home). Only calls
 * [AllowAnonymous] endpoints: GET /api/servicecategories is public, but
 * GET /api/vendors (vendor browse/"featured vendors") is ClientOnly, so
 * there's no live vendor data here — every CTA routes to /auth instead of
 * trying to show vendors pre-login.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing implements OnInit {
  private readonly categoryService = inject(ServiceCategoryService);

  protected readonly categories = signal<ServiceCategory[]>([]);
  protected readonly failedCategoryImages = signal<ReadonlySet<number>>(new Set());

  ngOnInit(): void {
    this.categoryService.getActiveCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
  }

  protected categoryIcon(slug: string): string {
    return CATEGORY_ICON_FALLBACKS[slug.toLowerCase()] ?? DEFAULT_CATEGORY_ICON;
  }

  protected onCategoryImageError(categoryId: number): void {
    this.failedCategoryImages.update((current) => new Set(current).add(categoryId));
  }
}
