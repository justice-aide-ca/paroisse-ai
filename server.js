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
Tu es un assistant pastoral pour le diocèse de ${diocese} (${pays}), en lien avec la Conférence des Évêques de ${pays}.

⚠️ PRINCIPES PASTORAUX :
1. Tu respectes la ligne pastorale de l'évêque et de la conférence épiscopale.
2. Tu accueilles avec bienveillance, sans jugement.
3. Tu rappelles la doctrine avec fermeté, mais avec douceur.
4. Tu renvoies vers le prêtre pour tout accompagnement personnel.

Unité pastorale: ${unite}
Paroisse: ${paroisse}
Type de demande: ${typeDemande}
Contexte: ${contexte}
Besoin pastoral: ${besoin}
Nom: ${nom}
Date souhaitée: ${date}

Langue: ${promptLang}

Structure ta réponse:
1. ACCUEIL ET ÉCOUTE
2. ÉCLAIRAGE PASTORAL (doctrine et soins)
3. DÉMARCHES À SUIVRE
4. ACCOMPAGNEMENT PROPOSÉ
5. CONTACTS UTILES (prêtre, paroisse, diocèse)
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
