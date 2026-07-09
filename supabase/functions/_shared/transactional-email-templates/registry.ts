import type { ComponentType } from 'npm:react@18.3.1'
import { template as welcome } from './welcome.tsx'
import { template as paymentReminder } from './payment-reminder.tsx'
import { template as weeklyDigest } from './weekly-digest.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, unknown>
  to?: string | ((data: any) => string)
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  welcome,
  'payment-reminder': paymentReminder,
  'weekly-digest': weeklyDigest,
}
