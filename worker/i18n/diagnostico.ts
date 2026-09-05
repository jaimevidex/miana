import { DEFAULT_LOCALE, type Locale } from '../locale';

export interface DiagChrome {
  title: string;
  pageTitle: (page: number) => string;
  successTitle: string;
  intro1: string;
  intro2: string;
  identification: string;
  history: string;
  dermHistory: string;
  lifestyle: string;
  yourSkin: string;
  currentRoutine: string;
  preferences: string;
  visual: string;
  fullName: string;
  age: string;
  phone: string;
  email: string;
  agePh: string;
  describeIf: string;
  describe: string;
  specify: string;
  next: string;
  prev: string;
  submit: string;
  required: string;
  requiredPhotos: string;
  saving: string;
  sending: string;
  saveError: string;
  sendError: string;
  successBody: string;
  photosLabel: string;
  photosHint: string;
  photoFront: string;
  photoLeft: string;
  photoRight: string;
  consent: string;
  describeOther: string;
}

const pt: DiagChrome = {
  title: 'Análise da tua Pele',
  pageTitle: (page) => `Análise da Pele - Página ${page}`,
  successTitle: 'Diagnóstico Enviado',
  intro1:
    'Para que a nossa chamada seja o mais proveitosa possível, precisas de preencher este formulário detalhado. Todas as informações serão usadas exclusivamente para analisar a tua pele e rotina, sendo confidenciais.',
  intro2:
    'O formulário tem 3 páginas, e a cada página é necessário preencher os campos obrigatórios. Quando a questão não se aplica, colocar "Não se aplica". Se não tiveres tempo para preencher todos os campos, podes guardar o formulário e continuar mais tarde.',
  identification: 'Identificação',
  history: 'Histórico',
  dermHistory: 'Histórico Dermatológico',
  lifestyle: 'Estilo & Hábitos de Vida',
  yourSkin: 'A Tua Pele',
  currentRoutine: 'A Tua Rotina Atual',
  preferences: 'As tuas preferências e expectativas',
  visual: 'Avaliação Visual',
  fullName: 'Nome Completo',
  age: 'Idade',
  phone: 'Contacto Telefónico',
  email: 'Email',
  agePh: 'Ex: 28',
  describeIf: 'Descreve se aplicável...',
  describe: 'Descreve...',
  specify: 'Especifica se aplicável...',
  next: 'Próxima →',
  prev: '← Anterior',
  submit: 'Submeter Diagnóstico',
  required: 'Faltam alguns campos obrigatórios.',
  requiredPhotos: 'Faltam alguns campos obrigatórios (incluindo fotos).',
  saving: 'A guardar...',
  sending: 'A enviar diagnóstico...',
  saveError: 'Erro ao guardar. Tenta de novo.',
  sendError: 'Algo correu mal. Tenta de novo.',
  successBody: 'Obrigada! Recebi o teu diagnóstico. Entrarei em contacto dentro de 48h.',
  photosLabel: 'Upload de Fotos da Pele',
  photosHint:
    'Por favor, anexa 3 fotos da tua pele sem qualquer maquilhagem, creme ou filtro, tiradas com luz natural de janela (sem luz direta):<br/>1. Frente | 2. Perfil Esquerdo | 3. Perfil Direito<br/>Formatos: JPG, PNG ou HEIC (iPhone) - HEIC é convertido automaticamente.',
  photoFront: 'Foto 1 - Frente',
  photoLeft: 'Foto 2 - Perfil Esquerdo',
  photoRight: 'Foto 3 - Perfil Direito',
  consent:
    'Li e aceito que os meus dados sejam usados para o meu acompanhamento de pele, e que seja contactado/a pela Mariana.',
  describeOther: 'Descreve',
};

