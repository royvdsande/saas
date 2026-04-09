const SUPPORTED_LANGUAGES = ["en", "nl", "fr"];

const UI_TRANSLATIONS = {
  en: {
    "auth.password.min": "6 or more characters",
    "auth.password.good": "Looks good",
    "auth.banner.postCheckout": "Your plan and subscription are ready! Create an account to save everything.",
    "pricing.checkout.success": "Checkout completed. Your premium status is being synced.",
  },
  nl: {
    "auth.password.min": "6 of meer tekens",
    "auth.password.good": "Ziet er goed uit",
    "auth.banner.postCheckout": "Je plan en abonnement zijn klaar! Maak een account aan om alles op te slaan.",
    "pricing.checkout.success": "Afrekenen voltooid. Je premiumstatus wordt nu gesynchroniseerd.",
  },
  fr: {
    "auth.password.min": "6 caractères ou plus",
    "auth.password.good": "Parfait",
    "auth.banner.postCheckout": "Votre programme et votre abonnement sont prêts ! Créez un compte pour tout sauvegarder.",
    "pricing.checkout.success": "Paiement terminé. Votre statut premium est en cours de synchronisation.",
  },
};

const PAGE_TRANSLATIONS = {
  "/": {
    title: {
      nl: "FitFlow – Jouw AI Personal Trainer",
      fr: "FitFlow – Votre coach personnel IA",
    },
    description: {
      nl: "Ontvang in 60 seconden een persoonlijk trainings- en voedingsplan. Aangedreven door AI, afgestemd op jouw doelen.",
      fr: "Obtenez en 60 secondes un plan d'entraînement et de nutrition personnalisé. Propulsé par l'IA, adapté à vos objectifs.",
    },
    text: {
      "Trusted by 10,000+ athletes": { nl: "Vertrouwd door 10.000+ sporters", fr: "Adopté par plus de 10 000 sportifs" },
      "Your AI-Powered Personal Trainer": { nl: "Jouw AI-gedreven Personal Trainer", fr: "Votre coach personnel propulsé par l'IA" },
      "Get a personalized training and nutrition plan in 60 seconds. Tell us your goals, and our AI builds a complete week-by-week program tailored to your body and lifestyle.": { nl: "Ontvang in 60 seconden een persoonlijk trainings- en voedingsplan. Vertel ons je doelen en onze AI bouwt een compleet week-tot-week programma op maat van jouw lichaam en levensstijl.", fr: "Obtenez en 60 secondes un plan d'entraînement et de nutrition personnalisé. Dites-nous vos objectifs et notre IA construit un programme complet semaine par semaine, adapté à votre corps et votre mode de vie." },
      "Get your free plan →": { nl: "Ontvang je gratis plan →", fr: "Obtenez votre plan gratuit →" },
      "See pricing ↗": { nl: "Bekijk prijzen ↗", fr: "Voir les tarifs ↗" },
      "Your perfect plan in 3 simple steps": { nl: "Jouw perfecte plan in 3 simpele stappen", fr: "Votre plan idéal en 3 étapes simples" },
      "No guesswork. No generic templates. Just science-backed, AI-generated plans built for you.": { nl: "Geen giswerk. Geen standaard templates. Alleen wetenschappelijk onderbouwde, door AI gemaakte plannen voor jou.", fr: "Pas d'improvisation. Pas de modèles génériques. Juste des plans générés par IA et fondés sur la science, conçus pour vous." },
      "Tell us your goal": { nl: "Vertel ons je doel", fr: "Parlez-nous de votre objectif" },
      "Lose weight, build muscle, get fitter — pick your path and share basic stats like height, weight, and activity level.": { nl: "Afvallen, spiermassa opbouwen, fitter worden — kies je route en deel basisgegevens zoals lengte, gewicht en activiteitsniveau.", fr: "Perdre du poids, prendre du muscle, être plus en forme — choisissez votre voie et partagez des données de base comme la taille, le poids et le niveau d'activité." },
      "AI builds your plan": { nl: "AI maakt je plan", fr: "L'IA crée votre plan" },
      "Our AI analyzes your profile and generates a complete 7-day training schedule and nutrition plan in seconds.": { nl: "Onze AI analyseert je profiel en genereert in seconden een volledig 7-daags trainingsschema en voedingsplan.", fr: "Notre IA analyse votre profil et génère en quelques secondes un programme d'entraînement de 7 jours et un plan nutritionnel complet." },
      "Train & track progress": { nl: "Train & volg je progressie", fr: "Entraînez-vous et suivez vos progrès" },
      "Follow your personalized program, track workouts, and get weekly plan updates as you progress toward your goals.": { nl: "Volg je persoonlijke programma, houd workouts bij en krijg wekelijkse updates terwijl je richting je doelen werkt.", fr: "Suivez votre programme personnalisé, suivez vos entraînements et recevez des mises à jour hebdomadaires au fil de votre progression." },
      "Everything you need to reach your goals": { nl: "Alles wat je nodig hebt om je doelen te bereiken", fr: "Tout ce dont vous avez besoin pour atteindre vos objectifs" },
      "Powered by AI, designed for results. FitFlow combines smart technology with fitness science.": { nl: "Aangedreven door AI, ontworpen voor resultaat. FitFlow combineert slimme technologie met fitnesswetenschap.", fr: "Propulsé par l'IA, conçu pour des résultats. FitFlow combine technologie intelligente et science du fitness." },
      "AI Training Plans": { nl: "AI-trainingsplannen", fr: "Plans d'entraînement IA" },
      "Complete 7-day workout schedules with exercises, sets, reps, and rest periods tailored to your fitness level.": { nl: "Volledige 7-daagse workoutschema's met oefeningen, sets, herhalingen en rusttijden afgestemd op jouw niveau.", fr: "Programmes complets de 7 jours avec exercices, séries, répétitions et temps de repos adaptés à votre niveau." },
      "Custom Nutrition": { nl: "Persoonlijke voeding", fr: "Nutrition personnalisée" },
      "Daily meal plans with breakfast, lunch, dinner, and snacks — complete with calorie targets and macros.": { nl: "Dagelijkse maaltijdplannen met ontbijt, lunch, diner en snacks — inclusief caloriedoelen en macro's.", fr: "Plans repas quotidiens avec petit-déjeuner, déjeuner, dîner et collations — avec objectifs caloriques et macros." },
      "Progress Tracking": { nl: "Voortgang bijhouden", fr: "Suivi des progrès" },
      "Monitor your journey with visual progress indicators and see how your body transforms week by week.": { nl: "Volg je traject met visuele voortgangsindicatoren en zie hoe je lichaam week na week verandert.", fr: "Suivez votre parcours avec des indicateurs visuels et observez la transformation de votre corps semaine après semaine." },
      "Weekly Updates": { nl: "Wekelijkse updates", fr: "Mises à jour hebdomadaires" },
      "Your plan evolves with you. Get fresh training and nutrition adjustments every week to keep improving.": { nl: "Je plan groeit met je mee. Ontvang elke week nieuwe aanpassingen voor training en voeding om te blijven verbeteren.", fr: "Votre plan évolue avec vous. Recevez chaque semaine de nouveaux ajustements d'entraînement et de nutrition." },
      "Science-Backed": { nl: "Wetenschappelijk onderbouwd", fr: "Fondé sur la science" },
      "Every plan is built on proven exercise science and nutrition principles, optimized by AI for your unique profile.": { nl: "Elk plan is gebouwd op bewezen trainings- en voedingsprincipes, geoptimaliseerd door AI voor jouw unieke profiel.", fr: "Chaque plan repose sur des principes éprouvés d'entraînement et de nutrition, optimisés par l'IA pour votre profil unique." },
      "Works Everywhere": { nl: "Werkt overal", fr: "Fonctionne partout" },
      "Access your plans on any device. Train at the gym, at home, or on the go — your program follows you.": { nl: "Toegang tot je plannen op elk apparaat. Train in de gym, thuis of onderweg — je programma gaat met je mee.", fr: "Accédez à vos plans sur n'importe quel appareil. Entraînez-vous en salle, à la maison ou en déplacement — votre programme vous suit." },
      "See what your plan looks like": { nl: "Bekijk hoe je plan eruitziet", fr: "Découvrez à quoi ressemble votre programme" },
      "Here's a taste of what FitFlow generates. Your full plan is just a few clicks away.": { nl: "Hier is een voorproefje van wat FitFlow genereert. Je volledige plan is nog maar een paar klikken verwijderd.", fr: "Voici un aperçu de ce que FitFlow génère. Votre programme complet est à quelques clics." },
      "Monday — Training Plan": { nl: "Maandag — Trainingsplan", fr: "Lundi — Plan d'entraînement" },
      "Unlock your full 7-day plan": { nl: "Ontgrendel je volledige 7-daagse plan", fr: "Débloquez votre plan complet de 7 jours" },
      "Get started free →": { nl: "Start gratis →", fr: "Commencez gratuitement →" },
      "Ready to transform your fitness?": { nl: "Klaar om je fitheid te transformeren?", fr: "Prêt à transformer votre forme ?" },
      "Join thousands of athletes who trust FitFlow to build their perfect plan. Start in 60 seconds — no credit card required.": { nl: "Sluit je aan bij duizenden sporters die FitFlow vertrouwen voor hun perfecte plan. Start in 60 seconden — geen creditcard nodig.", fr: "Rejoignez des milliers de sportifs qui font confiance à FitFlow pour créer leur plan idéal. Démarrez en 60 secondes — sans carte bancaire." },
      "© 2026 FitFlow. All rights reserved.": { nl: "© 2026 FitFlow. Alle rechten voorbehouden.", fr: "© 2026 FitFlow. Tous droits réservés." },
    },
  },
  "/pricing": {
    title: { nl: "FitFlow – Prijzen", fr: "FitFlow – Tarifs" },
    description: {
      nl: "Kies het plan dat bij je fitnessdoelen past. Start gratis en upgrade wanneer je wilt.",
      fr: "Choisissez le plan qui correspond à vos objectifs fitness. Commencez gratuitement, passez à niveau à tout moment.",
    },
    text: {
      "Simple, honest pricing": { nl: "Eenvoudige, eerlijke prijzen", fr: "Tarifs simples et transparents" },
      "Start with a free AI-generated plan. Upgrade to unlock unlimited plans, weekly updates, and more.": { nl: "Start met een gratis AI-gegenereerd plan. Upgrade voor onbeperkte plannen, wekelijkse updates en meer.", fr: "Commencez avec un plan gratuit généré par l'IA. Passez à niveau pour débloquer des plans illimités, des mises à jour hebdomadaires et plus encore." },
      "Perfect to get started.": { nl: "Perfect om te starten.", fr: "Parfait pour commencer." },
      "For serious athletes.": { nl: "Voor serieuze sporters.", fr: "Pour les sportifs sérieux." },
      "The ultimate experience.": { nl: "De ultieme ervaring.", fr: "L'expérience ultime." },
      "1 AI plan per month": { nl: "1 AI-plan per maand", fr: "1 plan IA par mois" },
      "7-day training schedule": { nl: "7-daags trainingsschema", fr: "Programme d'entraînement sur 7 jours" },
      "Basic nutrition guide": { nl: "Basis voedingsgids", fr: "Guide nutritionnel de base" },
      "Email support": { nl: "E-mailondersteuning", fr: "Support par e-mail" },
      "Upgrade to Starter": { nl: "Upgrade naar Starter", fr: "Passer à Starter" },
      "Most popular": { nl: "Meest gekozen", fr: "Le plus populaire" },
      "Unlimited AI plans": { nl: "Onbeperkte AI-plannen", fr: "Plans IA illimités" },
      "Weekly plan updates": { nl: "Wekelijkse planupdates", fr: "Mises à jour hebdomadaires" },
      "Detailed macro tracking": { nl: "Gedetailleerde macro-tracking", fr: "Suivi détaillé des macros" },
      "Priority support": { nl: "Prioriteitssupport", fr: "Support prioritaire" },
      "Upgrade to Pro": { nl: "Upgrade naar Pro", fr: "Passer à Pro" },
      "Everything in Pro": { nl: "Alles in Pro", fr: "Tout ce qui est dans Pro" },
      "AI coaching chat": { nl: "AI-coachingchat", fr: "Chat de coaching IA" },
      "Custom meal preferences": { nl: "Aangepaste maaltijdvoorkeuren", fr: "Préférences repas personnalisées" },
      "Dedicated support": { nl: "Toegewijde support", fr: "Support dédié" },
      "Upgrade to Elite": { nl: "Upgrade naar Elite", fr: "Passer à Elite" },
      "Questions & Answers": { nl: "Vragen & Antwoorden", fr: "Questions & Réponses" },
      "Can I try FitFlow for free?": { nl: "Kan ik FitFlow gratis proberen?", fr: "Puis-je essayer FitFlow gratuitement ?" },
      "Yes! Create an account and get your first AI-generated training and nutrition plan completely free. No credit card needed.": { nl: "Ja! Maak een account aan en ontvang je eerste AI-gegenereerde trainings- en voedingsplan helemaal gratis. Geen creditcard nodig.", fr: "Oui ! Créez un compte et obtenez gratuitement votre premier plan d'entraînement et de nutrition généré par l'IA. Aucune carte bancaire requise." },
      "How does the AI generate my plan?": { nl: "Hoe genereert de AI mijn plan?", fr: "Comment l'IA génère-t-elle mon plan ?" },
      "Our AI analyzes your fitness goals, activity level, body stats, and preferences to create a science-backed 7-day training and nutrition plan tailored specifically to you.": { nl: "Onze AI analyseert je fitnessdoelen, activiteitsniveau, lichaamsgegevens en voorkeuren om een wetenschappelijk onderbouwd 7-daags trainings- en voedingsplan op maat te maken.", fr: "Notre IA analyse vos objectifs fitness, votre niveau d'activité, vos données corporelles et vos préférences pour créer un plan de 7 jours fondé sur la science et adapté à vous." },
      "What payment methods do you accept?": { nl: "Welke betaalmethoden accepteren jullie?", fr: "Quels moyens de paiement acceptez-vous ?" },
      "We use Stripe for secure payments. Accepted methods include credit/debit cards, iDEAL, and more depending on your region.": { nl: "We gebruiken Stripe voor veilige betalingen. Geaccepteerde methoden zijn onder andere credit-/debitcards, iDEAL en meer, afhankelijk van je regio.", fr: "Nous utilisons Stripe pour des paiements sécurisés. Les méthodes acceptées incluent les cartes de crédit/débit, iDEAL, et plus selon votre région." },
      "Can I change plans or cancel anytime?": { nl: "Kan ik op elk moment van plan wisselen of opzeggen?", fr: "Puis-je changer de plan ou annuler à tout moment ?" },
      "Absolutely. Upgrade, downgrade, or cancel from your dashboard at any time. No long-term commitments.": { nl: "Absoluut. Upgrade, downgrade of zeg op vanuit je dashboard op elk moment. Geen langetermijnverplichtingen.", fr: "Absolument. Passez à un plan supérieur, inférieur ou annulez depuis votre tableau de bord à tout moment. Sans engagement." },
    },
  },
  "/auth/login": {
    title: { nl: "FitFlow – Inloggen", fr: "FitFlow – Se connecter" },
    text: {
      "Welcome back! Sign in with Google or use your email and password.": { nl: "Welkom terug! Log in met Google of gebruik je e-mail en wachtwoord.", fr: "Bon retour ! Connectez-vous avec Google ou utilisez votre e-mail et mot de passe." },
      "Or continue with": { nl: "Of ga verder met", fr: "Ou continuer avec" },
      "Email": { nl: "E-mail", fr: "E-mail" },
      "Password": { nl: "Wachtwoord", fr: "Mot de passe" },
      "Send magic link": { nl: "Stuur magic link", fr: "Envoyer un lien magique" },
      "We'll send a temporary login link to your email address.": { nl: "We sturen een tijdelijke inloglink naar je e-mailadres.", fr: "Nous enverrons un lien de connexion temporaire à votre adresse e-mail." },
      "Don't have an account?": { nl: "Nog geen account?", fr: "Vous n'avez pas de compte ?" },
      "Back to homepage": { nl: "Terug naar homepage", fr: "Retour à l'accueil" },
    },
    placeholders: {
      "you@example.com": { nl: "jij@voorbeeld.com", fr: "vous@exemple.com" },
      "••••••••": { nl: "••••••••", fr: "••••••••" },
    },
  },
  "/auth/signup": {
    title: { nl: "FitFlow – Registreren", fr: "FitFlow – S'inscrire" },
    text: {
      "Create your account": { nl: "Maak je account aan", fr: "Créez votre compte" },
      "Sign up to get your free AI-generated training and nutrition plan.": { nl: "Meld je aan om je gratis AI-gegenereerde trainings- en voedingsplan te ontvangen.", fr: "Inscrivez-vous pour obtenir votre plan d'entraînement et de nutrition gratuit généré par l'IA." },
      "Or continue with": { nl: "Of ga verder met", fr: "Ou continuer avec" },
      "Name": { nl: "Naam", fr: "Nom" },
      "Email": { nl: "E-mail", fr: "E-mail" },
      "Password": { nl: "Wachtwoord", fr: "Mot de passe" },
      "Create account": { nl: "Account aanmaken", fr: "Créer un compte" },
      "Already have an account?": { nl: "Heb je al een account?", fr: "Vous avez déjà un compte ?" },
      "Back to homepage": { nl: "Terug naar homepage", fr: "Retour à l'accueil" },
    },
    placeholders: {
      "John Smith": { nl: "Jan Jansen", fr: "Jean Dupont" },
      "you@example.com": { nl: "jij@voorbeeld.com", fr: "vous@exemple.com" },
      "At least 6 characters": { nl: "Minimaal 6 tekens", fr: "Au moins 6 caractères" },
    },
  },
};

