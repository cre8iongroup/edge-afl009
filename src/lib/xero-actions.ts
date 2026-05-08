'use server';

import { getAuthenticatedXeroClient } from '@/lib/xero';
import { Invoice, LineItem, Contact, LineAmountTypes } from 'xero-node';
import type { Submission } from '@/lib/types';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/firebase/admin';

// Placeholder account code — replace with Corey's confirmed code before launch
const XERO_ACCOUNT_CODE = '402.03';

// Show tag for filtering in Xero reporting
const SHOW_TAG = 'ALF009';

export interface XeroInvoiceResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
}

/**
 * Creates a Xero DRAFT invoice for a partner's AV order.
 *
 * @param sessions     All Submission documents included in this order (must have avSelection set)
 * @param partnerEmail Contact email address for the Xero invoice
 * @param partnerName  Contact display name for the Xero invoice
 * @param orderId      Opaque reference string written to the Xero invoice Reference field
 *
 * Line items are built per-session. Each session produces:
 *   1. A package line item (finalPrice / 100 in dollars)
 *   2. Individual add-on line items at $0 each (individual prices not yet stored on avSelection)
 *   3. An add-ons subtotal line item (addOnsTotal / 100)
 *
 * TODO: store individual add-on prices on AVSelection so each add-on gets its own
 * priced line item instead of a combined subtotal.
 */
export async function createXeroInvoice(
  sessions: Submission[],
  partnerEmail: string,
  partnerName: string,
  orderId: string,
  sessionIds: string[],
  paymentMethod: 'manual' | 'free' | 'stripe',
): Promise<XeroInvoiceResult> {
  try {
    const { xero, tenantId } = await getAuthenticatedXeroClient();

    // Build line items from all sessions' AV selections
    const lineItems: LineItem[] = [];

    for (const session of sessions) {
      if (!session.avSelection) continue;

      const {
        packageName,
        finalPrice,
        addOns,
        addOnsTotal,
      } = session.avSelection;

      // Package line item
      lineItems.push({
        description: `${packageName} — ${session.title} (${session.sessionType})`,
        quantity: 1.0,
        unitAmount: finalPrice / 100,
        accountCode: XERO_ACCOUNT_CODE,
        // TODO: re-add tracking once 'Show' tracking category is configured in Xero org
      });

      // Add-on line items
      if (addOns && addOns.length > 0) {
        for (const addOn of addOns) {
          lineItems.push({
            description: `Add-on: ${addOn} — ${session.title}`,
            quantity: 1.0,
            unitAmount: 0, // TODO: store individual add-on prices on avSelection for line item breakdown
            accountCode: XERO_ACCOUNT_CODE,
            // TODO: re-add tracking once 'Show' tracking category is configured in Xero org
          });
        }
        // Add-ons subtotal line item
        lineItems.push({
          description: `Add-ons subtotal — ${session.title}`,
          quantity: 1.0,
          unitAmount: addOnsTotal / 100,
          accountCode: XERO_ACCOUNT_CODE,
          // TODO: re-add tracking once 'Show' tracking category is configured in Xero org
        });
      }
    }

    // Build contact from partner info
    const contact: Contact = {
      name: partnerName,
      emailAddress: partnerEmail,
    };

    // Build invoice
    const invoice: Invoice = {
      type: Invoice.TypeEnum.ACCREC,
      contact,
      lineItems,
      lineAmountTypes: LineAmountTypes.Exclusive,
      status: Invoice.StatusEnum.DRAFT,
      reference: orderId,
      url: `https://alpfa26.cre8ionedge.com/order`,
    };

    const response = await xero.accountingApi.createInvoices(
      tenantId,
      { invoices: [invoice] },
      true  // summarizeErrors — changed to true to surface validation errors
    );

    const created = response.body.invoices?.[0];

    if (!created?.invoiceID) {
      throw new Error('Invoice created but no ID returned');
    }

    console.log('✅ Xero invoice created:', created.invoiceID);

    // Write payment fields back to each Firestore session document in parallel
    const db = getFirestore(adminApp);
    const now = new Date().toISOString();
    const paymentStatus = paymentMethod === 'manual' ? 'awaiting_manual' : 'pending';
    await Promise.all(
      sessionIds.map((id) =>
        db.doc(`submissions/${id}`).update({
          orderFinalizedAt: now,
          paymentMethod,
          paymentStatus,
          invoiceId: created.invoiceID,
          invoiceNumber: created.invoiceNumber ?? null,
        })
      )
    );

    return {
      success: true,
      invoiceId: created.invoiceID,
      invoiceNumber: created.invoiceNumber,
    };

  } catch (error) {
    console.error('❌ Xero invoice creation failed:', error);
    return {
      success: false,
      error: String(error),
    };
  }
}

