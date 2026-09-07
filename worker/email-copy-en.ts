import { CONTACT_FALLBACKS } from './pricing';
import {
  EMAIL_BLOCO,
  EMAIL_BOTAO_CHAMADA,
  EMAIL_BOTAO_FORMULARIO,
  SIG_INSTAGRAM_FALLBACK,
  SIG_WEBSITE_FALLBACK,
  type EmailCopy,
} from './email-copy';

function blockOnly(subject: string) {
  return { subject, body: EMAIL_BLOCO };
}

function p(text: string): string {
  return `<p>${text}</p>`;
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
      p('Hello Bride {{nome}}!!!') +
      p('First of all, congratulations on your engagement! We are so happy to be part of this special moment.') +
      p('I can confirm I have availability for makeup on {{data_casamento}}, in {{local_preparacao}}, so you are ready by {{hora_pronta}}.') +
      p('I am attaching a PDF with all the details of our bridal service. If you would also like hairstyling, please let me know so I can confirm availability with the team ASAP.') +
      p('We know the day is even happier when shared with bridesmaids and family, and they can get ready with us too. For now, it also helps to have an estimate of how many guests will want this and which service(s) they would like! This number is only an estimate, so we know how many professionals we need, and only has to be confirmed closer to the date.') +
      p('For all these reasons, we can only calculate the travel fee once we know the booked services and how many professionals need to be allocated.') +
      p('I am here for any questions that come up :)') +
      p('With love,'),
  },
  bridal: blockOnly('Quote - Bridal'),
  beauty: {
    subject: 'Quote - Beauty',
    body:
      p('Hello {{nome}},') +
      p('I can confirm I have availability for your glam! Here is all the information and the quote.') +
      p('Please check every detail to make sure it is correct.') +
      EMAIL_BLOCO +
      p('To finish at (time), we need to start the glam at [time].') +
      p('To book, I always ask for a 50% payment of the total by MB Way or bank transfer. Tell me which method you prefer and I will send all the details.') +
      p('I am here for any questions that come up.') +
      p('Kisses,'),
  },
  skin_call: {
    subject: 'Quote - Skin Call',
    body:
      p('Hello {{nome}},') +
      p('How are you?') +
      p('It is time to take care of your skin! Because healthy, cared-for skin is the first step for it to look beautiful.') +
      p('Based on your form answers, the plan I consider best for you is {{plano}}.') +
      p('[Insert a short explanation].') +
      EMAIL_BLOCO +
      p('Shall we take care of your skin, in a simple way, based on science?') +
      p('Kisses,'),
  },
  education: blockOnly('Quote - Education'),
  bridal_terms: blockOnly('Terms - Bridal'),
  beauty_terms: blockOnly('Terms - Beauty'),
  skin_call_terms: blockOnly('Terms - Skin Call'),
  education_terms: blockOnly('Terms - Education'),
  schedule: {
    subject: 'Book sessions - Skin Call',
    body:
      p('Hello {{nome}},') +
      p('The purchase of the {{plano}} plan was completed successfully.') +
      p('Shall we start taking care of your skin?') +
      p('To book the (first) session, please send me at least 3 date and time suggestions.') +
      p('We are mostly available on weekdays (Monday to Friday) and you can choose the time that works best for you, even after work.') +
      p('Once we agree on the date and time, I will send the invite with the video-call link and the form for you to fill in.') +
      p('Kisses,'),
  },
  schedule_form: {
    subject: 'Booking confirmed - Skin Call',
    body:
      p('Hello {{nome}},') +
      p('The (first) session is booked for {{quando}}. Click «Join the Call» below on [day] at [time] to start the call!') +
      EMAIL_BOTAO_CHAMADA +
      EMAIL_BOTAO_FORMULARIO +
      p('It will take you about 10 minutes to complete. It is intentionally very detailed, and it is important that you fill it in honestly and as completely as possible, because these answers are what allow me to advise you in a personalised and accurate way. Please remember you need to fill it in at least 48 hours before our session.') +
      p('If you do not understand or cannot answer a question, you can message me on WhatsApp or wait until the session so we can clear it up. Either way, it is really important that you do not keep any doubts and that you tell me everything you consider relevant for proper follow-up! We have to work together to make the Skin Call a success.') +
      p('Kisses,'),
  },
};
