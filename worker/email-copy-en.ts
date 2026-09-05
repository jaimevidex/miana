import { CONTACT_FALLBACKS } from './pricing';
import { EMAIL_BLOCO, SIG_INSTAGRAM_FALLBACK, SIG_WEBSITE_FALLBACK, type EmailCopy } from './email-copy';

function heading(title: string): string {
  return `<h2 style="font-size:20px;color:#8a2831;margin:0 0 16px">${title}</h2>`;
}

export const EMAIL_COPY_FALLBACKS_EN: EmailCopy = {
  wrapFooter: {
    email: CONTACT_FALLBACKS.email,
    instagram: SIG_INSTAGRAM_FALLBACK,
    website: SIG_WEBSITE_FALLBACK,
    assetBase: SIG_WEBSITE_FALLBACK,
  },
  bridal_intro: {
    subject: 'Bridal service - Mariana Pita',
    body:
      '<p>Hello bride {{nome}}!!!</p>' +
      '<p>First of all, congratulations on your engagement! We are so happy to be part of this special moment.</p>' +
      '<p>I can confirm I have availability for makeup on {{data_casamento}}, in {{local_preparacao}}, so you are ready by {{hora_pronta}}.</p>' +
      '<p>I am attaching a PDF with all the details of our bridal service. If you would also like hairstyling, please let me know so I can confirm availability with the team ASAP.</p>' +
      '<p>We know the day is even happier when shared with bridesmaids and family, and they can get ready with us too. For now, it also helps to have an estimate of how many guests will want this and which service(s) they would like! This number is only an estimate, so we know how many professionals we need, and only has to be confirmed closer to the date.</p>' +
      '<p>For all these reasons, we can only calculate travel costs once we know the booked services and how many professionals need to be allocated.</p>' +
      '<p>I am here for any questions that come up :)</p>' +
      '<p>With love,</p>',
  },
  bridal: {
    subject: 'Bridal quote by Mariana Pita',
    body: `${heading('Quote - Bridal')}<p>Hi {{nome}},</p>${EMAIL_BLOCO}`,
  },
  beauty: {
    subject: 'Quote - Beauty',
    body: `${heading('Quote - Beauty')}<p>Hi {{nome}},</p>${EMAIL_BLOCO}`,
  },
  skin_call: {
    subject: 'Quote - Skin Call',
    body: `${heading('Quote - Skin Call')}<p>Hi {{nome}},</p>${EMAIL_BLOCO}`,
  },
  education: {
    subject: 'Quote - Education',
    body: `${heading('Quote - Education')}<p>Hi {{nome}},</p>${EMAIL_BLOCO}`,
  },
  terms: {
    subject: 'Terms and conditions and payment details',
    body:
      `${heading('Terms and conditions')}` +
      '<p>Hi {{nome}},</p><p>To move forward, I am sending the <strong>terms and conditions</strong> attached, plus the payment details.</p><p>Once payment is done, please reply to this email with the <strong>proof of payment</strong> and the sentence:</p><p><em>«I declare that I have read and accept the terms and conditions.»</em></p>' +
      EMAIL_BLOCO +
      '<p>This text is provisional and will be replaced by the final copy.</p>',
  },
  schedule: {
    subject: 'Book sessions - Skin Call',
    body:
      `${heading('Book sessions')}` +
      '<p>Hi {{nome}},</p><p>To book the session, please send me a few <strong>date and time suggestions</strong>.</p><p>I prefer <strong>weekdays</strong> (Monday to Friday). Any time works.</p><p>Once we align, I will send the invite with the video-call link and the form.</p>' +
      '<p>This text is provisional and will be replaced by the final copy.</p>',
  },
  schedule_form: {
    subject: 'Booking confirmed - Skin Call',
    body:
      `${heading('Booking confirmed')}` +
      '<p>Hi {{nome}},</p><p>The session is booked for <strong>{{quando}}</strong>.</p>' +
      EMAIL_BLOCO +
      '<p>This text is provisional and will be replaced by the final copy.</p>',
  },
  diagnostic_invite: {
    subject: 'You are almost there! Skin Call skin diagnostic',
    body:
      '<p>Hi {{nome}},</p><p>We are almost there! So I can understand the best plan for you, I need you to fill in this short skin diagnostic.</p>' +
      EMAIL_BLOCO +
      '<p>This link is personal and for one-time use.</p>',
  },
};
