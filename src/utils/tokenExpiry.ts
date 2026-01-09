import { differenceInDays, isPast, parseISO } from 'date-fns';

export type TokenExpiryStatus = 'valid' | 'expiring_soon' | 'expired' | 'unknown';

export interface TokenExpiryInfo {
  status: TokenExpiryStatus;
  daysUntilExpiry: number | null;
  message: string;
}

const EXPIRING_SOON_THRESHOLD_DAYS = 7;

export function getTokenExpiryStatus(expiresAt: string | null | undefined): TokenExpiryInfo {
  // No expiry date - could be API key based (Twitter) or not tracked
  if (!expiresAt) {
    return {
      status: 'unknown',
      daysUntilExpiry: null,
      message: 'Không có thông tin hết hạn',
    };
  }

  try {
    const expiryDate = parseISO(expiresAt);
    const now = new Date();

    // Already expired
    if (isPast(expiryDate)) {
      return {
        status: 'expired',
        daysUntilExpiry: 0,
        message: 'Token đã hết hạn',
      };
    }

    const daysLeft = differenceInDays(expiryDate, now);

    // Expiring soon (within threshold)
    if (daysLeft <= EXPIRING_SOON_THRESHOLD_DAYS) {
      return {
        status: 'expiring_soon',
        daysUntilExpiry: daysLeft,
        message: daysLeft === 0 
          ? 'Hết hạn hôm nay' 
          : daysLeft === 1 
            ? 'Hết hạn ngày mai'
            : `Hết hạn trong ${daysLeft} ngày`,
      };
    }

    // Valid
    return {
      status: 'valid',
      daysUntilExpiry: daysLeft,
      message: `Còn ${daysLeft} ngày`,
    };
  } catch {
    return {
      status: 'unknown',
      daysUntilExpiry: null,
      message: 'Không thể xác định',
    };
  }
}
