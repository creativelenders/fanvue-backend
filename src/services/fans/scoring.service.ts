interface ScoringInput {
  totalSpend: number;
  avgSpend: number;
  totalMessages: number;
  lastActiveAt: Date | string | null;
  status: string;
  subscribedAt: Date | string | null;
}

export class ScoringService {
  /**
   * Fan scoring algorithm (0-100):
   * - Monetary score (0-40): based on total and average spend
   * - Engagement score (0-30): based on messages and recency
   * - Loyalty score (0-20): based on subscription length
   * - Status score (0-10): active vs churned
   */
  calculate(input: ScoringInput): number {
    // Monetary Score (0-40)
    const monetaryScore = this.calculateMonetaryScore(input.totalSpend, input.avgSpend);

    // Engagement Score (0-30)
    const engagementScore = this.calculateEngagementScore(input.totalMessages, input.lastActiveAt);

    // Loyalty Score (0-20)
    const loyaltyScore = this.calculateLoyaltyScore(input.subscribedAt);

    // Status Score (0-10)
    const statusScore = input.status === "active" ? 10 : input.status === "expired" ? 5 : 0;

    return Math.min(100, Math.round(monetaryScore + engagementScore + loyaltyScore + statusScore));
  }

  private calculateMonetaryScore(totalSpend: number, avgSpend: number): number {
    let score = 0;
    // Total spend tier (0-25)
    if (totalSpend >= 10000) score += 25;
   else if (totalSpend >= 5000) score += 20;
    else if (totalSpend >= 1000) score += 15;
    else if (totalSpend >= 500) score += 10;
    else if (totalSpend >= 100) score += 5;
    else if (totalSpend > 0) score += 2;

    // Average spend tier (0-15)
    if (avgSpend >= 100) score += 15;
    else if (avgSpend >= 50) score += 10;
    else if (avgSpend >= 20) score += 7;
    else if (avgSpend >= 10) score += 4;
    else if (avgSpend > 0) score += 2;

    return score;
  }

  private calculateEngagementScore(totalMessages: number, lastActiveAt: Date | string | null): number {
    let score = 0;

    // Message volume (0-15)
    if (totalMessages >= 500) score += 15;
    else if (totalMessages >= 200) score += 12;
    else if (totalMessages >= 100) score += 9;
    else if (totalMessages >= 50) score += 6;
    else if (totalMessages >= 10) score += 3;
    else if (totalMessages > 0) score += 1;

    // Recency (0-15)
    if (lastActiveAt) {
      const daysSinceActive = Math.floor(
        (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceActive <= 1) score += 15;
      else if (daysSinceActive <= 7) score += 12;
      else if (daysSinceActive <= 30) score += 8;
      else if (daysSinceActive <= 90) score += 4;
      else if (daysSinceActive <= 180) score += 2;
    }

    return score;
  }

  private calculateLoyaltyScore(subscribedAt: Date | string | null): number {
    if (!subscribedAt) return 0;

    const monthsSinceSub = Math.floor(
      (Date.now() - new Date(subscribedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    if (monthsSinceSub >= 24) return 20;
    if (monthsSinceSub >= 12) return 16;
    if (monthsSinceSub >= 6) return 12;
    if (monthsSinceSub >= 3) return 8;
    if (monthsSinceSub >= 1) return 4;
    return 1;
  }
}
