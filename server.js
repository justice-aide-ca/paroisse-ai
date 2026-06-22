require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3005;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json());
app.use(express.static('public'));

// ===== LISTE DES PAYS =====
const paysList = [
    "France", "Canada", "États-Unis", "Maroc", "Algérie", "Tunisie",
    "Sénégal", "Côte d'Ivoire", "Cameroun", "Belgique", "Suisse",
    "Allemagne", "Espagne", "Italie", "Portugal", "Royaume-Uni",
    "Brésil", "Mexique", "Inde", "Chine", "Japon", "Corée du Sud", "Russie"
];

app.get('/api/pays', (req, res) => {
    res.json(paysList);
});

// ===== ROUTE DEMANDE PAROISSIALE =====
app.post('/api/submit-paroisse-request', async (req, res) => {
    const { pays, diocese, unite, paroisse, typeDemande, contexte, besoin, nom, date, language } = req.body;

    console.log('📋 Demande paroissiale reçue:', typeDemande, 'Pays:', pays, 'Nom:', nom);

    const reference = 'PAR_' + Date.now().toString(36).toUpperCase();

    let aiResponse = "Service IA en cours d'activation...";

    const languageNames = {
        fr: 'français',
        en: 'anglais',
        es: 'espagnol',
        de: 'allemand',
        ar: 'arabe',
        pt: 'portugais',
        it: 'italien',
        ru: 'russe',
        zh: 'chinois',
        ja: 'japonais',
        ko: 'coréen',
        hi: 'hindi'
    };

    const promptLang = languageNames[language] || 'français';

    const prompt = `
Tu es un assistant pastoral pour le diocèse d'Edmundston (Nouveau-Brunswick, Canada), en lien avec la Conférence des Évêques du Canada (CECC).

📜 **PRINCIPES PASTORAUX FONDÉS SUR LA DÉCLARATION DE LA CECC (10 JUIN 2026)** :

1. **Vie humaine** : Toute vie humaine est un don de Dieu, dotée d'une dignité et d'une valeur profondes, et ce, jusqu'à son terme naturel.
2. **AMM / Euthanasie** : L'Église affirme que l'euthanasie et le suicide assisté, quels qu'en soient les motifs, consistent à provoquer ou à hâter intentionnellement la mort. De tels actes ne peuvent en aucun cas être moralement acceptables.
3. **Accompagnement compatissant** : La véritable compassion ne répond pas à la souffrance en provoquant la mort, mais elle accompagne les personnes qui souffrent en leur apportant de l'espoir, une présence, des soins palliatifs et un soulagement de la douleur.
4. **Communauté de guérison** : L'Église est appelée à devenir une "communauté de guérison" pour les plus faibles et les plus vulnérables.

**CONTEXTE DE LA DEMANDE** :
Unité pastorale: ${unite}
Paroisse: ${paroisse}
Type de demande: ${typeDemande}
Contexte: ${contexte}
Besoin pastoral: ${besoin}
Nom: ${nom}
Date souhaitée: ${date}

Langue: ${promptLang}

**STRUCTURE DE TA RÉPONSE** :
1. **ACCUEIL ET ÉCOUTE** : Accueille la personne avec bienveillance et compassion. Reconnais sa souffrance ou celle de ses proches.
2. **ÉCLAIRAGE PASTORAL** : Rappelle la doctrine de l'Église sur la vie et la dignité humaine, en t'appuyant sur la déclaration de la CECC. Sois clair sur la position de l'Église concernant l'aide médicale à mourir.
3. **ACCOMPAGNEMENT COMPATISSANT** : Propose des démarches concrètes pour accompagner la personne dans l'épreuve. Offre une présence fraternelle, le sacrement des malades comme source de force et de paix, et oriente vers les ressources en soins palliatifs pour un accompagnement de la douleur et de la souffrance. Propose également la prière et une rencontre avec le prêtre pour un soutien personnalisé.
4. **RESSOURCES** : Mentionne les ressources du diocèse et de la CECC.
5. **CONTACTS UTILES** : 
   - Pour contacter un prêtre, veuillez appeler le secrétariat de votre paroisse.
   - Le secrétariat vous mettra en relation avec un prêtre disponible pour un accompagnement pastoral, une confession, un sacrement des malades ou toute autre demande spirituelle.
`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Tu es un assistant pastoral professionnel." },
                { role: "user", content: prompt }
            ],
            max_tokens: 800
        });
        aiResponse = completion.choices[0].message.content;
        console.log('✅ IA a répondu');
    } catch (err) {
        console.error('❌ Erreur IA:', err.message);
        aiResponse = "Service IA indisponible. Le prêtre vous contactera sous 48h.";
    }

    // Sauvegarde
    let demandes = [];
    try {
        const data = fs.readFileSync('./data/demandes.json', 'utf8');
        demandes = JSON.parse(data);
    } catch (err) {
        demandes = [];
    }

    demandes.push({
        reference,
        date: new Date().toISOString(),
        pays,
        diocese,
        unite,
        paroisse,
        typeDemande,
        contexte,
        besoin,
        nom,
        dateSouhaitee: date,
        aiResponse,
        language
    });

    fs.writeFileSync('./data/demandes.json', JSON.stringify(demandes, null, 2));

    res.json({
        success: true,
        message: 'Votre demande a bien été reçue',
        reference: reference,
        aiResponse: aiResponse,
        date: new Date().toISOString()
    });
});

// ===== ROUTE ADMIN =====
app.get('/api/admin/demandes', (req, res) => {
    try {
        const data = fs.readFileSync('./data/demandes.json', 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.json([]);
    }
});

app.get('/admin', (req, res) => {
    const password = req.query.password;
    if (password !== 'paroisse2026') {
        res.send('<h1>🔒 Accès refusé</h1><a href="/">Retour</a>');
        return;
    }
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ===== PAGES =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// ===== DÉMARRAGE =====
const server = app.listen(PORT, () => {
    console.log(`⛪ Paroisse AI sur http://localhost:${PORT}`);
    console.log('📋 Pastorale de soins - Diocèse d\'Edmundston');
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} déjà utilisé.`);
    } else {
        console.error('❌ Erreur:', err);
    }
});