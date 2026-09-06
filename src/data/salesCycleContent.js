// Content sourced directly from "The Insurance Sales Cycle" (1Sang Banyuhay
// Foundation Skills Training document). Each topic renders through
// SalesCycleDetail.js, which knows how to draw each block "type" below.
// To update this content later, edit this file directly.

export const overview = {
  intro: [
    'Insurance selling is not a one-time transaction. It is a continuous process of finding people, understanding their needs, presenting an appropriate solution, addressing concerns, helping them decide, and taking care of them after the sale.',
    'At the center of the entire sales cycle is branding.',
  ],
  stagesTable: {
    headers: ['Stage', 'Primary Goal', 'Brand Experience'],
    rows: [
      ['1. Prospecting', 'Find and qualify people you can help', 'Relevant and approachable'],
      ['2. Presentation', 'Understand needs and make the problem visible', 'Competent and client-centered'],
      ['3. Objection-Handling', 'Clarify what prevents a confident decision', 'Patient, honest, and educational'],
      ['4. Closing', 'Guide an informed and responsible decision', 'Clear and respectful'],
      ['5. Maximizing Sales', 'Build a long-term relationship and advocacy', 'Present and dependable'],
    ],
  },
  cycleNote:
    'A completed sale can lead to policy reviews, additional needs, introductions, referrals, and new prospects. Every good client experience feeds the next cycle. This is why branding must connect all five stages rather than appear only at the beginning.',
  remember: 'You do not simply close a sale. You open a relationship.',
  corePrinciple:
    'Brand before the meeting so people will consider you. Brand during the conversation so people will trust you. Brand after the sale so clients will confidently refer you.',
};

