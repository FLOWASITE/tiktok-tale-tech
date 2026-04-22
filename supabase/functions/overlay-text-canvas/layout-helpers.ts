export type FooterLayoutMode = 'single-row' | 'two-row' | 'vertical-compact';

export type RatioKind = 'landscape' | 'square' | 'portrait' | 'tall';

export interface LogoMeta {
  position: string;
  sizePercent: number;
  padding: number;
}

export interface RatioProfile {
  kind: RatioKind;
  ratio: number;
  sizeBasis: number;
  contentMaxWidth: string;
  headlineMaxWidth: string;
  ctaMaxWidth: string;
  footerMaxWidth: string;
  sectionGap: number;
  compactSectionGap: number;
  inlineGap: number;
  outerPadding: number;
  safeBottomMultiplier: number;
  fontScale: number;
  compactness: number;
  bannerPaddingX: number;
  bannerPaddingY: number;
  heroPadding: number;
  cardGap: number;
  cardPaddingX: number;
  cardPaddingY: number;
  ribbonPaddingX: number;
  ribbonPaddingY: number;
  splitGap: number;
  splitPaddingX: number;
  footerTopGap: number;
  leftColumnWidth: string;
  rightColumnWidth: string;
}

export interface FooterLayoutProfile {
  mode: FooterLayoutMode;
  fontSize: number;
  itemGap: number;
  rowGap: number;
  paddingX: number;
  paddingY: number;
  paddingBottom: number;
  maxItemWidth: string;
  justifyContent: 'center' | 'flex-start';
  alignItems: 'center' | 'flex-start';
  flexDirection: 'row' | 'column';
  allowWrap: boolean;
  minBottomClearance: number;
}

export interface BottomCenterLogoSafeArea {
  logoSafeWidth: number;
  logoSafeHeight: number;
  ctaMarginBottom: number;
  footerMinPaddingBottom: number;
  footerMinTextClearance: number;
}

export interface LayoutBehavior {
  forceStack: boolean;
  forceCompact: boolean;
  useCompactSectionGap: boolean;
  cardsShouldStack: boolean;
  heroShouldStack: boolean;
  splitAlign: 'center' | 'stretch';
  rootJustify: 'center' | 'flex-start';
}

export interface LayoutElements {
  banner?: { text: string; bgColor: string; position: 'top' | 'bottom' };
  heroText?: { text: string; fontSize: 'xl' | '2xl' | '3xl'; effect: 'none' | 'gradient' };
  cards?: { items: { icon?: string; label: string; description?: string; number?: number }[]; layout: 'grid-2x2' | 'horizontal' | 'vertical' };
  headline?: string;
  cta?: string;
  footer?: { items: Array<{ icon?: string; text: string }> };
  summaryRibbon?: { text: string; bgColor?: string };
}

export interface TextScaleTokens {
  bannerFont: number;
  heroFont: number;
  heroCircle: number;
  heroSplitCircle: number;
  heroSideFont: number;
  headlineFont: number;
  headlinePaddingY: number;
  headlinePaddingX: number;
  ctaFont: number;
  ctaPaddingY: number;
  ctaPaddingX: number;
  cardTitleFont: number;
  cardDescFont: number;
  cardNumberSize: number;
  ribbonFont: number;
  footerFont: number;
}

export interface ThemeSpacingInput {
  spacingMultiplier: number;
}

export interface SpacingTokens {
  sectionGap: number;
  compactSectionGap: number;
  inlineGap: number;
  bannerPaddingX: number;
  bannerPaddingY: number;
  heroPadding: number;
  cardGap: number;
  cardPaddingX: number;
  cardPaddingY: number;
  denseCardPaddingX: number;
  denseCardPaddingY: number;
  ribbonPaddingX: number;
  ribbonPaddingY: number;
  ribbonAccentGap: number;
  ribbonAccentWidth: number;
  splitGap: number;
  splitPaddingX: number;
  footerTopGap: number;
  footerItemGap: number;
  footerRowGap: number;
  footerPaddingX: number;
  footerPaddingY: number;
  footerEdgeInset: number;
  leftColumnWidth: string;
  rightColumnWidth: string;
}