const en: DiagChrome = {
  title: 'Your skin analysis',
  pageTitle: (page) => `Skin analysis - Page ${page}`,
  successTitle: 'Diagnostic sent',
  intro1:
    'So our call is as useful as possible, please fill in this detailed form. All information is used only to analyse your skin and routine, and stays confidential.',
  intro2:
    'The form has 3 pages, and each page needs the required fields. If a question does not apply, write "Not applicable". If you do not have time to finish, you can save and continue later.',
  identification: 'Identification',
  history: 'History',
  dermHistory: 'Dermatological history',
  lifestyle: 'Lifestyle & habits',
  yourSkin: 'Your skin',
  currentRoutine: 'Your current routine',
  preferences: 'Your preferences and expectations',
  visual: 'Visual assessment',
  fullName: 'Full name',
  age: 'Age',
  phone: 'Phone number',
  email: 'Email',
  agePh: 'E.g. 28',
  describeIf: 'Describe if it applies...',
  describe: 'Describe...',
  specify: 'Specify if it applies...',
  next: 'Next →',
  prev: '← Back',
  submit: 'Submit diagnostic',
  required: 'Some required fields are missing.',
  requiredPhotos: 'Some required fields are missing (including photos).',
  saving: 'Saving...',
  sending: 'Sending diagnostic...',
  saveError: 'Could not save. Please try again.',
  sendError: 'Something went wrong. Please try again.',
  successBody: 'Thank you! I received your diagnostic. I will get back to you within 48 hours.',
  photosLabel: 'Skin photo upload',
  photosHint:
    'Please attach 3 photos of your skin with no makeup, cream or filter, taken in natural window light (no direct sun):<br/>1. Front | 2. Left profile | 3. Right profile<br/>Formats: JPG, PNG or HEIC (iPhone) - HEIC is converted automatically.',
  photoFront: 'Photo 1 - Front',
  photoLeft: 'Photo 2 - Left profile',
  photoRight: 'Photo 3 - Right profile',
  consent:
    'I have read and accept that my data will be used for my skin follow-up, and that Mariana may contact me.',
  describeOther: 'Describe',
};

