/**
 * seed-doctors.js
 * Run with:  node src/utils/seed-doctors.js
 * Adds more real-context Gambian doctors to an already-seeded database.
 */

const { db, initializeDatabase } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

initializeDatabase();

async function addDoctors() {
  const doctorHash = await bcrypt.hash('doctor123', 12);

  // Fetch existing specialties
  const specRows = db.prepare('SELECT id, name FROM specialties').all();
  const specs = Object.fromEntries(specRows.map(s => [s.name, s.id]));

  // Fetch existing facilities
  const facRows = db.prepare('SELECT id, name, address, city FROM facilities').all();
  const facs = Object.fromEntries(facRows.map(f => [f.name, f]));

  const newDoctors = [
    // ─── Edward Francis Small Teaching Hospital ───
    {
      name: 'Dr. Ousman Bojang',
      email: 'ousman.bojang@efsth.gm',
      specialty: 'Neurology',
      facility: 'Edward Francis Small Teaching Hospital',
      city: 'Banjul',
      fee: 700,
      exp: 18,
      qual: 'MD, FRCP – University College London',
      bio: 'Consultant neurologist specialising in epilepsy, stroke rehabilitation, and neuro-infections common in West Africa. Fluent in Wolof, Mandinka, and English.',
      rating: 4.8, reviews: 54,
      availability: [1,2,3,4,5],
      start_time: '08:00', end_time: '14:00',
    },
    {
      name: 'Dr. Amie Njie-Touray',
      email: 'amie.njie@efsth.gm',
      specialty: 'Oncology',
      facility: 'Edward Francis Small Teaching Hospital',
      city: 'Banjul',
      fee: 800,
      exp: 14,
      qual: 'MD, FWACS – Cheikh Anta Diop University, Dakar',
      bio: 'Oncologist with a focus on cervical and breast cancer early detection. Champion of affordable cancer screening programmes across The Gambia.',
      rating: 4.9, reviews: 41,
      availability: [1,3,5],
      start_time: '09:00', end_time: '15:00',
    },
    {
      name: 'Dr. Landing Manneh',
      email: 'landing.manneh@efsth.gm',
      specialty: 'Orthopedics',
      facility: 'Edward Francis Small Teaching Hospital',
      city: 'Banjul',
      fee: 650,
      exp: 10,
      qual: 'MD – University of The Gambia; Fellowship – Ghana College of Surgeons',
      bio: 'Orthopedic surgeon specialising in fracture care, sports injuries, and joint replacement. Active in road-traffic-accident trauma response.',
      rating: 4.6, reviews: 88,
      availability: [1,2,3,4,5],
      start_time: '07:30', end_time: '13:30',
    },
    {
      name: 'Dr. Fatou Camara',
      email: 'fatou.camara@efsth.gm',
      specialty: 'Psychiatry',
      facility: 'Edward Francis Small Teaching Hospital',
      city: 'Banjul',
      fee: 500,
      exp: 9,
      qual: 'MD, MRCPsych – Royal College of Psychiatrists, UK',
      bio: 'Consultant psychiatrist addressing depression, anxiety, PTSD, and substance-use disorders. Provides culturally sensitive care integrating community support systems.',
      rating: 4.7, reviews: 36,
      availability: [2,4],
      start_time: '10:00', end_time: '16:00',
    },

    // ─── MediBook Clinic Kololi ───
    {
      name: 'Dr. Saikou Bah',
      email: 'saikou.bah@medibook.gm',
      specialty: 'Dermatology',
      facility: 'MediBook Clinic Kololi',
      city: 'Kololi',
      fee: 450,
      exp: 7,
      qual: 'MD, Diploma in Dermatology – University of Ghana',
      bio: 'Dermatologist with expertise in tropical skin infections, vitiligo, eczema, and cosmetic dermatology. Serves both local communities and international visitors in the Senegambia area.',
      rating: 4.7, reviews: 112,
      availability: [1,2,3,4,5],
      start_time: '09:00', end_time: '17:00',
    },
    {
      name: 'Dr. Haddy Cham',
      email: 'haddy.cham@medibook.gm',
      specialty: 'Endocrinology',
      facility: 'MediBook Clinic Kololi',
      city: 'Kololi',
      fee: 550,
      exp: 11,
      qual: 'MD, FACE – University of Ibadan, Nigeria',
      bio: 'Endocrinologist managing diabetes, thyroid disorders, and obesity. Runs a diabetes education clinic and advocates for lifestyle medicine in West Africa.',
      rating: 4.9, reviews: 73,
      availability: [1,2,4,5],
      start_time: '08:30', end_time: '16:30',
    },
    {
      name: 'Dr. Ebrima Darboe',
      email: 'ebrima.darboe@medibook.gm',
      specialty: 'Gastroenterology',
      facility: 'MediBook Clinic Kololi',
      city: 'Kololi',
      fee: 500,
      exp: 13,
      qual: 'MD, FACG – University of Yaoundé, Cameroon',
      bio: 'Gastroenterologist specialising in peptic ulcer disease, H. pylori, hepatitis B & C, and gastrointestinal endoscopy. Fluent in Wolof, Fula, and French.',
      rating: 4.8, reviews: 60,
      availability: [1,3,5],
      start_time: '09:00', end_time: '14:00',
    },

    // ─── Brikama District Hospital ───
    {
      name: 'Dr. Bintou Jobe',
      email: 'bintou.jobe@brikama.gm',
      specialty: 'Gynecology',
      facility: 'Brikama District Hospital',
      city: 'Brikama',
      fee: 400,
      exp: 16,
      qual: 'MD, FWACS – University of Sierra Leone',
      bio: 'Obstetrician and gynaecologist with extensive experience in safe motherhood, ante-natal care, obstetric fistula repair, and reproductive health advocacy in rural Gambia.',
      rating: 4.9, reviews: 175,
      availability: [1,2,3,4,5],
      start_time: '08:00', end_time: '16:00',
    },
    {
      name: 'Dr. Modou Lamin Gaye',
      email: 'modou.gaye@brikama.gm',
      specialty: 'General Practice',
      facility: 'Brikama District Hospital',
      city: 'Brikama',
      fee: 200,
      exp: 6,
      qual: 'MBBS – University of The Gambia School of Medicine & Allied Health Sciences',
      bio: 'Primary care physician serving the West Coast Region with a focus on malaria, hypertension, childhood illnesses, and preventive health. Active community outreach participant.',
      rating: 4.6, reviews: 218,
      availability: [1,2,3,4,5],
      start_time: '08:00', end_time: '17:00',
    },
    {
      name: 'Dr. Lamin Saidy',
      email: 'lamin.saidy@brikama.gm',
      specialty: 'Ophthalmology',
      facility: 'Brikama District Hospital',
      city: 'Brikama',
      fee: 350,
      exp: 9,
      qual: 'MD, FWACS (Ophthalmology) – University of Benin, Nigeria',
      bio: 'Eye specialist addressing cataracts, trachoma, glaucoma, and refractive errors. Participates in the national trachoma elimination programme.',
      rating: 4.7, reviews: 95,
      availability: [2,4],
      start_time: '09:00', end_time: '15:00',
    },

    // ─── Faji Kunda Health Centre ───
    {
      name: 'Dr. Mariama Diallo',
      email: 'mariama.diallo@fajikunda.gm',
      specialty: 'Pediatrics',
      facility: 'Faji Kunda Health Centre',
      city: 'Serekunda',
      fee: 150,
      exp: 5,
      qual: 'MBBS – UTG; DCH – West African College of Physicians',
      bio: 'Community paediatrician providing immunisation, growth monitoring, malnutrition management, and childhood respiratory illness treatment in Serekunda.',
      rating: 4.8, reviews: 310,
      availability: [1,2,3,4,5],
      start_time: '08:00', end_time: '16:00',
    },
    {
      name: 'Dr. Omar Baldeh',
      email: 'omar.baldeh@fajikunda.gm',
      specialty: 'General Practice',
      facility: 'Faji Kunda Health Centre',
      city: 'Serekunda',
      fee: 100,
      exp: 4,
      qual: 'MBBS – University of The Gambia',
      bio: 'General practitioner committed to accessible primary healthcare for underserved communities. Special interest in HIV/AIDS management, TB DOTS, and maternal nutrition.',
      rating: 4.5, reviews: 189,
      availability: [1,2,3,4,5],
      start_time: '08:00', end_time: '17:00',
    },
  ];

  const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)');
  const insertDoctor = db.prepare(`
    INSERT OR IGNORE INTO doctors
      (id, user_id, specialty_id, facility_id, qualification, experience_years, clinic_name, clinic_address, clinic_city, consultation_fee, bio, is_verified, rating, total_reviews)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  const insertStaff = db.prepare(`INSERT OR IGNORE INTO facility_staff (id, facility_id, user_id, staff_role) VALUES (?, ?, ?, 'doctor')`);
  const insertAvail = db.prepare('INSERT OR IGNORE INTO availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes) VALUES (?, ?, ?, ?, ?, 30)');

  let added = 0;
  for (const d of newDoctors) {
    const facility = facs[d.facility];
    const specialtyId = specs[d.specialty];

    if (!facility) { console.warn(`⚠️  Facility not found: ${d.facility}`); continue; }
    if (!specialtyId) { console.warn(`⚠️  Specialty not found: ${d.specialty}`); continue; }

    // Skip if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(d.email);
    if (existing) { console.log(`  ↩  Skipping ${d.email} (already exists)`); continue; }

    const userId = uuidv4();
    const doctorId = uuidv4();

    db.transaction(() => {
      insertUser.run(userId, d.email, doctorHash, 'doctor', d.name);
      insertDoctor.run(
        doctorId, userId, specialtyId, facility.id,
        d.qual, d.exp, d.facility, facility.address, d.city,
        d.fee, d.bio, d.rating, d.reviews
      );
      insertStaff.run(uuidv4(), facility.id, userId);
      for (const day of d.availability) {
        insertAvail.run(uuidv4(), doctorId, day, d.start_time, d.end_time);
      }
    })();

    console.log(`  ✅  Added: ${d.name} (${d.specialty} @ ${d.facility})`);
    added++;
  }

  console.log(`\n🎉 Done — ${added} new doctors added. All passwords: doctor123`);
}

addDoctors().catch(console.error);
