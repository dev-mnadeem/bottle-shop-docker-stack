import { describe, expect, it } from 'vitest';
import { resolveProductImageUrl } from '../images';
import { leadSchema } from '../leadSchema';
import { catalogueKey, formatPrice } from '../products';

describe('catalogueKey', () => {
  it('spells out the defaults so SSR and the browser ask for the same URL', () => {
    expect(catalogueKey({})).toBe('/products?page=1&limit=12&sort=newest');
  });

  it('adds the search term only when there is one', () => {
    expect(catalogueKey({ q: 'steel', sort: 'price_asc', page: 2 })).toBe(
      '/products?page=2&limit=12&sort=price_asc&q=steel',
    );
    expect(catalogueKey({ q: '' })).not.toContain('q=');
  });
});

describe('formatPrice', () => {
  it('formats integer minor units as dollars', () => {
    expect(formatPrice(1499)).toBe('$14.99');
    expect(formatPrice(0)).toBe('$0.00');
  });
});

describe('resolveProductImageUrl', () => {
  it('roots a relative public path', () => {
    expect(resolveProductImageUrl('products/mug-350.svg')).toBe('/products/mug-350.svg');
    expect(resolveProductImageUrl('/products/mug-350.svg')).toBe('/products/mug-350.svg');
  });

  it('passes an absolute URL through and falls back when empty', () => {
    expect(resolveProductImageUrl('https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png',
    );
    expect(resolveProductImageUrl('')).toBe('/products/glass-500.svg');
  });
});

describe('leadSchema', () => {
  const valid = { name: 'Al', email: 'al@example.com', message: 'Interested in the carafe.' };

  it('accepts what the API accepts', () => {
    expect(leadSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a whitespace-only message, as the API does', () => {
    expect(leadSchema.safeParse({ ...valid, message: '   ' }).success).toBe(false);
  });

  it('rejects a message over the 2000-character API limit', () => {
    expect(leadSchema.safeParse({ ...valid, message: 'x'.repeat(2001) }).success).toBe(false);
  });
});