/** PT option value → EN label. Values stored in D1 stay Portuguese. */
export const DIAG_OPTION_EN: Record<string, string> = {
  Grávida: 'Pregnant',
  'Tive bebé nos últimos 12 meses': 'I had a baby in the last 12 months',
  'A amamentar': 'Breastfeeding',
  'A planear engravidar': 'Planning to get pregnant',
  'Nenhuma das anteriores': 'None of the above',
  Acne: 'Acne',
  Rosácea: 'Rosacea',
  'Dermatite (Atópica, Seborreica, Perioral ou de Contacto)':
    'Dermatitis (atopic, seborrhoeic, perioral or contact)',
  Eczema: 'Eczema',
  Psoríase: 'Psoriasis',
  Melasma: 'Melasma',
  'Lúpus ou outra doença autoimune com manifestação cutânea':
    'Lupus or another autoimmune disease with skin signs',
  'Nenhum / Nunca fui diagnosticada com doenças de pele':
    'None / I have never been diagnosed with a skin condition',
  Outro: 'Other',
  Sim: 'Yes',
  Não: 'No',
  '1 - Muito Baixo': '1 - Very low',
  '5 - Muito Elevado': '5 - Very high',
  'Sono Reparador (Dormes entre 7 a 9 horas seguidas e acordas descansada)':
    'Restorative sleep (7 to 9 hours in a row and you wake up rested)',
  'Poucas Horas de sono (Dormes menos de 6 horas por noite com frequência)':
    'Few hours of sleep (often under 6 hours a night)',
  'Sono Fragmentado/Agitado (Acordas várias vezes durante a noite ou demoras muito a adormecer)':
    'Broken / restless sleep (you wake often or take a long time to fall asleep)',
  'Dormes em horários Irregulares (Acordas/deitas-te frequentemente em horas diferentes)':
    'Irregular schedule (you often sleep and wake at different times)',
  'Baixa (<1L)': 'Low (<1L)',
  'Média (aproximadamente 1,5L)': 'Medium (about 1.5L)',
  'Alta (2L ou mais)': 'High (2L or more)',
  Equilibrada: 'Balanced',
  'Rica em processados': 'High in processed foods',
  'Rica em açúcares': 'High in sugar',
  'Alto consumo de lacticínios': 'High dairy intake',
  'Dieta com pouca gordura': 'Low-fat diet',
  'Vegetariana/vegan': 'Vegetarian / vegan',
  'Consumo muito café (a partir de 4 cafés por dia)': 'I drink a lot of coffee (4+ a day)',
  'Salto refeições com frequência': 'I often skip meals',
  'Baixa (Trabalho no interior)': 'Low (indoor work)',
  'Moderada (Deslocações diárias)': 'Moderate (daily commuting)',
  'Alta (Trabalho/desporto no exterior)': 'High (outdoor work / sport)',
  'Estou frequentemente exposta a ar Condicionado/Aquecimento':
    'I am often around air conditioning / heating',
  'Sou fumadora (qualquer tipo)': 'I smoke (any type)',
  'Estou frequentemente exposta a fumo/poluição': 'I am often around smoke / pollution',
  'Pratico desporto frequentemente': 'I exercise often',
  'Pratico natação': 'I swim',
  'Uso máscara no trabalho': 'I wear a mask at work',
  'Estou frequentemente exposta a luz azul (ecrãs)': 'I am often exposed to blue light (screens)',
  'Oleosa no rosto todo (brilho visível e sensação de filme escorregadio)':
    'Oily all over (visible shine and a slippery film)',
  'Oleosa apenas na Zona T (testa, nariz e queixo) e normal nas bochechas':
    'Oily only in the T-zone (forehead, nose, chin) and normal on the cheeks',
  'Confortável e equilibrada': 'Comfortable and balanced',
  'Muito seca, a repuxar ou a escamar': 'Very dry, tight or flaking',
  'Vermelha, quente ou irritada': 'Red, warm or irritated',
  'Começa a produzir óleo rapidamente': 'It starts producing oil quickly',
  'Fica baça, repuxa e tens vontade imediata de pôr hidratante':
    'It looks dull, feels tight and you immediately want moisturiser',
  'Mantém-se confortável sem necessidade de aplicar nada':
    'It stays comfortable without needing anything',
  'Começa a arder ou a ficar com manchas vermelhas': 'It starts to sting or show red patches',
  'Brilho excessivo que parece "gordura" (onde a maquilhagem derrete ou desaparece)':
    'Excess shine that looks greasy (makeup melts or disappears)',
  'Pele a escamar, com zonas secas (onde a maquilhagem craquela)':
    'Flaking skin with dry patches (makeup cracks)',
  'Aspeto cansado, baço e sem luminosidade': 'Tired, dull look with no glow',
  'Vermelhidão intensa nas maçãs do rosto ou à volta do nariz':
    'Strong redness on the cheeks or around the nose',
  'Não tenho nenhuma destas preocupações': 'I do not have any of these concerns',
  'Grãozinhos pretos no nariz/queixo (filamentos sebáceos)':
    'Black grains on the nose / chin (sebaceous filaments)',
  'Textura irregular/rugosa ao toque, como se tivesse "areia" sob a pele':
    'Uneven / rough texture, like sand under the skin',
  'Zonas ásperas e a escamar': 'Rough, flaking areas',
  'Bolinhas brancas muito duras ao toque, que não doem, não inflamam e parecem estar "presas" sob a pele há meses':
    'Very hard white bumps that do not hurt or inflame and feel stuck under the skin for months',
  'Tenho o tom irregular, manchas escuras ou acastanhadas':
    'Uneven tone, dark or brownish patches',
  'Tenho vermelhidão constante (rubor nas bochechas/nariz)':
    'Constant redness (flushing on the cheeks / nose)',
  'Sinto que as manchas parecem escurecer com a exposição ao calor':
    'Patches seem to darken with heat',
  'Noto que as marcas deixadas por borbulhas antigas demoram meses a desaparecer':
    'Marks from old breakouts take months to fade',
  'Sinto sensação de picada, ardor ou queimadura ao aplicar produtos simples':
    'Stinging, burning or heat when I apply simple products',
  'Sinto a pele "fina", repuxada e brilhante (aspeto plastificado), mas a escamar em certas zonas':
    'Skin feels thin, tight and shiny (plastic look), but flakes in some areas',
  'Sinto que a pele absorve os cremes instantaneamente, mas minutos depois volta a ficar seca':
    'Creams absorb instantly, then the skin feels dry again minutes later',
  'Sinto a pele a ficar vermelha, quente ou reativa perante fatores externos':
    'Skin gets red, warm or reactive with external factors',
  'Tenho tendência a ficar com marcas vermelhas ao tocar na pele, comichão':
    'I tend to get red marks and itchiness when I touch my skin',
  'Noto zonas de escamação ou pequenas vermelhidões concentradas em áreas específicas':
    'Flaking or small redness concentrated in specific areas',
  'Noto lesões/borbulhas profundas, dolorosas e internas':
    'Deep, painful, internal breakouts',
  'Noto que as borbulhas ou imperfeições tendem a aparecer quase sempre nas mesmas zonas':
    'Breakouts tend to appear in the same areas',
  'Noto um agravamento claro na semana anterior à menstruação ou após consumir certos alimentos':
    'A clear flare the week before my period or after certain foods',
  'Noto pontos negros ou brancos, mas sem inflamação nem dor':
    'Blackheads or whiteheads, without inflammation or pain',
  'Noto que surgem borbulhas após usar certos produtos cosméticos':
    'Breakouts appear after certain cosmetic products',
  'Noto que as borbulhas surgem em zonas de fricção diária':
    'Breakouts appear in areas of daily friction',
  'Tenho o hábito compulsivo de mexer, espremer ou raspar as lesões':
    'I have a compulsive habit of picking, squeezing or scraping spots',
  'Noto uma textura de "grãozinhos" ou borbulhas pequeninas e uniformes':
    'A texture of tiny, even bumps',
  'Noto que as linhas de expressão só aparecem quando sorrio ou gesticulo':
    'Expression lines only show when I smile or move my face',
  'Noto linhas ou rugas visíveis mesmo com o rosto totalmente em repouso':
    'Lines or wrinkles visible even at rest',
  'Sinto uma perda de firmeza ou elasticidade no contorno do rosto, pescoço ou colo':
    'Loss of firmness or elasticity in the jawline, neck or décolleté',
  'Olheiras arroxeadas/azuladas': 'Purple / bluish dark circles',
  'Olheiras castanhas/escuras': 'Brown / dark circles',
  'Cavidade funda': 'Hollow under-eye',
  'Inchaço / Bolsas matinais': 'Puffiness / morning bags',
  'Linhas finas de desidratação / Pés de galinha': 'Dehydration lines / crow\'s feet',
  '7 dias por semana': '7 days a week',
  '4 a 6 dias por semana': '4 to 6 days a week',
  '1 a 3 dias por semana': '1 to 3 days a week',
  'Há semanas que não cumpo a rotina': 'There are weeks I do not follow the routine',
  'Diariamente (Alta cobertura/longa duração)': 'Daily (high coverage / long wear)',
  'Diariamente (Apenas algo leve)': 'Daily (something light only)',
  '2 a 3 vezes por semana': '2 to 3 times a week',
  'Apenas em ocasiões especiais ou raramente': 'Only on special occasions or rarely',
  Nunca: 'Never',
  'Óleo ou bálsamo desmaquilhante': 'Cleansing oil or balm',
  'Água micelar': 'Micellar water',
  'Apenas com o gel de limpeza': 'Only with cleanser',
  'Toalhitas desmaquilhantes': 'Makeup wipes',
  'Não aplicável': 'Not applicable',
  'Lavo com água quente': 'I wash with hot water',
  'Lavo com água tépida': 'I wash with lukewarm water',
  'Seco com a toalha habitual (das mãos ou do corpo)':
    'I dry with my usual towel (hands or body)',
  'Seco com uma toalha de utilização única/descartável': 'I dry with a single-use / disposable towel',
  'Minimalista / Express (2 min)': 'Minimal / express (2 min)',
  'Moderado (5 min)': 'Moderate (5 min)',
  'Ritual Completo (10+ min)': 'Full ritual (10+ min)',
  'Oleosas / Densas': 'Oily / rich',
  'Pegajosas / Efeito "cola"': 'Sticky / glue-like',
  'Demasiado aquosas': 'Too watery',
  'Perfumes/Cheiros fortes': 'Strong perfume / scent',
  'Nenhum dos anteriores': 'None of the above',
  'Falta de tempo': 'Lack of time',
  'Esquecimento/Falta de consistência': 'Forgetting / lack of consistency',
  'Desmotivação por demorar a ver resultados': 'Losing motivation because results take time',
  'Não saber a ordem dos produtos': 'Not knowing the product order',
  'Não saber que produtos devo usar': 'Not knowing which products to use',
  'Não tenho essa dificuldade': 'I do not have that difficulty',
  Acessível: 'Accessible',
  Intermédio: 'Mid-range',
  Premium: 'Premium',
};