const SHARED_TEXT = {
  Home: { nl: "Home", fr: "Accueil" },
  "How it works": { nl: "Hoe het werkt", fr: "Comment ça marche" },
  Features: { nl: "Functies", fr: "Fonctionnalités" },
  Pricing: { nl: "Prijzen", fr: "Tarifs" },
  "Sign in": { nl: "Inloggen", fr: "Se connecter" },
  "Log in": { nl: "Inloggen", fr: "Se connecter" },
  "Get started": { nl: "Start", fr: "Commencer" },
  Dashboard: { nl: "Dashboard", fr: "Tableau de bord" },
  Menu: { nl: "Menu", fr: "Menu" },
  "How it works": { nl: "Hoe het werkt", fr: "Comment ça marche" },
  Features: { nl: "Functies", fr: "Fonctionnalités" },
  Preview: { nl: "Preview", fr: "Aperçu" },
};

function normalize(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

function resolveLanguage() {
  const languages = Array.isArray(navigator.languages) && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
  for (const language of languages) {
    const short = String(language).toLowerCase().split("-")[0];
    if (SUPPORTED_LANGUAGES.includes(short)) return short;
  }
  return "en";
}

function replaceTextNodes(textMap, lang) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const updates = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) continue;

    const original = node.nodeValue;
    const compact = normalize(original);
    if (!compact) continue;

    const translationSet = textMap[compact];
    const translated = translationSet?.[lang];
    if (!translated) continue;

    const leading = original.match(/^\s*/)?.[0] || "";
    const trailing = original.match(/\s*$/)?.[0] || "";
    updates.push({ node, value: `${leading}${translated}${trailing}` });
  }

  updates.forEach(({ node, value }) => {
    node.nodeValue = value;
  });
}