export const TEST_THEME: ThemeSpacingInput = {
  spacingMultiplier: 1,
};

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getRatioProfile(imageWidth: number, imageHeight: number): RatioProfile {
  const ratio = imageWidth / Math.max(imageHeight, 1);
  const sizeBasis = Math.min(imageWidth, imageHeight);

  if (ratio <= 0.62) {
    return {
      kind: 'tall',
      ratio,
      sizeBasis,
      contentMaxWidth: '82%',
      headlineMaxWidth: '78%',
      ctaMaxWidth: '72%',
      footerMaxWidth: '86%',
      sectionGap: Math.round(sizeBasis * 0.024),
      compactSectionGap: Math.round(sizeBasis * 0.018),
      inlineGap: Math.round(sizeBasis * 0.012),
      outerPadding: Math.round(sizeBasis * 0.05),
      safeBottomMultiplier: 1.28,
      fontScale: 0.9,
      compactness: 1.18,
      bannerPaddingX: Math.round(sizeBasis * 0.042),
      bannerPaddingY: Math.round(sizeBasis * 0.02),
      heroPadding: Math.round(sizeBasis * 0.034),
      cardGap: Math.round(sizeBasis * 0.014),
      cardPaddingX: Math.round(sizeBasis * 0.032),
      cardPaddingY: Math.round(sizeBasis * 0.022),
      ribbonPaddingX: Math.round(sizeBasis * 0.044),
      ribbonPaddingY: Math.round(sizeBasis * 0.02),
      splitGap: Math.round(sizeBasis * 0.022),
      splitPaddingX: Math.round(sizeBasis * 0.04),
      footerTopGap: Math.round(sizeBasis * 0.018),
      leftColumnWidth: '100%',
      rightColumnWidth: '100%',
    };
  }

  if (ratio < 0.9) {
    return {
      kind: 'portrait',
      ratio,
      sizeBasis,
      contentMaxWidth: '86%',
      headlineMaxWidth: '82%',
      ctaMaxWidth: '76%',
      footerMaxWidth: '90%',
      sectionGap: Math.round(sizeBasis * 0.026),
      compactSectionGap: Math.round(sizeBasis * 0.02),
      inlineGap: Math.round(sizeBasis * 0.013),
      outerPadding: Math.round(sizeBasis * 0.048),
      safeBottomMultiplier: 1.16,
      fontScale: 0.96,
      compactness: 1.08,
      bannerPaddingX: Math.round(sizeBasis * 0.04),
      bannerPaddingY: Math.round(sizeBasis * 0.018),
      heroPadding: Math.round(sizeBasis * 0.03),
      cardGap: Math.round(sizeBasis * 0.015),
      cardPaddingX: Math.round(sizeBasis * 0.03),
      cardPaddingY: Math.round(sizeBasis * 0.02),
      ribbonPaddingX: Math.round(sizeBasis * 0.042),
      ribbonPaddingY: Math.round(sizeBasis * 0.019),
      splitGap: Math.round(sizeBasis * 0.02),
      splitPaddingX: Math.round(sizeBasis * 0.038),
      footerTopGap: Math.round(sizeBasis * 0.02),
      leftColumnWidth: '100%',
      rightColumnWidth: '100%',
    };
  }

  if (ratio <= 1.1) {
    return {
      kind: 'square',
      ratio,
      sizeBasis,
      contentMaxWidth: '88%',
      headlineMaxWidth: '84%',
      ctaMaxWidth: '80%',
      footerMaxWidth: '92%',
      sectionGap: Math.round(sizeBasis * 0.028),
      compactSectionGap: Math.round(sizeBasis * 0.021),
      inlineGap: Math.round(sizeBasis * 0.014),
      outerPadding: Math.round(sizeBasis * 0.046),
      safeBottomMultiplier: 1.08,
      fontScale: 1,
      compactness: 1,
      bannerPaddingX: Math.round(sizeBasis * 0.038),
      bannerPaddingY: Math.round(sizeBasis * 0.018),
      heroPadding: Math.round(sizeBasis * 0.028),
      cardGap: Math.round(sizeBasis * 0.016),
      cardPaddingX: Math.round(sizeBasis * 0.028),
      cardPaddingY: Math.round(sizeBasis * 0.019),
      ribbonPaddingX: Math.round(sizeBasis * 0.04),
      ribbonPaddingY: Math.round(sizeBasis * 0.018),
      splitGap: Math.round(sizeBasis * 0.018),
      splitPaddingX: Math.round(sizeBasis * 0.036),
      footerTopGap: Math.round(sizeBasis * 0.02),
      leftColumnWidth: '100%',
      rightColumnWidth: '100%',
    };
  }

  return {
    kind: 'landscape',
    ratio,
    sizeBasis,
    contentMaxWidth: '90%',
    headlineMaxWidth: '86%',
    ctaMaxWidth: 'max-content',
    footerMaxWidth: '94%',
    sectionGap: Math.round(sizeBasis * 0.03),
    compactSectionGap: Math.round(sizeBasis * 0.022),
    inlineGap: Math.round(sizeBasis * 0.015),
    outerPadding: Math.round(sizeBasis * 0.042),
    safeBottomMultiplier: 1,
    fontScale: 1.08,
    compactness: 0.92,
    bannerPaddingX: Math.round(sizeBasis * 0.034),
    bannerPaddingY: Math.round(sizeBasis * 0.016),
    heroPadding: Math.round(sizeBasis * 0.026),
    cardGap: Math.round(sizeBasis * 0.017),
    cardPaddingX: Math.round(sizeBasis * 0.026),
    cardPaddingY: Math.round(sizeBasis * 0.018),
    ribbonPaddingX: Math.round(sizeBasis * 0.036),
    ribbonPaddingY: Math.round(sizeBasis * 0.017),
    splitGap: Math.round(sizeBasis * 0.022),
    splitPaddingX: Math.round(sizeBasis * 0.034),
    footerTopGap: Math.round(sizeBasis * 0.022),
    leftColumnWidth: '55%',
    rightColumnWidth: '45%',
  };
}