export const DIAG_LABEL_EN: Record<string, string> = {
  Identificação: 'Identification',
  Histórico: 'History',
  'Histórico Dermatológico': 'Dermatological history',
  'Estilo & Hábitos de Vida': 'Lifestyle & habits',
  'A Tua Pele': 'Your skin',
  'A Tua Rotina Atual': 'Your current routine',
  'As tuas preferências e expectativas': 'Your preferences and expectations',
  'Avaliação Visual': 'Visual assessment',
  'Encontras-te nalguma destas situações?': 'Are you in any of these situations?',
  'Tens alguma doença ou condição crónica diagnosticada?':
    'Do you have any diagnosed chronic illness or condition?',
  'Tens Alergias ou Intolerâncias Alimentares conhecidas?':
    'Do you have any known food allergies or intolerances?',
  'Tens Alergias conhecidas a ingredientes cosméticos, medicamentos ou substâncias?':
    'Do you have any known allergies to cosmetic ingredients, medicines or substances?',
  'Tomas alguma medicação contínua?': 'Do you take any ongoing medication?',
  'Tens algum DIAGNÓSTICO MÉDICO para alguma destas condições?':
    'Do you have a MEDICAL DIAGNOSIS for any of these conditions?',
  'Já fizeste medicação oral para a pele no passado? Se sim, qual?':
    'Have you taken oral medication for your skin in the past? If yes, which?',
  'Já usaste medicação tópica para a pele no passado? Se sim, qual? Como reagiu a tua pele?':
    'Have you used topical medication for your skin in the past? If yes, which? How did your skin react?',
  'Fizeste tratamentos estéticos/dermatológicos nos últimos 6 meses ou tiveste alguma má experiência em gabinete?':
    'Have you had aesthetic / dermatological treatments in the last 6 months, or a bad in-clinic experience?',
  'Já tiveste episódios de "burnout" cutâneo ou reações graves após usar algum produto? Se sim, qual foi o produto?':
    'Have you had skin "burnout" or a severe reaction after a product? If yes, which product?',
  'Tens pequenos vasos sanguíneos visíveis no rosto?':
    'Do you have small visible blood vessels on your face?',
  'Ex: nas abas do nariz, maçãs do rosto ou queixo':
    'E.g. on the sides of the nose, cheeks or chin',
  'Sentes que a tua pele "ruboriza" (fica vermelha e quente) subitamente?':
    'Does your skin flush (turn red and warm) suddenly?',
  'Ex: Com comidas picantes, bebidas alcoólicas, banhos quentes, mudanças de temperatura ou emoções':
    'E.g. spicy food, alcohol, hot showers, temperature changes or emotions',
  'Como reage a tua pele às mudanças de estação?': 'How does your skin react to seasonal changes?',
  'Ex: No inverno escama/seca, no verão fica incontrolavelmente oleosa...':
    'E.g. it flakes / dries in winter, gets uncontrollably oily in summer...',
  'Qual o teu nível de stress diário?': 'What is your daily stress level?',
  'Como descreves o teu sono?': 'How would you describe your sleep?',
  'Dormes habitualmente de que lado?': 'Which side do you usually sleep on?',
  'Com que frequência trocas a fronha da almofada?': 'How often do you change your pillowcase?',
  'Como é a tua ingestão diária de água?': 'How is your daily water intake?',
  'Como classificas a tua alimentação habitual?': 'How would you describe your usual diet?',
  'Qual o teu nível de exposição solar diário?': 'What is your daily sun exposure?',
  'Alguma destas situações faz parte da tua rotina?': 'Is any of this part of your routine?',
  'Ao acordar, qual é a primeira sensação na pele do rosto?':
    'When you wake up, what is the first feeling on your face?',
  'Duas horas após lavares o rosto (sem aplicar qualquer creme), como está a tua pele?':
    'Two hours after washing your face (with no cream), how is your skin?',
  'À tarde, algum destes cenários é comum?': 'In the afternoon, is any of this common?',
  'Tens preocupações com a textura da tua pele?': 'Do you have concerns about your skin texture?',
  'Tens preocupações com cor na tua pele?': 'Do you have concerns about colour on your skin?',
  'Como reage a tua pele ao toque e aos produtos básicos?':
    'How does your skin react to touch and basic products?',
  'Como reage a tua pele ao ambiente e em zonas específicas do rosto?':
    'How does your skin react to the environment and in specific areas?',
  'Como se comportam as tuas borbulhas ou imperfeições?':
    'How do your breakouts or blemishes behave?',
  'Como notas as tuas linhas e a firmeza do rosto?':
    'How do you notice your lines and facial firmness?',
  'Como caracterizas a zona do teu contorno de olhos?':
    'How would you describe your eye contour?',
  'Descreve, o mais detalhadamente possível, a tua rotina da manhã. Especifica os produtos que usas, a ordem com que os aplicas e com que frequência os usas:':
    'Describe your morning routine in as much detail as you can. Include products, order and how often you use them:',
  'Descreve, o mais detalhadamente possível, a tua rotina da noite. Especifica os produtos que usas, a ordem com que os aplicas e com que frequência os usas:':
    'Describe your evening routine in as much detail as you can. Include products, order and how often you use them:',
  'Quantos dias por semana cumpres a tua rotina completa de manhã e à noite sem falhar?':
    'How many days a week do you complete your full morning and evening routine without skipping?',
  'Fazes esfoliação física (com grãozinhos/fricção)? Com que frequência?':
    'Do you physically exfoliate (grains / friction)? How often?',
  'Usas máscaras? Quais? Com que frequência?': 'Do you use masks? Which ones? How often?',
  'Usas dispositivos de limpeza (ex: escovas de silicone, Foreo)? Com que frequência?':
    'Do you use cleansing devices (e.g. silicone brushes, Foreo)? How often?',
  'Existe algum produto do qual não prescindes por nada e que sentes que transforma a tua pele?':
    'Is there a product you would never give up and that you feel transforms your skin?',
  'Existe algum produto que compraste e não gostaste? Por que motivo deixaste de o usar?':
    'Is there a product you bought and did not like? Why did you stop using it?',
  'Com que frequência usas maquilhagem?': 'How often do you wear makeup?',
  'Habitualmente, como retiras a maquilhagem no final do dia?':
    'How do you usually remove makeup at the end of the day?',
  'Como lavas e secas o rosto?': 'How do you wash and dry your face?',
  'Com que frequência lavas os pincéis e esponjas de maquilhagem?':
    'How often do you wash makeup brushes and sponges?',
  'Com que frequência limpas o ecrã do telemóvel?': 'How often do you clean your phone screen?',
  'Tens o hábito de mexer frequentemente no rosto? (ter as mãos no rosto, pousar a cabeça na mão,…)':
    'Do you often touch your face? (hands on your face, resting your head on your hand, ...)',
  'Tens o hábito de espremer borbulhas?': 'Do you have a habit of squeezing spots?',
  'Fazes depilação no rosto? Com que frequência? Qual o método? Como reage a pele?':
    'Do you remove hair on your face? How often? Which method? How does your skin react?',
  'Quanto tempo pretendes dedicar à tua rotina diária?':
    'How much time do you want to spend on your daily routine?',
  'Que tipo de texturas DETESTAS sentir na pele?':
    'Which textures do you HATE feeling on your skin?',
  'Qual é a tua maior dificuldade em manter uma rotina?':
    'What is your biggest difficulty keeping a routine?',
  'Orçamento médio pretendido para a nova rotina:':
    'Target average budget for the new routine:',
  'Se só pudesses resolver UMA coisa na tua pele nos próximos 3 meses, qual seria?':
    'If you could only fix ONE thing on your skin in the next 3 months, what would it be?',
  'E qual seria a segunda coisa mais importante?': 'And what would be the second most important thing?',
  'Qual é a pergunta ou dúvida que NÃO PODE FICAR POR RESPONDER na nossa chamada?':
    'What question or doubt CANNOT go unanswered on our call?',
  'Há mais alguma coisa importante que me queiras dizer?':
    'Is there anything else important you want to tell me?',
  'Produtos, ordem de aplicação, frequência...': 'Products, application order, frequency...',
  'Ex: Tretinoína, Ketrel, Differin, Ácido Azelaico de farmácia...':
    'E.g. Tretinoin, Ketrel, Differin, pharmacy azelaic acid...',
  'Ex: Peelings químicos, Microagulhamento, Laser, Botox...':
    'E.g. chemical peels, microneedling, laser, Botox...',
  'Sensação de queimadura, vermelhidão extrema ou escamação...':
    'Burning, extreme redness or flaking...',
};

export function diagChrome(locale: Locale): DiagChrome {
  return locale === 'en' ? en : pt;
}

export function diagOptionLabel(value: string, locale: Locale): string {
  if (locale !== 'en') return value;
  return DIAG_OPTION_EN[value] || value;
}

export function diagFieldLabel(label: string, locale: Locale): string {
  if (locale !== 'en') return label;
  return DIAG_LABEL_EN[label] || label;
}

export function diagCopy(locale: Locale = DEFAULT_LOCALE): DiagChrome {
  return diagChrome(locale);
}