function replacePlaceholders(placeholderMap, lang) {
  document.querySelectorAll("input[placeholder]").forEach((input) => {
    const current = input.getAttribute("placeholder") || "";
    const translated = placeholderMap[current]?.[lang];
    if (translated) {
      input.setAttribute("placeholder", translated);
    }
  });
}

function currentPageKey() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (path === "/" || path === "/index.html") return "/";
  if (path === "/pricing" || path === "/pricing.html") return "/pricing";
  if (path === "/auth/login" || path === "/auth/login.html") return "/auth/login";
  if (path === "/auth/signup" || path === "/auth/signup.html") return "/auth/signup";
  return path;
}

export const currentLanguage = resolveLanguage();

export function t(key, fallback = "") {
  return UI_TRANSLATIONS[currentLanguage]?.[key] || fallback;
}

export function translateCurrentPage() {
  const pageKey = currentPageKey();
  const pageConfig = PAGE_TRANSLATIONS[pageKey] || {};
  const textMap = { ...SHARED_TEXT, ...(pageConfig.text || {}) };

  document.documentElement.lang = currentLanguage;

  if (pageConfig.title?.[currentLanguage]) {
    document.title = pageConfig.title[currentLanguage];
  }

  if (pageConfig.description?.[currentLanguage]) {
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) descriptionMeta.setAttribute("content", pageConfig.description[currentLanguage]);
  }

  if (currentLanguage === "en") return;

  replaceTextNodes(textMap, currentLanguage);
  replacePlaceholders(pageConfig.placeholders || {}, currentLanguage);
}
