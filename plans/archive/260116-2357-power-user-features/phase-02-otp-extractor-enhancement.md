# Phase 02: OTP Auto-Extractor Enhancement

**Duration:** Week 2
**Priority:** High
**Dependencies:** Phase 01 (partial)

## 1. Objective

Cải thiện hệ thống OTP extraction:
- Mở rộng patterns để detect nhiều format hơn
- Lưu extracted OTP vào Message model
- Hiển thị OTP nổi bật trên frontend
- Copy-to-clipboard one-click

## 2. Current State

### Existing Implementation
- `utils/otpExtractor.ts` với basic patterns
- Chỉ sử dụng trong forwarding service
- Không lưu vào database
- Không hiển thị trên frontend

## 3. Tasks

### 3.1 Database Migration

**Update schema.prisma:**

```prisma
model Message {
  // ... existing fields ...

  // OTP extraction data
  extractedOtp      String?
  otpConfidence     String?   // high, medium, low
  otpExtractedAt    DateTime?

  // ... rest of model ...
}
```

**Migration:**
```sql
ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "extractedOtp" TEXT,
  ADD COLUMN IF NOT EXISTS "otpConfidence" TEXT,
  ADD COLUMN IF NOT EXISTS "otpExtractedAt" TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Message_extractedOtp_idx"
  ON "Message"("extractedOtp")
  WHERE "extractedOtp" IS NOT NULL;
```

### 3.2 Enhanced OTP Patterns

**File:** `services/api/src/utils/otpExtractor.ts` (replace)

```typescript
/**
 * Enhanced OTP Extractor
 * Detects verification codes from email content with high accuracy
 */

// Pattern categories for better organization
const PATTERNS = {
  // Explicit OTP labels (highest confidence)
  explicit: [
    /(?:otp|one[- ]?time[- ]?(?:password|code|pin))[:\s]+(\d{4,8})/i,
    /(?:mã\s*(?:xác\s*thực|xác\s*nhận|otp))[:\s]*(\d{4,8})/i,
    /(?:verification|security|login)\s*code[:\s]+(\d{4,8})/i,
    /(?:code|mã)[:\s]+(\d{6})/i,
  ],

  // "Your code is X" patterns
  contextual: [
    /(?:your|the)\s+(?:verification\s+)?code\s+is[:\s]+(\d{4,8})/i,
    /(?:mã\s+của\s+bạn)[:\s]*(\d{4,8})/i,
    /(\d{6})\s+is\s+your\s+(?:verification\s+)?code/i,
    /(?:use|enter|input)[:\s]+(\d{4,8})\s+(?:to|for)/i,
  ],

  // Codes in special formatting
  formatted: [
    /["'「」【】\[\]]\s*(\d{4,8})\s*["'「」【】\[\]]/,
    /\*\*(\d{4,8})\*\*/,
    /<(?:b|strong|code)>(\d{4,8})<\/(?:b|strong|code)>/i,
    /style="[^"]*font-size[^"]*"[^>]*>(\d{4,8})</i,
  ],

  // PIN patterns
  pin: [
    /(?:pin|passcode)[:\s]+(\d{4,6})/i,
    /(?:mã\s*pin)[:\s]*(\d{4,6})/i,
  ],

  // 2FA patterns
  twoFactor: [
    /(?:2fa|two[- ]?factor|authenticator)[:\s]+(\d{6})/i,
    /(?:google|microsoft|authy)\s+authenticator[:\s]+(\d{6})/i,
  ],

  // Generic standalone (lowest confidence)
  standalone: [
    /\b(\d{6})\b(?=.*(?:verify|xác|confirm|code|mã|enter|nhập))/i,
  ],
};

// Keywords that increase confidence
const HIGH_CONFIDENCE_KEYWORDS = [
  'verification code', 'mã xác thực', 'mã xác nhận',
  'otp', 'one-time', 'one time',
  'security code', 'mã bảo mật',
  '2fa', 'two-factor', 'two factor',
  'authenticator',
];

const MEDIUM_CONFIDENCE_KEYWORDS = [
  'code', 'mã', 'verify', 'confirm', 'xác',
  'pin', 'passcode', 'password',
];

export interface OTPResult {
  code: string;
  confidence: 'high' | 'medium' | 'low';
  pattern: string;
}

/**
 * Extract OTP code from text content
 */
export function extractOTP(text: string): OTPResult | null {
  if (!text || text.length < 4) return null;

  // Clean and normalize text
  const cleanText = text
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width chars
    .trim();

  // Try patterns in order of confidence
  const patternGroups: [string, RegExp[]][] = [
    ['explicit', PATTERNS.explicit],
    ['contextual', PATTERNS.contextual],
    ['formatted', PATTERNS.formatted],
    ['twoFactor', PATTERNS.twoFactor],
    ['pin', PATTERNS.pin],
    ['standalone', PATTERNS.standalone],
  ];

  for (const [groupName, patterns] of patternGroups) {
    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match?.[1]) {
        const code = match[1];

        // Validate code
        if (!isValidOTP(code)) continue;

        // Determine confidence
        const confidence = getConfidence(cleanText, groupName);

        return { code, confidence, pattern: groupName };
      }
    }
  }

  return null;
}

/**
 * Validate OTP code
 */
function isValidOTP(code: string): boolean {
  // Must be 4-8 digits
  if (!/^\d{4,8}$/.test(code)) return false;

  // Reject common non-OTP patterns
  const invalidPatterns = [
    /^(\d)\1+$/, // All same digit (1111, 000000)
    /^123456$/, // Sequential
    /^654321$/, // Reverse sequential
    /^(19|20)\d{2}$/, // Years (1999, 2024)
  ];

  return !invalidPatterns.some(p => p.test(code));
}

/**
 * Determine confidence level
 */
function getConfidence(text: string, patternGroup: string): 'high' | 'medium' | 'low' {
  const textLower = text.toLowerCase();

  // Pattern group based confidence
  if (['explicit', 'twoFactor'].includes(patternGroup)) {
    return 'high';
  }

  // Keyword based confidence
  if (HIGH_CONFIDENCE_KEYWORDS.some(kw => textLower.includes(kw))) {
    return 'high';
  }

  if (MEDIUM_CONFIDENCE_KEYWORDS.some(kw => textLower.includes(kw))) {
    return 'medium';
  }

  if (['contextual', 'formatted'].includes(patternGroup)) {
    return 'medium';
  }

  return 'low';
}

/**
 * Extract all possible OTPs (for debugging/testing)
 */
export function extractAllOTPs(text: string): OTPResult[] {
  const results: OTPResult[] = [];
  const seen = new Set<string>();

  const cleanText = text.replace(/\s+/g, ' ').trim();

  for (const [groupName, patterns] of Object.entries(PATTERNS)) {
    for (const pattern of patterns) {
      const globalPattern = new RegExp(pattern.source, pattern.flags + 'g');
      let match;

      while ((match = globalPattern.exec(cleanText)) !== null) {
        const code = match[1];
        if (code && isValidOTP(code) && !seen.has(code)) {
          seen.add(code);
          results.push({
            code,
            confidence: getConfidence(cleanText, groupName),
            pattern: groupName,
          });
        }
      }
    }
  }

  return results.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
}

/**
 * Check if text likely contains an OTP
 */
export function hasOTP(text: string): boolean {
  return extractOTP(text) !== null;
}
```

