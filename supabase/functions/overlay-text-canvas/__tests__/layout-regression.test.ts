import { describe, expect, it } from 'vitest';
import {
  getFooterLayoutProfile,
  getLayoutBehavior,
  getRatioProfile,
  getTextScaleTokens,
  resolveBlockWidth,
  resolveContentWidth,
  resolveWidthToken,
  TEST_THEME,
} from '../layout-helpers.ts';
import { COMMON_RATIOS, LAYOUT_REGRESSION_FIXTURES, type RatioKey } from './layout-regression.fixtures.ts';

describe('overlay-text-canvas layout regression matrix', () => {
  for (const fixture of LAYOUT_REGRESSION_FIXTURES) {
    describe(fixture.id, () => {
      for (const [ratioKey, ratio] of Object.entries(COMMON_RATIOS) as Array<[RatioKey, { width: number; height: number }]>) {
        it(`${ratioKey} keeps anti-overflow behavior stable`, () => {
          const profile = getRatioProfile(ratio.width, ratio.height);
          const behavior = getLayoutBehavior(ratio.width, ratio.height, profile, fixture.elements);
          const expectation = fixture.expectations[ratioKey];
          const elementCount = [
            fixture.elements.banner,
            fixture.elements.heroText,
            fixture.elements.headline,
            fixture.elements.cards,
            fixture.elements.summaryRibbon,
            fixture.elements.cta,
            fixture.elements.footer,
          ].filter(Boolean).length;
          const textTokens = getTextScaleTokens(profile, TEST_THEME, elementCount, fixture.templateId === 'education_infographic');
          const contentWidth = resolveContentWidth(ratio.width, profile);

          expect(behavior.forceStack).toBe(expectation.forceStack);
          expect(behavior.useCompactSectionGap).toBe(expectation.useCompactSectionGap);
          expect(behavior.cardsShouldStack).toBe(expectation.cardsShouldStack);

          const headlineWidth = resolveBlockWidth(ratio.width, profile, profile.headlineMaxWidth, textTokens.headlinePaddingX);
          const ctaWidth = resolveBlockWidth(ratio.width, profile, profile.ctaMaxWidth, textTokens.ctaPaddingX);
          const footerWidth = resolveBlockWidth(ratio.width, profile, profile.footerMaxWidth, Math.round(textTokens.footerFont));

          expect(headlineWidth).toBeLessThanOrEqual(contentWidth);
          expect(ctaWidth).toBeLessThanOrEqual(contentWidth);
          expect(footerWidth).toBeLessThanOrEqual(contentWidth);
          expect(headlineWidth).toBeGreaterThan(0);
          expect(ctaWidth).toBeGreaterThan(0);

          if (fixture.elements.summaryRibbon) {
            const ribbonWidth = resolveBlockWidth(ratio.width, profile, profile.contentMaxWidth, 24);
            expect(ribbonWidth).toBeLessThanOrEqual(contentWidth);
          }

          if (fixture.elements.footer?.items.length) {
            const footerProfile = getFooterLayoutProfile(ratio.width, ratio.height, fixture.elements.footer.items, fixture.logoMeta);
            if (expectation.allowedFooterModes) {
              expect(expectation.allowedFooterModes).toContain(footerProfile.mode);
            }
            if (fixture.logoMeta?.position === 'bottom-center') {
              expect(footerProfile.minBottomClearance).toBeGreaterThan(20);
              expect(footerProfile.paddingBottom).toBeGreaterThan(0);
            }
          }
        });
      }
    });
  }
});

describe('overlay-text-canvas width and token guards', () => {
  it('tall ratios resolve narrower headline width than landscape', () => {
    const tall = getRatioProfile(COMMON_RATIOS.tall.width, COMMON_RATIOS.tall.height);
    const landscape = getRatioProfile(COMMON_RATIOS.landscape.width, COMMON_RATIOS.landscape.height);

    expect(resolveWidthToken(COMMON_RATIOS.tall.width, tall.headlineMaxWidth)).toBeLessThan(
      resolveWidthToken(COMMON_RATIOS.landscape.width, landscape.headlineMaxWidth),
    );
  });

  it('tall ratio text tokens stay more compact than landscape for headline and CTA', () => {
    const tall = getTextScaleTokens(getRatioProfile(1080, 1920), TEST_THEME, 5, false);
    const landscape = getTextScaleTokens(getRatioProfile(1920, 1080), TEST_THEME, 5, false);

    expect(tall.headlineFont).toBeLessThanOrEqual(landscape.headlineFont);
    expect(tall.ctaFont).toBeLessThanOrEqual(landscape.ctaFont);
    expect(tall.footerFont).toBeLessThanOrEqual(landscape.footerFont);
  });

  it('very long footer with bottom-center logo never stays single-row on narrow canvases', () => {
    const footerItems = [
      { icon: 'phone', text: '0909 123 456' },
      { icon: 'mail', text: 'hello@flowa.one' },
      { icon: 'globe', text: 'flowa.one' },
      { icon: 'map-pin', text: '123 Nguyễn Huệ, phường Bến Nghé, Quận 1, TP.HCM, gần trục trung tâm và thuận tiện đỗ xe' },
    ];
    const logoMeta = { position: 'bottom-center', sizePercent: 16, padding: 24 };

    expect(getFooterLayoutProfile(1080, 1080, footerItems, logoMeta).mode).not.toBe('single-row');
    expect(getFooterLayoutProfile(1080, 1920, footerItems, logoMeta).mode).toBe('vertical-compact');
  });
});