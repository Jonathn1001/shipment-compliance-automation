import { Injectable } from '@nestjs/common';
import { IssueStatus, ValidationIssue } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaTx } from '../prisma/prisma-tx';
import { IssueDraft } from './validation.types';

/** Stable reconcile key for an issue: its rule-code plus the field it concerns. */
const keyOf = (i: { issueType: string; field: string | null }): string =>
  `${i.issueType}::${i.field ?? ''}`;

@Injectable()
export class ValidationIssueRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByShipment(shipmentId: string) {
    return this.prisma.validationIssue.findMany({
      where: { shipmentId },
      orderBy: [{ severity: 'desc' }, { issueType: 'asc' }],
    });
  }

  /**
   * Replace a shipment's issues with the freshly-evaluated drafts, reconciling by
   * `(issueType, field)`:
   *  - a WAIVED issue is preserved as-is (an accepted risk is not re-raised),
   *  - a prior OPEN/RESOLVED issue still present in the drafts is refreshed as OPEN,
   *  - a prior issue absent from the drafts becomes RESOLVED (kept for history),
   *  - a draft with no prior match is inserted OPEN.
   *
   * Runs inside the engine's `$transaction`. Returns the resulting active
   * (OPEN + WAIVED) issues — the set the status resolver and report builder use.
   */
  async replaceAndReconcile(
    shipmentId: string,
    drafts: IssueDraft[],
    client: PrismaTx,
  ): Promise<ValidationIssue[]> {
    const existing = await client.validationIssue.findMany({
      where: { shipmentId },
    });
    const existingByKey = new Map(existing.map((i) => [keyOf(i), i]));
    const draftsByKey = new Map(drafts.map((d) => [keyOf(d), d]));

    // Insert or refresh from drafts (WAIVED prior issues are left untouched).
    for (const [key, draft] of draftsByKey) {
      const prior = existingByKey.get(key);
      if (prior?.status === IssueStatus.WAIVED) continue;

      if (prior) {
        await client.validationIssue.update({
          where: { id: prior.id },
          data: {
            severity: draft.severity,
            explanation: draft.explanation,
            suggestedAction: draft.suggestedAction,
            status: IssueStatus.OPEN,
          },
        });
      } else {
        await client.validationIssue.create({
          data: {
            shipmentId,
            issueType: draft.issueType,
            severity: draft.severity,
            field: draft.field,
            explanation: draft.explanation,
            suggestedAction: draft.suggestedAction,
            status: IssueStatus.OPEN,
          },
        });
      }
    }

    // Anything previously OPEN but no longer raised is now RESOLVED (WAIVED kept).
    for (const [key, prior] of existingByKey) {
      if (draftsByKey.has(key)) continue;
      if (prior.status === IssueStatus.OPEN) {
        await client.validationIssue.update({
          where: { id: prior.id },
          data: { status: IssueStatus.RESOLVED },
        });
      }
    }

    return client.validationIssue.findMany({
      where: {
        shipmentId,
        status: { in: [IssueStatus.OPEN, IssueStatus.WAIVED] },
      },
      orderBy: [{ severity: 'desc' }, { issueType: 'asc' }],
    });
  }
}