### 3.3 Update Email Processing

**File:** `services/api/src/workers/emailWorker.ts` (update)

```typescript
import { extractOTP } from "../utils/otpExtractor";

// In the message creation section:
const otpResult = extractOTP(textBody || '');

const message = await prisma.message.create({
  data: {
    // ... existing fields ...

    // OTP extraction
    extractedOtp: otpResult?.code || null,
    otpConfidence: otpResult?.confidence || null,
    otpExtractedAt: otpResult ? new Date() : null,
  },
  include: {
    inbox: true,
    attachments: true,
  },
});
```

### 3.4 Update Message API Response

**File:** `services/api/src/routes/messages.ts` (update)

Ensure OTP fields are included in responses:

```typescript
// Get message by ID
app.get("/messages/:id", { preHandler: app.authenticate }, async (request, reply) => {
  // ... existing code ...

  return {
    ...message,
    otp: message.extractedOtp ? {
      code: message.extractedOtp,
      confidence: message.otpConfidence,
      extractedAt: message.otpExtractedAt,
    } : null,
  };
});

// List messages - include OTP in response
const messages = await prisma.message.findMany({
  // ... existing query ...
  select: {
    // ... existing fields ...
    extractedOtp: true,
    otpConfidence: true,
  },
});
```

### 3.5 Frontend OTP Badge Component

**File:** `services/web/src/components/message/OtpBadge.tsx`