export function resolveWidthToken(imageWidth: number, token: string): number {
  if (!token || token === 'max-content') return imageWidth;
  if (token.endsWith('%')) {
    const percent = Number.parseFloat(token);
    return Number.isFinite(percent) ? imageWidth * (percent / 100) : imageWidth;
  }
  const numeric = Number.parseFloat(token);
  return Number.isFinite(numeric) ? numeric : imageWidth;
}

export function resolveContentWidth(imageWidth: number, ratioProfile: RatioProfile, extraLeft = 0, extraRight = 0): number {
  const boundedByPadding = imageWidth - (ratioProfile.outerPadding * 2) - extraLeft - extraRight;
  return Math.max(160, Math.min(resolveWidthToken(imageWidth, ratioProfile.contentMaxWidth), boundedByPadding));
}

export function resolveBlockWidth(
  imageWidth: number,
  ratioProfile: RatioProfile,
  maxWidthToken: string,
  extraPadding = 0,
  extraLeft = 0,
  extraRight = 0,
): number {
  const contentWidth = resolveContentWidth(imageWidth, ratioProfile, extraLeft, extraRight);
  return Math.max(120, Math.min(resolveWidthToken(imageWidth, maxWidthToken), contentWidth - (extraPadding * 2)));
}

export function getLayoutBehavior(
  imageWidth: number,
  imageHeight: number,
  ratioProfile: RatioProfile,
  elements: LayoutElements,
): LayoutBehavior {
  const cardsCount = elements.cards?.items?.length || 0;
  const footerTextLength = elements.footer?.items?.reduce((sum, item) => sum + (item.text?.trim().length || 0), 0) || 0;
  const heroLength = elements.heroText?.text?.trim().length || 0;
  const headlineLength = elements.headline?.trim().length || 0;
  const sectionCount = [
    elements.banner,
    elements.heroText,
    elements.headline,
    elements.cards,
    elements.summaryRibbon,
    elements.cta,
    elements.footer,
  ].filter(Boolean).length;

  const hasDenseStack = !!(elements.heroText && elements.cards && elements.cta && elements.footer);
  const hasSummaryRibbon = !!elements.summaryRibbon;
  const narrowCanvas = imageWidth <= Math.round(imageHeight * 0.92) || imageWidth < 920;
  const crowdedContent = sectionCount > 4 || cardsCount >= 3 || footerTextLength > 64 || heroLength > 24 || headlineLength > 72 || hasDenseStack || hasSummaryRibbon;
  const veryCrowded = sectionCount >= 5 || cardsCount >= 4 || footerTextLength > 96 || (heroLength > 18 && headlineLength > 48);

  const forceStack = ratioProfile.kind === 'square'
    || ratioProfile.kind === 'tall'
    || (ratioProfile.kind === 'portrait' && crowdedContent)
    || (narrowCanvas && veryCrowded);
  const forceCompact = ratioProfile.kind === 'tall'
    || ratioProfile.kind === 'square'
    || (ratioProfile.kind === 'portrait' && crowdedContent)
    || (narrowCanvas && crowdedContent);

  return {
    forceStack,
    forceCompact,
    useCompactSectionGap: forceCompact || crowdedContent,
    cardsShouldStack: forceCompact || ratioProfile.kind !== 'landscape' || cardsCount >= 3,
    heroShouldStack: forceCompact || ratioProfile.kind !== 'landscape' || heroLength > 20,
    splitAlign: forceStack ? 'stretch' : 'center',
    rootJustify: forceCompact ? 'flex-start' : 'center',
  };
}