export const topics = [
  {
    key: 'branding',
    order: 0,
    isCenter: true,
    label: 'Branding',
    shortLabel: 'BRANDING',
    color: '#a85a2b',
    tagline: 'The core that connects every stage',
    sections: [
      { type: 'p', text: 'Clients have many options. They may speak with another planner, consider another company, or postpone getting insurance altogether. With many planners offering similar types of solutions, simply being visible is no longer enough.' },
      { type: 'callout', label: "THE CLIENT'S QUESTION", text: 'Sa dami ng planners na puwede kong lapitan, bakit ikaw ang pipiliin at pagkakatiwalaan ko?' },

      { type: 'h', text: 'Branding Is Your Promise' },
      { type: 'p', text: 'Your brand is the consistent promise people associate with your name. It is the impression you create through your knowledge, communication, behavior, and quality of service.' },
      { type: 'p', text: 'A strong brand helps people say:' },
      { type: 'quotes', items: [
        'Siya iyong planner na madaling kausap.',
        'Magaling siyang magpaliwanag. Hindi nakakalito.',
        'Hindi siya basta nagbebenta. Iniintindi niya muna ang kailangan ng client.',
        'Maaasahan siya kahit tapos na ang application.',
      ]},

      { type: 'h', text: 'Why You Need to Stand Out' },
      { type: 'p', text: 'Many planners post online, attend training, share financial information, and offer insurance products. When everyone uses the same posters and captions, clients may struggle to remember who shared them.' },
      { type: 'p', text: 'Standing out does not mean being loud, controversial, or overly promotional. It means giving people a clear and memorable reason to choose you.' },
      { type: 'bullets', items: [
        'Market: the people you understand and serve especially well',
        'Message: the financial concerns you consistently discuss',
        'Method: the way you simplify planning and guide clients',
        'Personality: how people feel when speaking with you',
        'Proof: the actions and experiences that demonstrate your capability',
        'Service: the support clients receive before and after the sale',
        'Consistency: how reliably you deliver the same quality of experience',
      ]},
      { type: 'callout', text: 'You do not need to be the planner for everyone. Become the right and memorable planner for the people you want to serve.' },

      { type: 'h', text: 'Define Your Distinct Brand' },
      { type: 'numbered', items: [
        'Who do I understand especially well?',
        'What financial problem do I genuinely care about?',
        'What do clients appreciate about the way I assist them?',
        'What experience do I want every client to have?',
        'What can I consistently provide that clients will remember?',
        'What three words do I want people to associate with my name?',
      ]},

      { type: 'h', text: 'Examples of Distinct Planner Brands' },
      { type: 'bullets', items: [
        'The planner who helps public school teachers understand protection without complicated terms',
        'The planner who helps young parents begin with a practical and sustainable plan',
        'The planner who makes retirement planning easier for Filipino employees',
        'The planner who helps entrepreneurs protect their families and businesses',
        'The planner who remains present and responsive after the policy is issued',
      ]},
      { type: 'callout', label: 'TOO GENERIC', text: 'Planner: "Licensed financial advisor po ako. Baka gusto ninyong kumuha ng insurance?"' },
      { type: 'p', text: 'Licensing establishes credibility, but your distinct value gives people a reason to remember and choose you.' },

      { type: 'h', text: 'The ABC of Branding' },
      { type: 'h3', text: 'A: Accomplishments' },
      { type: 'p', text: 'Share accomplishments that demonstrate professional growth, including training, examinations, awards, client presentations, learning activities, and business milestones. Do not merely post the award. Explain what it represents and how it helps you serve clients better.' },
      { type: 'postComparison',
        generic: 'Another award! Thank you, Lord!',
        better: 'This recognition represents more families who decided to prepare for emergencies, education, and retirement. Maraming salamat sa tiwala. Patuloy pa akong mag-aaral at mag-improve para mas mapagsilbihan ko kayo nang maayos.',
      },
      { type: 'h3', text: 'B: Business' },
      { type: 'p', text: 'Show that your work is about solving financial problems, not merely offering products. Create useful content about cash flow, emergency funds, debt, health risks, income protection, education, retirement, estate planning, savings, and investments.' },
      { type: 'callout', label: 'CONTENT SAMPLE', text: 'Hindi lahat ng may ipon ay financially prepared. Kapag ang buong savings ay puwedeng maubos sa isang emergency, kailangan nating tingnan kung sapat ba ang protection, hindi lang kung may naitatabi.' },
      { type: 'h3', text: 'C: Commitment' },
      { type: 'p', text: 'Make the work behind the profession visible: preparation, coaching, training, product study, client reviews, service requests, and continued improvement.' },
      { type: 'callout', label: 'CONTENT SAMPLE', text: 'Tapos na ang client meeting, pero hindi pa tapos ang trabaho. I’m reviewing the details again to make sure na tugma ang recommendation sa priorities at budget ng client.' },

      { type: 'h', text: 'Branding Connects the Entire Cycle' },
      { type: 'table',
        headers: ['Stage', 'Branding Objective', 'What People Should Remember'],
        rows: [
          ['Prospecting', 'Become relevant and approachable', 'Naiintindihan niya ang mga taong tulad ko.'],
          ['Presentation', 'Demonstrate competence and understanding', 'Nakinig siya at malinaw siyang magpaliwanag.'],
          ['Objection-Handling', 'Build trust through honest education', 'Hindi niya ako pinilit o dinismiss.'],
          ['Closing', 'Guide an informed decision', 'Tinulungan niya akong pumili nang maayos.'],
          ['Maximizing Sales', 'Prove commitment after the sale', 'Hindi niya ako iniwan pagkatapos kong kumuha.'],
        ],
      },
      { type: 'h', text: 'The Standard to Remember' },
      { type: 'quotes', items: [
        'Brand before the meeting so people will consider you.',
        'Brand during the meeting so people will trust you.',
        'Brand after the meeting so people will remember you.',
        'Brand after the sale so clients will confidently refer you.',
      ]},
      { type: 'p', text: 'Do not aim to be known simply as someone who sells insurance. Aim to become known as a planner with a clear purpose, a distinct way of helping, and a quality of service that clients cannot easily find elsewhere.' },
      { type: 'p', text: 'The product may also be available through other planners. Your knowledge, personality, process, commitment, and relationship with the client are what make the experience uniquely yours.' },

      { type: 'h', text: 'Planner Self-Check' },
      { type: 'bullets', items: [
        'Is my content helping people understand a real financial concern?',
        'Does my approach feel personal and relevant instead of copied?',
        'Do I listen before recommending?',
        'Do my answers build understanding instead of winning an argument?',
        'Does my closing style guide rather than pressure?',
        'Is my after-sales service worth referring?',
        'Does every stage reflect both galing and malasakit?',
      ]},
    ],
  },

  {
    key: 'prospecting',
    order: 1,
    label: '1. Prospecting',
    shortLabel: 'PROSPECTING',
    color: '#8b3a3a',
    goal: 'Find, qualify, and connect with people you may genuinely be able to help.',
    sections: [
      { type: 'p', text: 'Prospecting is more than collecting names and sending the same message to everyone. It involves identifying people whose responsibilities, goals, and life stages may create a need for financial planning.' },

      { type: 'h', text: 'Suspect vs. Prospect' },
      { type: 'compare',
        left: { label: 'Suspect', text: 'Appears to fit your client profile based on age, occupation, family status, location, or life stage. Further qualification is needed.' },
        right: { label: 'Prospect', text: 'Someone you know more about through prior interaction, a point of connection, or initial fact-finding.' },
      },

      { type: 'h', text: 'A Qualified Prospect Generally Has' },
      { type: 'bullets', items: [
        'Awareness of a possible financial need',
        'Ability and authority to decide',
        'Willingness to listen',
        'A reason or sense of urgency to act',
      ]},

      { type: 'h', text: 'Branding During Prospecting' },
      { type: 'p', text: 'Branding begins before the first formal conversation. Many prospects will visit your profile before replying. They will observe what you post, how you communicate, and whether you appear credible and approachable.' },
      { type: 'p', text: 'Not everyone who reads your content will react. Some may quietly follow your posts for weeks or months before reaching out. Your content should gradually answer:' },
      { type: 'quotes', items: [
        'May maitutulong ba sa akin ang planner na ito?',
        'Naiintindihan ba niya ang mga taong tulad ko?',
        'Komportable ba akong makipag-usap sa kanya?',
      ]},

      { type: 'h', text: 'How to Stand Out' },
      { type: 'p', text: 'Avoid relying entirely on standard company posters and copied captions. Add your own observation, experience, or explanation.' },
      { type: 'postComparison',
        generic: 'Protect your future. Get insured today!',
        better: 'Maraming breadwinner ang may emergency fund para sa pamilya pero walang sariling paghahanda kapag sila naman ang nagkasakit. Kapag ang breadwinner ang nawalan ng income, buong household ang apektado.',
      },
      { type: 'dialogue', label: 'SAMPLE DIALOGUE', lines: [
        { speaker: 'Planner', text: 'Hi! Napansin ko na marami sa mga ka-age natin ang nagsisimula nang mag-isip tungkol sa health at retirement, pero hindi alam kung saan magsisimula. I help clients check what they already have and identify possible gaps. Open ka ba sa short financial check-up? No obligation naman.' },
      ]},
      { type: 'callout', label: 'PLANNER REMINDER', text: 'The immediate goal is to set a meeting, not force an immediate sale.' },
    ],
  },

  {
    key: 'presentation',
    order: 2,
    label: '2. Presentation',
    shortLabel: 'PRESENTATION',
    color: '#9d5220',
    goal: "Understand the client's situation and help the client recognize the need for a solution.",
    sections: [
      { type: 'p', text: 'An effective presentation is not a product lecture. It is a problem-solving conversation built on listening and storytelling.' },

      { type: 'h', text: 'Recommended Presentation Flow' },
      { type: 'numbered', items: [
        'Sell yourself: establish why the client can trust you.',
        'Sell the idea: help the client understand the financial need.',
        'Sell the solution: explain the appropriate strategy.',
        'Sell the product: show how the product supports the strategy.',
      ]},

      { type: 'h', text: 'Branding During the Presentation' },
      { type: 'p', text: 'Your presentation style is part of your brand. If you claim to be client-centered but control the entire conversation, the client will remember the experience more than your social media posts.' },
      { type: 'p', text: 'Your brand is demonstrated by how you:' },
      { type: 'bullets', items: [
        'Ask meaningful questions',
        'Listen without interrupting',
        'Explain technical concepts simply',
        'Use relatable examples',
        "Respect the client’s budget",
        'Recommend based on actual needs',
        'Admit when information requires verification',
        'Avoid pressuring the client',
      ]},

      { type: 'dialogue', label: 'SAMPLE DIALOGUE', lines: [
        { speaker: 'Planner', text: 'Before tayo tumingin ng product, gusto ko munang maintindihan kung ano ang pinakaimportanteng goal ninyo ngayon. Ano ang financial responsibility na ayaw ninyong maiwan sa family if something unexpected happens?' },
        { speaker: 'Client', text: 'Pinakaimportante sa akin iyong education ng mga anak ko.' },
        { speaker: 'Planner', text: 'Sige po. Hindi muna tayo magsisimula sa product. Tingnan muna natin kung magkano ang kailangan para maipagpatuloy ang education nila kahit magkaroon ng interruption sa income ninyo.' },
      ]},

      { type: 'h', text: 'Brand the Experience' },
      { type: 'p', text: 'Whether the client applies or not, the meeting can still strengthen your brand. With permission and without revealing confidential information, share the lesson from the conversation.' },
      { type: 'callout', label: 'CONTENT SAMPLE', text: 'A client meeting today reminded me that preparing for education is not only about saving for tuition. Kailangan ding maprotektahan ang taong nagpo-provide ng education fund. The goal should continue even if the income suddenly stops.' },
    ],
  },

  {
    key: 'objectionHandling',
    order: 3,
    label: '3. Objection-Handling',
    shortLabel: 'OBJECTION HANDLING',
    color: '#6b4423',
    goal: 'Understand what is preventing the client from confidently moving forward.',
    sections: [
      { type: 'p', text: 'An objection does not always mean rejection. It may indicate that the client needs more information, reassurance, or a recommendation that better fits the current situation. Do not become defensive. The objection identifies which part of the presentation needs further clarification.' },

      { type: 'h', text: 'The ACT Method' },
      { type: 'h3', text: 'A: Acknowledge' },
      { type: 'p', text: 'Recognize the concern without dismissing it.' },
      { type: 'dialogue', label: 'ACKNOWLEDGE', lines: [
        { speaker: 'Client', text: 'Parang mahal yata.' },
        { speaker: 'Planner', text: 'Valid concern po iyon. Importante talaga na comfortable kayo sa amount na iko-commit ninyo.' },
      ]},
      { type: 'h3', text: 'C: Clarify Before Commenting' },
      { type: 'p', text: 'Determine the real issue before providing an answer.' },
      { type: 'dialogue', label: 'CLARIFY', lines: [
        { speaker: 'Planner', text: 'Kapag sinabi ninyong mahal, ang concern po ba ay hindi siya pasok sa monthly budget, or hindi pa clear kung sapat ang value na makukuha ninyo?' },
      ]},
      { type: 'h3', text: 'T: Transition' },
      { type: 'p', text: 'Connect the clarified concern to an honest explanation or possible solution.' },
      { type: 'dialogue', label: 'TRANSITION', lines: [
        { speaker: 'Client', text: 'Hindi ko yata kayang ituloy buwan-buwan.' },
        { speaker: 'Planner', text: 'Naiintindihan ko po. Since sustainability ang concern, tingnan natin kung anong amount ang kaya ninyong panindigan consistently. Mas mabuting practical ang simula kaysa mataas nga ang coverage pero mahirap namang ituloy.' },
      ]},

      { type: 'h', text: 'Branding During Objection-Handling' },
      { type: 'p', text: 'This is where your character becomes more visible. Anyone can appear helpful when the client immediately agrees. Your brand becomes credible when you remain patient, honest, and respectful when concerns are raised.' },
      { type: 'quotes', items: [
        'Nakikinig ako.',
        'Valid ang concern mo.',
        'Ipapaliwanag ko ito nang maayos.',
        'Hindi kita pipilitin.',
        'Gusto kong naiintindihan mo bago ka magdesisyon.',
      ]},

      { type: 'h', text: 'Turn Objections Into Educational Content' },
      { type: 'p', text: 'Common objections can become useful content for other prospects. Discuss them generally without identifying the client.' },
      { type: 'labeledQuotes', label: 'CONTENT SAMPLES', items: [
        { label: 'Affordability post', text: 'Kapag sinabi ng client na "wala akong budget," hindi agad ibig sabihin na ayaw niya. Minsan kailangan lamang i-align ang protection sa kasalukuyang cash flow. The best plan is not always the one with the highest premium. It is the one that addresses the need and can be maintained.' },
        { label: 'Stability post', text: 'Valid ang tanong na, "Paano kung may mangyari sa insurance company?" Hindi ito dapat sagutin ng simpleng "impossible iyon." A responsible planner should explain the company’s background, regulation, financial information, and the safeguards applicable to the policy.' },
      ]},
    ],
  },

  {
    key: 'closing',
    order: 4,
    label: '4. Closing',
    shortLabel: 'CLOSING',
    color: '#b8763f',
    goal: 'Help the client make a clear, informed, and responsible decision.',
    sections: [
      { type: 'p', text: 'Closing is not forcing someone to say yes. It is helping the client move from understanding to action. If you have correctly identified the problem and presented an appropriate solution, asking the client to proceed is part of your responsibility.' },

      { type: 'h', text: 'Sample Closing Dialogues' },
      { type: 'dialogue', label: 'BENEFICIARY CLOSE', lines: [
        { speaker: 'Planner', text: 'Kung may mangyari sa inyo, sino po ang gusto ninyong makatanggap ng benefit at matulungan ng plan?' },
      ]},
      { type: 'dialogue', label: 'PAYMENT-MODE CLOSE', lines: [
        { speaker: 'Planner', text: 'Ano po ang mas comfortable sa cash flow ninyo: monthly, quarterly, semiannual, or annual?' },
      ]},
      { type: 'dialogue', label: 'MEDICAL CLOSE', lines: [
        { speaker: 'Planner', text: 'Health and insurability can change over time. Gusto ba ninyong simulan natin ang application habang maaari pa tayong mag-apply based on your current health?' },
      ]},
      { type: 'dialogue', label: 'DECISION CLOSE', lines: [
        { speaker: 'Planner', text: 'Based sa napag-usapan natin, comfortable na po ba kayong simulan ang application, or may part pa kayong gustong linawin bago tayo mag-proceed?' },
      ]},
      { type: 'dialogue', label: 'SCHEDULED FOLLOW-UP', lines: [
        { speaker: 'Client', text: 'Hindi pa talaga kaya ngayon.' },
        { speaker: 'Planner', text: 'I understand. Ayokong pilitin ninyo ang budget. Kailan magiging mas realistic na balikan natin ito? Maaari ba tayong mag-set ng specific date para hindi tuluyang makalimutan ang goal?' },
      ]},

      { type: 'h', text: 'Branding During Closing' },
      { type: 'p', text: "How you close determines whether the client feels guided or pressured. A strong brand does not celebrate the sale at the expense of the client's privacy. It communicates the meaning behind the decision." },
      { type: 'postComparison',
        generic: 'Another closed sale! Thank you, client!',
        better: 'A young parent decided to begin building protection today. Hindi pa nito masasagot ang lahat ng financial goals, pero may maayos at sustainable nang foundation ang family. Hindi kailangang perfect agad. Ang mahalaga, nagsimula nang responsable.',
      },
    ],
  },

  {
    key: 'maximizingSales',
    order: 5,
    label: '5. Maximizing Sales',
    shortLabel: 'MAXIMIZING SALES',
    color: '#c9975c',
    goal: 'Turn a completed transaction into a long-term client relationship.',
    sections: [
      { type: 'p', text: 'The quality of your after-sales service determines whether the client remains a buyer or becomes an advocate.' },

      { type: 'h', text: 'From Buyer to Advocate' },
      { type: 'compare',
        left: { label: 'Buyer', text: 'Owns a policy.' },
        right: { label: 'Advocate', text: 'Understands the value, trusts the planner, feels supported, shares a positive experience, and confidently introduces the planner to others.' },
      },

      { type: 'h', text: 'Make Policy Delivery Meaningful' },
      { type: 'p', text: 'Policy delivery is not simply handing over a document or forwarding a PDF. Use it to explain:' },
      { type: 'bullets', items: [
        'Why the plan was created',
        'What financial need it addresses',
        'Who will benefit from it',
        'What the client needs to maintain',
        'How service requests and claims can be initiated',
        'When the policy should be reviewed',
      ]},
      { type: 'dialogue', label: 'POLICY DELIVERY', lines: [
        { speaker: 'Planner', text: 'This is more than a policy document. Ito ang napagdesisyunan ninyong gawin para maprotektahan ang income at future ng family ninyo. Review natin together para malinaw kung ano ang covered, ano ang kailangan ninyong i-maintain, at paano ako makokontak ng family ninyo if they need assistance.' },
      ]},

      { type: 'h', text: 'Ask for Referrals After Demonstrating Value' },
      { type: 'p', text: 'Do not ask for names simply because the application has been completed. First, give the client a service experience worth recommending.' },
      { type: 'dialogue', label: 'REFERRAL CONVERSATION', lines: [
        { speaker: 'Planner', text: 'I’m glad na naging helpful sa inyo ang process. May kakilala rin ba kayong breadwinner or parent na maaaring makatulong ang ganitong financial check-up? Hindi ko naman sila pipilitin. I can offer them the same conversation and help them understand their options.' },
      ]},

      { type: 'h', text: 'Branding During Client Service' },
      { type: 'p', text: 'After-sales service is one of the strongest opportunities to stand out. Many clients expect planners to become less visible after the policy is issued. Be remembered as the planner who provides updates, responds promptly, conducts reviews, assists with service requests, and remains present even when there is no new sale.' },
      { type: 'dialogue', label: 'POLICY REVIEW', lines: [
        { speaker: 'Planner', text: 'Noong ginawa natin ang plan, ito ang income, responsibilities, at priorities ninyo. May nagbago na po ba since then? Review natin kung aligned pa rin ang coverage sa current situation ninyo.' },
      ]},
      { type: 'callout', label: 'CONTENT SAMPLE', text: 'Today’s policy review was a reminder that financial plans should grow with the client. Nagbabago ang income, family responsibilities, at priorities. A plan that was appropriate three years ago may need to be reviewed today.' },
    ],
  },
];