```tsx
import { useState } from 'react';
import { Copy, Check, Key } from 'lucide-react';

interface OtpBadgeProps {
  code: string;
  confidence: 'high' | 'medium' | 'low';
  size?: 'sm' | 'md' | 'lg';
  showCopyButton?: boolean;
}

export function OtpBadge({
  code,
  confidence,
  size = 'md',
  showCopyButton = true,
}: OtpBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-1.5',
    lg: 'text-lg px-4 py-2',
  };

  const confidenceColors = {
    high: 'bg-green-500/20 border-green-500/50 text-green-400',
    medium: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
    low: 'bg-gray-500/20 border-gray-500/50 text-gray-400',
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2 rounded-lg border backdrop-blur-sm
        ${sizeClasses[size]}
        ${confidenceColors[confidence]}
      `}
    >
      <Key className="w-4 h-4" />
      <span className="font-mono font-bold tracking-wider">{code}</span>

      {showCopyButton && (
        <button
          onClick={handleCopy}
          className="ml-1 p-1 hover:bg-white/10 rounded transition-colors"
          title="Copy OTP"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      )}

      {confidence !== 'high' && (
        <span className="text-xs opacity-60">
          ({confidence})
        </span>
      )}
    </div>
  );
}
```

### 3.6 Update Message List Item

**File:** `services/web/src/components/message/MessageListItem.tsx` (update)

```tsx
import { OtpBadge } from './OtpBadge';

// In the component JSX, add OTP badge:
{message.extractedOtp && (
  <OtpBadge
    code={message.extractedOtp}
    confidence={message.otpConfidence || 'medium'}
    size="sm"
  />
)}
```

### 3.7 Update Message Detail View

**File:** `services/web/src/components/message/MessageDetail.tsx` (update)

```tsx
import { OtpBadge } from './OtpBadge';

// Add prominent OTP display at the top of message:
{message.extractedOtp && (
  <div className="mb-4 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/30">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-500/20 rounded-lg">
          <Key className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <p className="text-sm text-green-300/70">Verification Code Detected</p>
          <p className="text-2xl font-mono font-bold text-green-400 tracking-widest">
            {message.extractedOtp}
          </p>
        </div>
      </div>
      <button
        onClick={() => copyToClipboard(message.extractedOtp)}
        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
      >
        <Copy className="w-4 h-4" />
        Copy
      </button>
    </div>
  </div>
)}
```

### 3.8 Telegram Notification with OTP

Update Telegram notification to highlight OTP:

```typescript
// In telegram notification service
if (message.extractedOtp) {
  text += `\n\n🔢 <b>OTP Code:</b> <code>${message.extractedOtp}</code>`;
}
```

## 4. Testing

### Unit Tests

```typescript
// test/utils/otpExtractor.test.ts
describe("OTPExtractor", () => {
  describe("extractOTP", () => {
    it("should extract 6-digit OTP with label", () => {
      const result = extractOTP("Your verification code is 123456");
      expect(result?.code).toBe("123456");
      expect(result?.confidence).toBe("high");
    });

    it("should extract OTP in Vietnamese", () => {
      const result = extractOTP("Mã xác thực của bạn là: 789012");
      expect(result?.code).toBe("789012");
    });

    it("should extract formatted OTP", () => {
      const result = extractOTP("Use code **543210** to verify");
      expect(result?.code).toBe("543210");
    });

    it("should reject invalid patterns", () => {
      expect(extractOTP("Year 2024")).toBeNull();
      expect(extractOTP("Code: 111111")).toBeNull(); // All same digits
    });

    it("should detect OTP in HTML", () => {
      const html = '<div style="font-size: 24px">654321</div>';
      const result = extractOTP(html);
      expect(result?.code).toBe("654321");
    });
  });

  describe("extractAllOTPs", () => {
    it("should find multiple OTPs", () => {
      const text = "Primary: 123456, Backup: 654321";
      const results = extractAllOTPs(text);
      expect(results.length).toBe(2);
    });
  });
});
```

## 5. Acceptance Criteria

- [ ] OTP extraction works for 6-digit codes
- [ ] OTP extraction works for 4-digit PINs
- [ ] OTP extraction works for 8-digit codes
- [ ] Vietnamese OTP labels detected
- [ ] Formatted OTPs (bold, code tags) detected
- [ ] Invalid patterns rejected (years, sequential)
- [ ] OTP stored in Message model
- [ ] OTP displayed in message list
- [ ] OTP displayed prominently in message detail
- [ ] Copy to clipboard works
- [ ] Telegram notification includes OTP
- [ ] Confidence levels displayed correctly
