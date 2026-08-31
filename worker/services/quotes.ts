// Quote HTML/subject generation from lead type templates.

import type { LeadType } from '../lib';
import type { Pricing } from '../pricing';
import { bridalEmail, bridalSubject } from '../templates/bridal';
import { beautyEmail, beautySubject } from '../templates/beauty';
import { skinCallEmail, skinCallSubject } from '../templates/skin_call';
import { educationEmail, educationSubject } from '../templates/education';

export function generateQuoteHtml(
  type: LeadType,
  formData: Record<string, string>,
  pricing: Pricing,
  notes?: string
): string {
  switch (type) {
    case 'bridal':
      return bridalEmail(formData, pricing, notes);
    case 'beauty':
      return beautyEmail(formData, pricing, notes);
    case 'skin-call':
      return skinCallEmail(formData, pricing, notes);
    case 'education':
      return educationEmail(formData, pricing, notes);
  }
}

export function generateQuoteSubject(type: LeadType): string {
  switch (type) {
    case 'bridal':
      return bridalSubject();
    case 'beauty':
      return beautySubject();
    case 'skin-call':
      return skinCallSubject();
    case 'education':
      return educationSubject();
  }
}