export function getSpacingTokens(ratioProfile: RatioProfile, theme: ThemeSpacingInput): SpacingTokens {
  const spacingScale = theme.spacingMultiplier < 1 ? 0.95 : theme.spacingMultiplier > 1.2 ? 1.05 : 1;
  const sectionGap = Math.round(ratioProfile.sectionGap * spacingScale);
  const compactSectionGap = Math.round(ratioProfile.compactSectionGap * spacingScale);
  const inlineGap = Math.round(ratioProfile.inlineGap * spacingScale);
  const bannerPaddingX = Math.round(ratioProfile.bannerPaddingX * spacingScale);
  const bannerPaddingY = Math.round(ratioProfile.bannerPaddingY * spacingScale);
  const cardPaddingX = Math.round(ratioProfile.cardPaddingX * spacingScale);
  const cardPaddingY = Math.round(ratioProfile.cardPaddingY * spacingScale);

  return {
    sectionGap,
    compactSectionGap,
    inlineGap,
    bannerPaddingX,
    bannerPaddingY,
    heroPadding: Math.round(ratioProfile.heroPadding * spacingScale),
    cardGap: Math.round(ratioProfile.cardGap * spacingScale),
    cardPaddingX,
    cardPaddingY,
    denseCardPaddingX: Math.max(cardPaddingX, Math.round(cardPaddingX * 1.18)),
    denseCardPaddingY: Math.max(cardPaddingY, Math.round(cardPaddingY * 1.12)),
    ribbonPaddingX: Math.round(ratioProfile.ribbonPaddingX * spacingScale),
    ribbonPaddingY: Math.round(ratioProfile.ribbonPaddingY * spacingScale),
    ribbonAccentGap: Math.max(6, Math.round(inlineGap * 0.7)),
    ribbonAccentWidth: Math.max(3, Math.round(inlineGap * 0.4)),
    splitGap: Math.round(ratioProfile.splitGap * spacingScale),
    splitPaddingX: Math.round(ratioProfile.splitPaddingX * spacingScale),
    footerTopGap: Math.round(ratioProfile.footerTopGap * spacingScale),
    footerItemGap: Math.max(4, Math.round(inlineGap * 0.5)),
    footerRowGap: Math.max(5, Math.round(compactSectionGap * 0.42)),
    footerPaddingX: Math.max(16, Math.round(bannerPaddingX * 0.72)),
    footerPaddingY: Math.max(7, Math.round(bannerPaddingY * 0.72)),
    footerEdgeInset: Math.max(24, Math.round(bannerPaddingX * 0.75)),
    leftColumnWidth: ratioProfile.leftColumnWidth,
    rightColumnWidth: ratioProfile.rightColumnWidth,
  };
}

function scaleFromMin(sizeBasis: number, multiplier: number, minPx: number, maxPx: number, ratioScale: number = 1): number {
  return clampNumber(Math.round(sizeBasis * multiplier * ratioScale), minPx, maxPx);
}

