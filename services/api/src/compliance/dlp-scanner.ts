export interface DlpMatch {
  rule: string;
  matchedText: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export class DlpScanner {
  private static patterns = {
    // Basic regex for demonstration. In production, use more robust libraries.
    SSN: /\b\d{3}-\d{2}-\d{4}\b/,
    CREDIT_CARD: /\b(?:\d[ -]*?){13,16}\b/, // Simplified
    API_KEY: /(?i)(?:api_key|apikey|secret|token)\s*[:=]\s*[a-zA-Z0-9_\-]{20,}/,
  };

  private static luhnCheck(value: string): boolean {
    const sanitized = value.replace(/\D/g, "");
    let sum = 0;
    let shouldDouble = false;

    for (let i = sanitized.length - 1; i >= 0; i--) {
      let digit = parseInt(sanitized.charAt(i));

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  static scan(content: string): DlpMatch[] {
    const matches: DlpMatch[] = [];

    // SSN
    if (this.patterns.SSN.test(content)) {
      const found = content.match(this.patterns.SSN)?.[0];
      if (found) matches.push({ rule: "SSN", matchedText: found, severity: "HIGH" });
    }

    // Credit Card (with Luhn)
    const ccMatches = content.match(new RegExp(this.patterns.CREDIT_CARD, "g"));
    if (ccMatches) {
      for (const cc of ccMatches) {
        if (this.luhnCheck(cc)) {
          matches.push({ rule: "CREDIT_CARD", matchedText: cc, severity: "HIGH" });
        }
      }
    }

    // API Keys
    if (this.patterns.API_KEY.test(content)) {
      const found = content.match(this.patterns.API_KEY)?.[0];
      if (found) matches.push({ rule: "API_KEY", matchedText: found, severity: "MEDIUM" });
    }

    return matches;
  }

  static async scanMessage(subject: string | null, body: string | null): Promise<{ action: "ALLOW" | "WARN" | "BLOCK", matches: DlpMatch[] }> {
    const text = `${subject || ""} ${body || ""}`;
    const matches = this.scan(text);

    if (matches.length === 0) {
      return { action: "ALLOW", matches: [] };
    }

    const hasHighSeverity = matches.some(m => m.severity === "HIGH");

    return {
      action: hasHighSeverity ? "BLOCK" : "WARN",
      matches
    };
  }
}
