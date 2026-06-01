import { createClient } from '@supabase/supabase-js';
import { defaultDemoJobs } from './demo_jobs.js';

// Determine if we should use Supabase or SQLite
const useSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;

let nativeDb = null;

// Initialize native SQLite if Supabase is not configured
if (!useSupabase) {
  try {
    const { DatabaseSync } = await import('node:sqlite');
    // Save database file in the project root
    const dbPath = process.env.SQLITE_PATH || './jobs.db';
    nativeDb = new DatabaseSync(dbPath);
    
    // Create tables if they do not exist
    nativeDb.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT,
        company TEXT,
        location TEXT,
        url TEXT,
        description TEXT,
        site TEXT,
        score INTEGER,
        reasoning TEXT,
        cover_letter TEXT,
        status TEXT DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Seed default settings if empty
    const checkSettings = nativeDb.prepare('SELECT COUNT(*) as count FROM settings').get();
    if (checkSettings.count === 0) {
      const defaultCV = `# ALEXANDRA FILALI
Étudiante à l'ESCE International Business School
Email: alex.sf@outlook.fr | Phone: +33 7 78 86 43 76 | Location: 75008 Paris

## FORMATION
- ESCE Business School (Spécialisation : Marketing, La Défense, Paris) | 2021 - 2026
- Tampere University (Erasmus à Tampere, Finlande) | 2023
- Baccalauréat Economie (Lycée Alphonse Daudet, Tarascon) | 2020 - 2021

## EXPÉRIENCES PROFESSIONNELLES
- Alternance Associate Marketing Research @ Lilly France (Neuilly-sur-Seine, France) | 2024 - 2026
  * Analyse de données marketing (quanti/quali) & suivi de la performance
  * Veille concurrentielle
  * Synthèse et présentation des résultats
  * Rédaction de briefs et coordination avec les agences
- Meeting and Events Sales Trainee (6 mois) @ Hôtel Dolce La Hulpe by Wyndham (Bruxelles, Belgique) | 2023
  * Traiter les demandes d'évènements
  * S'assurer du bon déroulement des évènements
  * Aider à gérer et améliorer la part de marché
  * Assister le directeur commercial et marketing dans la réalisation de projets
- Stagiaire commerciale (2 mois) @ Château de la Gabelle (Saint Rémy de Provence, France) | 2022
  * Accueil et conseils auprès des clients
  * Vente en boutique
  * Préparation de commandes
  * Prospection B2B
- Stage d'observation (1 semaine) @ Groupama Méditerranée (Avignon, France) | 2017
  * Accueil clients, appels téléphoniques, participation aux réunions commerciales, visite de la clientèle, observation de contrat.

## COMPÉTENCES
- Marketing, Étude de marché, Analyse consommateurs, SWOT, PESTEL, Evénementiel, Pack office / Canva / IA

## LANGUES
- Anglais: TOEIC 900/990
- Espagnol
- Français

## ACTIVITÉS EXTRA-PROFESSIONNELLES
- Association Charity ESCE: Présidente (2022), Représentante de classe (2021 - 2022)
- Hôtesse d'accueil @ Grand prix de F1, Monaco | 2023 - 2024`;

      const defaultCriteria = JSON.stringify({
        keywords: ["Marketing Research", "Assistant Chef de Projet Marketing", "Chef de Produit", "Chargé d'études marketing", "Event Coordinator"],
        locations: ["Paris", "Remote"],
        sites: ["Welcome to the Jungle", "APEC", "JobTeaser", "LinkedIn", "HelloWork"]
      });

      const insertStmt = nativeDb.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
      insertStmt.run('cv_text', defaultCV);
      insertStmt.run('search_criteria', defaultCriteria);
      insertStmt.run('email_sender', 'alex.sf@outlook.fr');
    }
  } catch (err) {
    console.error('Failed to initialize local SQLite:', err);
  }
}

const supabase = useSupabase
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

// Database helper functions
export async function getSettings() {
  if (useSupabase) {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    // Map list of key/value rows to an object
    return data.reduce((acc, cur) => {
      acc[cur.key] = cur.value;
      return acc;
    }, {});
  } else {
    const stmt = nativeDb.prepare('SELECT * FROM settings');
    const rows = stmt.all();
    return rows.reduce((acc, cur) => {
      acc[cur.key] = cur.value;
      return acc;
    }, {});
  }
}

export async function saveSetting(key, value) {
  if (useSupabase) {
    const { error } = await supabase.from('settings').upsert({ key, value });
    if (error) throw error;
  } else {
    const stmt = nativeDb.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    stmt.run(key, value);
  }
}

export async function getJobs() {
  let jobs = [];
  if (useSupabase) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('score', { ascending: false });
    if (error) throw error;
    jobs = data || [];
  } else {
    const stmt = nativeDb.prepare('SELECT * FROM jobs ORDER BY score DESC, created_at DESC');
    jobs = stmt.all();
  }

  if (jobs.length === 0) {
    return defaultDemoJobs;
  }
  return jobs;
}

export async function getJob(id) {
  let job = null;
  if (useSupabase) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    job = data;
  } else {
    const stmt = nativeDb.prepare('SELECT * FROM jobs WHERE id = ?');
    job = stmt.get(id);
  }

  if (!job) {
    job = defaultDemoJobs.find(j => j.id === id) || null;
  }
  return job;
}

export async function saveJobs(jobsList) {
  if (useSupabase) {
    const { error } = await supabase.from('jobs').upsert(jobsList, { onConflict: 'id' });
    if (error) throw error;
  } else {
    const stmt = nativeDb.prepare(`
      INSERT OR REPLACE INTO jobs (id, title, company, location, url, description, site, score, reasoning, cover_letter, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT status FROM jobs WHERE id = ?), 'new'))
    `);
    for (const job of jobsList) {
      stmt.run(
        job.id,
        job.title,
        job.company,
        job.location || '',
        job.url,
        job.description || '',
        job.site,
        job.score || 0,
        job.reasoning || '',
        job.cover_letter || '',
        job.id
      );
    }
  }
}

export async function updateJobStatus(id, status) {
  if (useSupabase) {
    const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
    if (error) throw error;
  } else {
    const stmt = nativeDb.prepare('UPDATE jobs SET status = ? WHERE id = ?');
    stmt.run(status, id);
  }
}

export async function updateJobCoverLetter(id, cover_letter) {
  if (useSupabase) {
    const { error } = await supabase.from('jobs').update({ cover_letter }).eq('id', id);
    if (error) throw error;
  } else {
    const stmt = nativeDb.prepare('UPDATE jobs SET cover_letter = ? WHERE id = ?');
    stmt.run(cover_letter, id);
  }
}