export function getBottomCenterLogoSafeArea(
  imageWidth: number,
  imageHeight: number,
  logoMeta?: LogoMeta,
  footerLayout?: Pick<FooterLayoutProfile, 'paddingBottom' | 'minBottomClearance'>,
): BottomCenterLogoSafeArea {
  if (logoMeta?.position !== 'bottom-center') {
    return {
      logoSafeWidth: 0,
      logoSafeHeight: 0,
      ctaMarginBottom: 0,
      footerMinPaddingBottom: footerLayout?.paddingBottom ?? 0,
      footerMinTextClearance: footerLayout?.minBottomClearance ?? 0,
    };
  }

  const ratioProfile = getRatioProfile(imageWidth, imageHeight);
  const logoSafeWidth = Math.ceil(imageWidth * (logoMeta.sizePercent / 100)) + (logoMeta.padding * 2);
  const logoSafeHeight = Math.ceil(imageWidth * (logoMeta.sizePercent / 100) * 0.75) + (logoMeta.padding * 2);
  const footerMinTextClearance = footerLayout?.minBottomClearance
    ?? scaleFromMin(ratioProfile.sizeBasis, 0.04, 24, 52, ratioProfile.safeBottomMultiplier);
  const footerBasePadding = footerLayout?.paddingBottom
    ?? scaleFromMin(ratioProfile.sizeBasis, 0.018, 12, 24, ratioProfile.safeBottomMultiplier);

  return {
    logoSafeWidth,
    logoSafeHeight,
    ctaMarginBottom: Math.round(logoSafeHeight * ratioProfile.safeBottomMultiplier),
    footerMinTextClearance,
    footerMinPaddingBottom: Math.max(footerBasePadding, footerMinTextClearance + Math.round(logoSafeHeight * 0.55)),
  };
}

export function getTextScaleTokens(
  ratioProfile: RatioProfile,
  theme: ThemeSpacingInput,
  elementCount: number,
  isEducationInfographic: boolean,
): TextScaleTokens {
  const densityModifier = elementCount >= 5 ? 0.96 : 1;
  const themeModifier = theme.spacingMultiplier < 1 ? 1.04 : theme.spacingMultiplier > 1.2 ? 0.95 : 1;
  const scale = ratioProfile.fontScale * densityModifier * themeModifier;
  const sizeBasis = ratioProfile.sizeBasis;

  return {
    bannerFont: scaleFromMin(sizeBasis, isEducationInfographic ? 0.036 : 0.029, 14, 34, scale),
    heroFont: scaleFromMin(sizeBasis, 0.072, 24, 88, scale),
    heroCircle: scaleFromMin(sizeBasis, 0.17, 88, 180, ratioProfile.kind === 'tall' ? 0.92 : 1),
    heroSplitCircle: scaleFromMin(sizeBasis, 0.14, 72, 140, ratioProfile.kind === 'tall' ? 0.94 : 1),
    heroSideFont: scaleFromMin(sizeBasis, 0.05, 18, 54, scale),
    headlineFont: scaleFromMin(sizeBasis, 0.04, 18, 48, scale),
    headlinePaddingY: scaleFromMin(sizeBasis, 0.018, 12, 22, ratioProfile.compactness <= 1 ? 1 : 0.95),
    headlinePaddingX: scaleFromMin(sizeBasis, 0.038, 20, 40, ratioProfile.compactness <= 1 ? 1 : 0.94),
    ctaFont: scaleFromMin(sizeBasis, 0.027, 14, 30, scale),
    ctaPaddingY: scaleFromMin(sizeBasis, 0.016, 10, 18, ratioProfile.kind === 'tall' ? 0.92 : 1),
    ctaPaddingX: scaleFromMin(sizeBasis, 0.04, 20, 42, ratioProfile.kind === 'landscape' ? 1.08 : 0.96),
    cardTitleFont: scaleFromMin(sizeBasis, isEducationInfographic && elementCount >= 5 ? 0.024 : 0.027, 14, 30, scale),
    cardDescFont: scaleFromMin(sizeBasis, 0.017, 12, 22, ratioProfile.kind === 'tall' ? 0.94 : 1),
    cardNumberSize: scaleFromMin(sizeBasis, 0.046, 26, 56, ratioProfile.kind === 'landscape' ? 1.06 : 1),
    ribbonFont: scaleFromMin(sizeBasis, 0.025, 14, 30, scale),
    footerFont: scaleFromMin(sizeBasis, 0.017, 12, 20, ratioProfile.kind === 'tall' ? 0.92 : scale),
  };
}

