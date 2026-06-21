const { db } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seedDatabase() {
  const existing = db.prepare('SELECT COUNT(*) as n FROM users').get();
  if (existing.n > 0) {
    console.log('📌 Database already seeded, skipping...');
    return;
  }

  console.log('🌱 Seeding database for The Gambia context...');

  // ─── Specialties ────────────────────────────────────────────────────────
  const specialties = [
    { id: uuidv4(), name: 'Cardiology',        description: 'Heart and cardiovascular system',    icon: '❤️' },
    { id: uuidv4(), name: 'Dermatology',       description: 'Skin, hair, and nails',              icon: '🩺' },
    { id: uuidv4(), name: 'General Practice',  description: 'Primary care and general health',    icon: '🏥' },
    { id: uuidv4(), name: 'Neurology',         description: 'Brain and nervous system',           icon: '🧠' },
    { id: uuidv4(), name: 'Orthopedics',       description: 'Bones, joints, and muscles',         icon: '🦴' },
    { id: uuidv4(), name: 'Pediatrics',        description: "Children's health",                  icon: '👶' },
    { id: uuidv4(), name: 'Psychiatry',        description: 'Mental health and disorders',        icon: '🧘' },
    { id: uuidv4(), name: 'Ophthalmology',     description: 'Eyes and vision',                    icon: '👁️' },
    { id: uuidv4(), name: 'Gynecology',        description: "Women's reproductive health",        icon: '🌸' },
    { id: uuidv4(), name: 'Oncology',          description: 'Cancer diagnosis and treatment',     icon: '🔬' },
    { id: uuidv4(), name: 'Endocrinology',     description: 'Hormones and metabolism',            icon: '⚗️' },
    { id: uuidv4(), name: 'Gastroenterology', description: 'Digestive system',                   icon: '🫁' },
  ];
  const specs = Object.fromEntries(specialties.map(s => [s.name, s.id]));

  const insertSpecialty = db.prepare('INSERT INTO specialties (id, name, description, icon) VALUES (?, ?, ?, ?)');
  for (const s of specialties) insertSpecialty.run(s.id, s.name, s.description, s.icon);

  // ─── Facilities ──────────────────────────────────────────────────────────
  const facilitiesData = [
    {
      id: uuidv4(), name: 'Edward Francis Small Teaching Hospital', type: 'hospital',
      address: 'Independence Drive', city: 'Banjul', region: 'Greater Banjul Area',
      phone: '+220-422-8224', email: 'efsth@health.gov.gm', license_number: 'MDCG-HOSP-001',
      description: 'The primary teaching hospital in The Gambia, offering tertiary healthcare services including neurology, oncology, surgery, and maternal care.',
    },
    {
      id: uuidv4(), name: 'Brikama District Hospital', type: 'hospital',
      address: 'Brikama Highway', city: 'Brikama', region: 'West Coast Region',
      phone: '+220-564-9002', email: 'brikama.hosp@health.gov.gm', license_number: 'MDCG-HOSP-002',
      description: 'Serving Brikama and the wider West Coast Region with general medicine, paediatrics, obstetrics, and surgical services.',
    },
    {
      id: uuidv4(), name: 'MediBook Clinic Kololi', type: 'clinic',
      address: 'Senegambia Strip', city: 'Kololi', region: 'Kanifing Municipality',
      phone: '+220-777-1234', email: 'kololi@medibook.gm', license_number: 'MDCG-CLIN-089',
      description: 'Modern private clinic offering premium primary care, specialist consultations, diagnostic imaging, and dental services in Kololi.',
    },
    {
      id: uuidv4(), name: 'Faji Kunda Health Centre', type: 'health_centre',
      address: 'Faji Kunda Road', city: 'Serekunda', region: 'Kanifing Municipality',
      phone: '+220-999-5555', email: 'fajikunda@health.gov.gm', license_number: 'MDCG-HC-044',
      description: 'Community health centre serving Serekunda and surrounding areas with affordable primary healthcare, maternal health, and immunisation services.',
    },
  ];
  const facs = Object.fromEntries(facilitiesData.map(f => [f.name, f]));

  const insertFacility = db.prepare(`
    INSERT INTO facilities (id, name, type, address, city, region, phone, email, license_number, description, is_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  for (const f of facilitiesData) {
    insertFacility.run(f.id, f.name, f.type, f.address, f.city, f.region, f.phone, f.email, f.license_number, f.description);
  }

  // ─── Admin ───────────────────────────────────────────────────────────────
  const adminId = uuidv4();
  const adminHash = await bcrypt.hash('admin123', 12);
  db.prepare('INSERT INTO users (id, email, password_hash, role, name, phone) VALUES (?, ?, ?, ?, ?, ?)')
    .run(adminId, 'admin@medibook.gm', adminHash, 'admin', 'Admin User', '+220-700-0001');

  // ─── Receptionist ────────────────────────────────────────────────────────
  const receptionistId = uuidv4();
  const recepHash = await bcrypt.hash('recep123', 12);
  const kololiClinic = facs['MediBook Clinic Kololi'];
  db.prepare('INSERT INTO users (id, email, password_hash, role, name, phone) VALUES (?, ?, ?, ?, ?, ?)')
    .run(receptionistId, 'recep@medibook.gm', recepHash, 'receptionist', 'Fatoumata Barrow', '+220-711-2233');
  db.prepare(`INSERT INTO facility_staff (id, facility_id, user_id, staff_role) VALUES (?, ?, ?, 'receptionist')`)
    .run(uuidv4(), kololiClinic.id, receptionistId);

  // ─── Doctors ─────────────────────────────────────────────────────────────
  const allDoctors = [
    // ── Edward Francis Small Teaching Hospital ──
    {
      name: 'Dr. Ousman Bojang', email: 'ousman.bojang@efsth.gm',
      specialty: 'Neurology', facility: 'Edward Francis Small Teaching Hospital', city: 'Banjul',
      fee: 700, exp: 18, qual: 'MD, FRCP – University College London',
      bio: 'Consultant neurologist specialising in epilepsy, stroke rehabilitation, and neuro-infections common in West Africa. Fluent in Wolof, Mandinka, and English.',
      rating: 4.8, reviews: 54, days: [1,2,3,4,5], start: '08:00', end: '14:00',
    },
    {
      name: 'Dr. Mariama Jallow', email: 'mariama.jallow@efsth.gm',
      specialty: 'Gynecology', facility: 'Edward Francis Small Teaching Hospital', city: 'Banjul',
      fee: 500, exp: 15, qual: 'MD, FWACS – West African College of Surgeons',
      bio: 'Senior gynaecologist with deep expertise in maternal care, high-risk obstetrics, and women\'s reproductive wellness. Head of the EFSTH Obstetrics unit.',
      rating: 4.9, reviews: 89, days: [1,2,3,4,5], start: '09:00', end: '17:00',
    },
    {
      name: 'Dr. Amie Njie-Touray', email: 'amie.njie@efsth.gm',
      specialty: 'Oncology', facility: 'Edward Francis Small Teaching Hospital', city: 'Banjul',
      fee: 800, exp: 14, qual: 'MD, FWACS – Cheikh Anta Diop University, Dakar',
      bio: 'Oncologist with a focus on cervical and breast cancer early detection. Champion of affordable cancer screening programmes across The Gambia.',
      rating: 4.9, reviews: 41, days: [1,3,5], start: '09:00', end: '15:00',
    },
    {
      name: 'Dr. Landing Manneh', email: 'landing.manneh@efsth.gm',
      specialty: 'Orthopedics', facility: 'Edward Francis Small Teaching Hospital', city: 'Banjul',
      fee: 650, exp: 10, qual: 'MD – University of The Gambia; Fellowship – Ghana College of Surgeons',
      bio: 'Orthopedic surgeon specialising in fracture care, sports injuries, and joint replacement. Active in road-traffic-accident trauma response.',
      rating: 4.6, reviews: 88, days: [1,2,3,4,5], start: '07:30', end: '13:30',
    },
    {
      name: 'Dr. Fatou Camara', email: 'fatou.camara@efsth.gm',
      specialty: 'Psychiatry', facility: 'Edward Francis Small Teaching Hospital', city: 'Banjul',
      fee: 500, exp: 9, qual: 'MD, MRCPsych – Royal College of Psychiatrists, UK',
      bio: 'Consultant psychiatrist addressing depression, anxiety, PTSD, and substance-use disorders. Provides culturally sensitive care integrating community support systems.',
      rating: 4.7, reviews: 36, days: [2,4], start: '10:00', end: '16:00',
    },

    // ── MediBook Clinic Kololi ──
    {
      name: 'Dr. Lamin Ceesay', email: 'lamin.ceesay@medibook.gm',
      specialty: 'General Practice', facility: 'MediBook Clinic Kololi', city: 'Kololi',
      fee: 350, exp: 12, qual: 'MD – University of The Gambia School of Medicine',
      bio: 'Experienced GP specialising in tropical medicine, primary family care, and community health. Runs a chronic-disease management clinic for hypertension and diabetes.',
      rating: 4.8, reviews: 124, days: [1,2,3,4,5], start: '09:00', end: '17:00',
    },
    {
      name: 'Dr. Isatou Touray', email: 'isatou.touray@medibook.gm',
      specialty: 'Cardiology', facility: 'MediBook Clinic Kololi', city: 'Kololi',
      fee: 600, exp: 11, qual: 'MD, FACC – University of Ghana Medical School',
      bio: 'Consultant cardiologist offering heart checks, ECG diagnostics, echocardiography, and hypertension management. Trained at Accra and London teaching hospitals.',
      rating: 4.9, reviews: 67, days: [1,2,4,5], start: '08:30', end: '16:30',
    },
    {
      name: 'Dr. Saikou Bah', email: 'saikou.bah@medibook.gm',
      specialty: 'Dermatology', facility: 'MediBook Clinic Kololi', city: 'Kololi',
      fee: 450, exp: 7, qual: 'MD, Diploma in Dermatology – University of Ghana',
      bio: 'Dermatologist with expertise in tropical skin infections, vitiligo, eczema, keloids, and cosmetic dermatology. Serves both local communities and international visitors.',
      rating: 4.7, reviews: 112, days: [1,2,3,4,5], start: '09:00', end: '17:00',
    },
    {
      name: 'Dr. Haddy Cham', email: 'haddy.cham@medibook.gm',
      specialty: 'Endocrinology', facility: 'MediBook Clinic Kololi', city: 'Kololi',
      fee: 550, exp: 11, qual: 'MD, FACE – University of Ibadan, Nigeria',
      bio: 'Endocrinologist managing diabetes, thyroid disorders, and obesity. Runs a diabetes education clinic and advocates for lifestyle medicine in West Africa.',
      rating: 4.9, reviews: 73, days: [1,2,4,5], start: '08:30', end: '16:30',
    },
    {
      name: 'Dr. Ebrima Darboe', email: 'ebrima.darboe@medibook.gm',
      specialty: 'Gastroenterology', facility: 'MediBook Clinic Kololi', city: 'Kololi',
      fee: 500, exp: 13, qual: 'MD, FACG – University of Yaoundé, Cameroon',
      bio: 'Gastroenterologist specialising in peptic ulcer disease, H. pylori, hepatitis B & C, and endoscopy. Fluent in Wolof, Fula, and French.',
      rating: 4.8, reviews: 60, days: [1,3,5], start: '09:00', end: '14:00',
    },

    // ── Brikama District Hospital ──
    {
      name: 'Dr. Ebrima Sanyang', email: 'ebrima.sanyang@brikama.gm',
      specialty: 'Pediatrics', facility: 'Brikama District Hospital', city: 'Brikama',
      fee: 250, exp: 8, qual: 'MD – West Africa Postgraduate Medical College',
      bio: 'Child health specialist dedicated to comprehensive paediatric services from immunisation to emergency care. Runs a weekly child nutrition clinic.',
      rating: 4.7, reviews: 203, days: [1,2,3,4,5], start: '08:00', end: '16:00',
    },
    {
      name: 'Dr. Bintou Jobe', email: 'bintou.jobe@brikama.gm',
      specialty: 'Gynecology', facility: 'Brikama District Hospital', city: 'Brikama',
      fee: 400, exp: 16, qual: 'MD, FWACS – University of Sierra Leone',
      bio: 'Obstetrician and gynaecologist with extensive experience in safe motherhood, ante-natal care, obstetric fistula repair, and reproductive health advocacy in rural Gambia.',
      rating: 4.9, reviews: 175, days: [1,2,3,4,5], start: '08:00', end: '16:00',
    },
    {
      name: 'Dr. Modou Lamin Gaye', email: 'modou.gaye@brikama.gm',
      specialty: 'General Practice', facility: 'Brikama District Hospital', city: 'Brikama',
      fee: 200, exp: 6, qual: 'MBBS – University of The Gambia School of Medicine & Allied Health Sciences',
      bio: 'Primary care physician serving the West Coast Region with a focus on malaria, hypertension, childhood illnesses, and preventive health.',
      rating: 4.6, reviews: 218, days: [1,2,3,4,5], start: '08:00', end: '17:00',
    },
    {
      name: 'Dr. Lamin Saidy', email: 'lamin.saidy@brikama.gm',
      specialty: 'Ophthalmology', facility: 'Brikama District Hospital', city: 'Brikama',
      fee: 350, exp: 9, qual: 'MD, FWACS (Ophthalmology) – University of Benin, Nigeria',
      bio: 'Eye specialist addressing cataracts, trachoma, glaucoma, and refractive errors. Participates in the national trachoma elimination programme.',
      rating: 4.7, reviews: 95, days: [2,4], start: '09:00', end: '15:00',
    },

    // ── Faji Kunda Health Centre ──
    {
      name: 'Dr. Mariama Diallo', email: 'mariama.diallo@fajikunda.gm',
      specialty: 'Pediatrics', facility: 'Faji Kunda Health Centre', city: 'Serekunda',
      fee: 150, exp: 5, qual: 'MBBS – UTG; DCH – West African College of Physicians',
      bio: 'Community paediatrician providing immunisation, growth monitoring, malnutrition management, and childhood respiratory illness treatment in Serekunda.',
      rating: 4.8, reviews: 310, days: [1,2,3,4,5], start: '08:00', end: '16:00',
    },
    {
      name: 'Dr. Omar Baldeh', email: 'omar.baldeh@fajikunda.gm',
      specialty: 'General Practice', facility: 'Faji Kunda Health Centre', city: 'Serekunda',
      fee: 100, exp: 4, qual: 'MBBS – University of The Gambia',
      bio: 'General practitioner committed to accessible primary healthcare. Special interest in HIV/AIDS management, TB DOTS, and maternal nutrition counselling.',
      rating: 4.5, reviews: 189, days: [1,2,3,4,5], start: '08:00', end: '17:00',
    },
  ];

  const doctorHash = await bcrypt.hash('doctor123', 12);
  const insertUser    = db.prepare('INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)');
  const insertDoctor  = db.prepare(`
    INSERT INTO doctors
      (id, user_id, specialty_id, facility_id, qualification, experience_years, clinic_name, clinic_address, clinic_city, consultation_fee, bio, is_verified, rating, total_reviews)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  const insertStaff   = db.prepare(`INSERT INTO facility_staff (id, facility_id, user_id, staff_role) VALUES (?, ?, ?, 'doctor')`);
  const insertAvail   = db.prepare('INSERT INTO availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes) VALUES (?, ?, ?, ?, ?, 30)');

  for (const d of allDoctors) {
    const userId   = uuidv4();
    const doctorId = uuidv4();
    const facility = facs[d.facility];
    const specId   = specs[d.specialty];

    insertUser.run(userId, d.email, doctorHash, 'doctor', d.name);
    insertDoctor.run(doctorId, userId, specId, facility.id, d.qual, d.exp, d.facility, facility.address, d.city, d.fee, d.bio, d.rating, d.reviews);
    insertStaff.run(uuidv4(), facility.id, userId);
    for (const day of d.days) insertAvail.run(uuidv4(), doctorId, day, d.start, d.end);
  }

  // ─── Patients ────────────────────────────────────────────────────────────
  const patientHash = await bcrypt.hash('patient123', 12);
  const patientData = [
    { name: 'Alieu Sow',       email: 'alieu@example.com', dob: '1990-05-15', gender: 'male',   blood: 'A+', id_type: 'national_id', national_id: '990515-M-01',  village: 'Sukuta', district: 'Kombo North', region: 'West Coast Region' },
    { name: 'Kadiatou Baldeh', email: 'kadi@example.com',  dob: '1985-08-22', gender: 'female', blood: 'O-', id_type: 'passport',    passport_number: 'G0123456', village: 'Bakau',  district: 'Kanifing',    region: 'Kanifing Municipality' },
  ];
  for (const p of patientData) {
    const userId    = uuidv4();
    const patientId = uuidv4();
    db.prepare('INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)').run(userId, p.email, patientHash, 'patient', p.name);
    db.prepare(`INSERT INTO patients (id, user_id, date_of_birth, gender, blood_group, id_type, national_id, passport_number, village, district, region) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(patientId, userId, p.dob, p.gender, p.blood, p.id_type, p.national_id || null, p.passport_number || null, p.village, p.district, p.region);
  }

  console.log('✅ Database seeded successfully for The Gambia!');
  console.log('');
  console.log('  👤 Admin:        admin@medibook.gm   / admin123');
  console.log('  🏢 Receptionist: recep@medibook.gm   / recep123  (MediBook Clinic Kololi)');
  console.log('  🏥 Doctors:      [name]@[facility].gm / doctor123');
  console.log('  🧑 Patient:      alieu@example.com   / patient123');
  console.log('                   kadi@example.com    / patient123');
}

module.exports = { seedDatabase };
