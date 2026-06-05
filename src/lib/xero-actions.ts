'use server';

import { getAuthenticatedXeroClient } from '@/lib/xero';
import { Invoice, LineItem, Contact, LineAmountTypes } from 'xero-node';
import type { Submission } from '@/lib/types';
import { avAddOns, workshopPackages, receptionPackages, infoSessionPackages } from '@/lib/av-packages';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/firebase/admin';
import { sendPaymentConfirmedEmail } from '@/lib/actions';

// Placeholder account code — replace with Corey's confirmed code before launch
const XERO_ACCOUNT_CODE = '402.03';

// Show tag for filtering in Xero reporting
const SHOW_TAG = 'ALF009';
const TRACKING_ENABLED = false; // set true once 'Show' tracking category is confirmed in Xero org

const allPackages = [...workshopPackages, ...receptionPackages, ...infoSessionPackages];

// ─── Xero inventory item code mappings ───────────────────────────────────────

const PACKAGE_ITEM_CODES: Record<string, string> = {
  'workshop-starter':  'ALF009-WS-Starter',
  'workshop-pro':      'ALF009-WS-Pro',
  'workshop-elite':    'ALF009-WS-Elite',
  'info-starter':      'ALF009-Info-Starter',
  'info-pro':          'ALF009-Info-Pro',
  'info-elite':        'ALF009-Info-Elite',
  'reception-starter': 'ALF009-Rec-Starter',
  'reception-pro':     'ALF009-Rec-Pro',
  'reception-elite':   'ALF009-Rec-Elite',
  'reception-lux':     'ALF009-Rec-Lux',
};

const ADDON_ITEM_CODES: Record<string, string> = {
  'Upgrade to Two Wireless Microphones':          'ALF009-Add-2Mics',
  'Upgrade to Four Wireless Microphones':         'ALF009-Add-4Mics',
  'Custom Branded Head Table Cover':              'ALF009-Add-HeadTable',
  'Custom LED Totem':                             'ALF009-Add-LEDTotem-WS',
  'Upgrade to Two Custom Branded Scenic Cubes':   'ALF009-Add-2Cubes',
  'Upgrade to Four Custom Branded Scenic Cubes':  'ALF009-Add-4Cubes',
  "3'x2' Custom Backdrop":                        'ALF009-Add-BackdropSM-WS',
  'AI Translation':                               'ALF009-Add-AITrans',
  '(16) RGB Uplights — Static Colors':            'ALF009-Add-Uplights16',
  '75" TV with Stand':                            'ALF009-Add-75TV',
  'LED Totem w/Custom Graphics':                  'ALF009-Add-LEDTotem-Rec',
  'Large Photo Backdrop':                         'ALF009-Add-BackdropLG',
  '(4) RGB Moving Head Lights w/stands':          'ALF009-Add-MovingHeads',
  'Small Photo Backdrop':                         'ALF009-Add-BackdropSM-Rec',
  'Dedicated Room Tech':                          'ALF009-Add-RoomTech',
  'Branded Photo Booth Kiosk':                    'ALF009-Add-PhotoBooth',
};

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
  invoiceStatus: Invoice.StatusEnum = Invoice.StatusEnum.DRAFT,
): Promise<XeroInvoiceResult> {
  try {
    const { xero, tenantId } = await getAuthenticatedXeroClient();

    // Build line items from all sessions' AV selections
    const lineItems: LineItem[] = [];

    for (const session of sessions) {
      if (!session.avSelection) continue;

      const { packageId, finalPrice, addOns } = session.avSelection;

      // Resolve display name from av-packages source of truth
      const pkg = allPackages.find(p => p.id === packageId);
      const packageDisplayName = pkg?.name ?? packageId;

      // 1. Package line item
      lineItems.push({
        description: `${packageDisplayName} — ${session.title}`,
        quantity: 1.0,
        unitAmount: finalPrice / 100,
        accountCode: XERO_ACCOUNT_CODE,
        ...(PACKAGE_ITEM_CODES[packageId] ? { itemCode: PACKAGE_ITEM_CODES[packageId] } : {}),
        ...(TRACKING_ENABLED ? { tracking: [{ name: 'Show', option: SHOW_TAG }] } : {}),
      });

      // 2. Individual add-on line items (priced via av-packages lookup)
      if (addOns && addOns.length > 0) {
        for (const label of addOns) {
          const addOnDef = avAddOns.find(a => a.label === label);
          const priceCents = addOnDef?.deltaByPackage?.[packageId] ?? addOnDef?.price ?? null;
          lineItems.push({
            description: priceCents !== null
              ? `${label} — ${session.title}`
              : `${label} — ${session.title} (price lookup failed)`,
            quantity: 1.0,
            unitAmount: (priceCents ?? 0) / 100,
            accountCode: XERO_ACCOUNT_CODE,
            ...(ADDON_ITEM_CODES[label] ? { itemCode: ADDON_ITEM_CODES[label] } : {}),
            ...(TRACKING_ENABLED ? { tracking: [{ name: 'Show', option: SHOW_TAG }] } : {}),
          });
        }
        // NOTE: no aggregate subtotal line — individual lines replace it
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
      status: invoiceStatus,
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
    const paymentStatus =
      paymentMethod === 'manual' ? 'awaiting_manual' :
      paymentMethod === 'free'   ? 'complete' :
                                   'pending';
    await Promise.all(
      sessionIds.map((id) =>
        db.doc(`submissions/${id}`).update({
          orderFinalizedAt: now,
          paymentMethod,
          paymentStatus,
          invoiceId: created.invoiceID,
          invoiceNumber: created.invoiceNumber ?? null,
          ...(paymentMethod === 'free' ? { paymentComplete: true } : {}),
        })
      )
    );

    // Send payment confirmation emails for free orders
    if (paymentMethod === 'free') {
      await Promise.all(sessions.map(s => sendPaymentConfirmedEmail(s)));
    }

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