export function getFooterLayoutProfile(
  imageWidth: number,
  imageHeight: number,
  footerItems: Array<{ icon?: string; text: string }>,
  logoMeta?: LogoMeta,
  requestedMode: 'auto' | FooterLayoutMode = 'auto',
  spacingMultiplier = 1,
): FooterLayoutProfile {
  const ratioProfile = getRatioProfile(imageWidth, imageHeight);
  const spacingTokens = getSpacingTokens(ratioProfile, { spacingMultiplier });
  const ratio = ratioProfile.ratio;
  const isTall = ratio <= 0.62;
  const isPortrait = ratio > 0.62 && ratio < 0.9;
  const isSquare = ratio >= 0.9 && ratio <= 1.1;
  const isLandscape = ratio > 1.1;
  const logoPosition = logoMeta?.position || '';
  const bottomCenterLogo = logoPosition === 'bottom-center';
  const logoInBottomArea = logoPosition.startsWith('bottom');
  const totalChars = footerItems.reduce((sum, item) => sum + (item.text?.trim().length || 0), 0);
  const longestItem = footerItems.reduce((max, item) => Math.max(max, item.text?.trim().length || 0), 0);
  const hasLongAddress = footerItems.some((item) => (item.icon === 'map-pin' || item.icon === '📍') && (item.text?.trim().length || 0) > 26);
  const isCrowded = totalChars > 56 || longestItem > 22 || footerItems.length >= 4;
  const isVeryCrowded = totalChars > 88 || longestItem > 34 || (hasLongAddress && logoInBottomArea);

  let mode: FooterLayoutMode;
  if (requestedMode !== 'auto') {
    mode = requestedMode;
  } else if (isTall) {
    mode = 'vertical-compact';
  } else if (isSquare || isPortrait) {
    mode = isVeryCrowded || bottomCenterLogo ? 'vertical-compact' : 'two-row';
  } else {
    mode = isCrowded ? 'two-row' : 'single-row';
  }

  if (mode === 'single-row' && (isVeryCrowded || bottomCenterLogo)) {
    mode = isLandscape && !isTall ? 'two-row' : 'vertical-compact';
  }
  if (mode === 'two-row' && isTall && (isVeryCrowded || hasLongAddress)) {
    mode = 'vertical-compact';
  }

  const sizeBasis = ratioProfile.sizeBasis;
  const fontSize = mode === 'vertical-compact'
    ? scaleFromMin(sizeBasis, 0.015, 12, 18, ratioProfile.kind === 'tall' ? 0.9 : ratioProfile.fontScale * 0.95)
    : mode === 'two-row'
      ? scaleFromMin(sizeBasis, 0.0165, 12, 19, ratioProfile.fontScale)
      : scaleFromMin(sizeBasis, 0.0175, 12, 20, ratioProfile.fontScale);

  return {
    mode,
    fontSize,
    itemGap: mode === 'single-row'
      ? spacingTokens.inlineGap
      : mode === 'two-row'
        ? Math.max(8, spacingTokens.footerItemGap)
        : spacingTokens.footerItemGap,
    rowGap: mode === 'vertical-compact'
      ? spacingTokens.footerRowGap
      : Math.max(6, Math.round(spacingTokens.footerRowGap * 1.12)),
    paddingX: mode === 'vertical-compact'
      ? spacingTokens.footerPaddingX
      : Math.max(20, spacingTokens.footerPaddingX + Math.round(spacingTokens.inlineGap * 0.35)),
    paddingY: mode === 'vertical-compact'
      ? spacingTokens.footerPaddingY
      : Math.max(9, spacingTokens.footerPaddingY + Math.round(spacingTokens.footerRowGap * 0.3)),
    paddingBottom: bottomCenterLogo ? scaleFromMin(sizeBasis, 0.018, 12, 24, ratioProfile.safeBottomMultiplier) : 0,
    maxItemWidth: mode === 'single-row' ? '42%' : mode === 'two-row' ? '48%' : '100%',
    justifyContent: mode === 'vertical-compact' ? 'flex-start' : 'center',
    alignItems: mode === 'vertical-compact' ? 'flex-start' : 'center',
    flexDirection: mode === 'vertical-compact' ? 'column' : 'row',
    allowWrap: mode === 'two-row',
    minBottomClearance: bottomCenterLogo
      ? scaleFromMin(sizeBasis, 0.04, 24, 52, ratioProfile.safeBottomMultiplier)
      : scaleFromMin(sizeBasis, 0.018, 12, 24, 1),
  };
}