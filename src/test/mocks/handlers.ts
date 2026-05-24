/**
 * MSW handlers for Quran.com API v4 endpoints.
 * Used in Vitest tests via the MSW Node server.
 *
 * Requirements: 1.1, 2.1
 */

import { http, HttpResponse } from 'msw';
import surah1Fixture from '../fixtures/surah-1.json';
import surah1TranslationsFixture from '../fixtures/surah-1-translations.json';

// ---------------------------------------------------------------------------
// All 114 surahs metadata (compact list for test purposes)
// ---------------------------------------------------------------------------

const ALL_CHAPTERS = [
  { id: 1, name_arabic: 'الفاتحة', name_simple: 'Al-Fatihah', translated_name: { name: 'The Opening', language_name: 'english' }, verses_count: 7, revelation_place: 'makkah' },
  { id: 2, name_arabic: 'البقرة', name_simple: 'Al-Baqarah', translated_name: { name: 'The Cow', language_name: 'english' }, verses_count: 286, revelation_place: 'madinah' },
  { id: 3, name_arabic: 'آل عمران', name_simple: "Ali 'Imran", translated_name: { name: 'Family of Imran', language_name: 'english' }, verses_count: 200, revelation_place: 'madinah' },
  { id: 4, name_arabic: 'النساء', name_simple: 'An-Nisa', translated_name: { name: 'The Women', language_name: 'english' }, verses_count: 176, revelation_place: 'madinah' },
  { id: 5, name_arabic: 'المائدة', name_simple: "Al-Ma'idah", translated_name: { name: 'The Table Spread', language_name: 'english' }, verses_count: 120, revelation_place: 'madinah' },
  { id: 6, name_arabic: 'الأنعام', name_simple: "Al-An'am", translated_name: { name: 'The Cattle', language_name: 'english' }, verses_count: 165, revelation_place: 'makkah' },
  { id: 7, name_arabic: 'الأعراف', name_simple: "Al-A'raf", translated_name: { name: 'The Heights', language_name: 'english' }, verses_count: 206, revelation_place: 'makkah' },
  { id: 8, name_arabic: 'الأنفال', name_simple: 'Al-Anfal', translated_name: { name: 'The Spoils of War', language_name: 'english' }, verses_count: 75, revelation_place: 'madinah' },
  { id: 9, name_arabic: 'التوبة', name_simple: 'At-Tawbah', translated_name: { name: 'The Repentance', language_name: 'english' }, verses_count: 129, revelation_place: 'madinah' },
  { id: 10, name_arabic: 'يونس', name_simple: 'Yunus', translated_name: { name: 'Jonah', language_name: 'english' }, verses_count: 109, revelation_place: 'makkah' },
  { id: 11, name_arabic: 'هود', name_simple: 'Hud', translated_name: { name: 'Hud', language_name: 'english' }, verses_count: 123, revelation_place: 'makkah' },
  { id: 12, name_arabic: 'يوسف', name_simple: 'Yusuf', translated_name: { name: 'Joseph', language_name: 'english' }, verses_count: 111, revelation_place: 'makkah' },
  { id: 13, name_arabic: 'الرعد', name_simple: "Ar-Ra'd", translated_name: { name: 'The Thunder', language_name: 'english' }, verses_count: 43, revelation_place: 'madinah' },
  { id: 14, name_arabic: 'إبراهيم', name_simple: 'Ibrahim', translated_name: { name: 'Abraham', language_name: 'english' }, verses_count: 52, revelation_place: 'makkah' },
  { id: 15, name_arabic: 'الحجر', name_simple: 'Al-Hijr', translated_name: { name: 'The Rocky Tract', language_name: 'english' }, verses_count: 99, revelation_place: 'makkah' },
  { id: 16, name_arabic: 'النحل', name_simple: 'An-Nahl', translated_name: { name: 'The Bee', language_name: 'english' }, verses_count: 128, revelation_place: 'makkah' },
  { id: 17, name_arabic: 'الإسراء', name_simple: "Al-Isra", translated_name: { name: 'The Night Journey', language_name: 'english' }, verses_count: 111, revelation_place: 'makkah' },
  { id: 18, name_arabic: 'الكهف', name_simple: 'Al-Kahf', translated_name: { name: 'The Cave', language_name: 'english' }, verses_count: 110, revelation_place: 'makkah' },
  { id: 19, name_arabic: 'مريم', name_simple: 'Maryam', translated_name: { name: 'Mary', language_name: 'english' }, verses_count: 98, revelation_place: 'makkah' },
  { id: 20, name_arabic: 'طه', name_simple: 'Ta-Ha', translated_name: { name: 'Ta-Ha', language_name: 'english' }, verses_count: 135, revelation_place: 'makkah' },
  { id: 21, name_arabic: 'الأنبياء', name_simple: "Al-Anbya", translated_name: { name: 'The Prophets', language_name: 'english' }, verses_count: 112, revelation_place: 'makkah' },
  { id: 22, name_arabic: 'الحج', name_simple: 'Al-Hajj', translated_name: { name: 'The Pilgrimage', language_name: 'english' }, verses_count: 78, revelation_place: 'madinah' },
  { id: 23, name_arabic: 'المؤمنون', name_simple: "Al-Mu'minun", translated_name: { name: 'The Believers', language_name: 'english' }, verses_count: 118, revelation_place: 'makkah' },
  { id: 24, name_arabic: 'النور', name_simple: 'An-Nur', translated_name: { name: 'The Light', language_name: 'english' }, verses_count: 64, revelation_place: 'madinah' },
  { id: 25, name_arabic: 'الفرقان', name_simple: 'Al-Furqan', translated_name: { name: 'The Criterion', language_name: 'english' }, verses_count: 77, revelation_place: 'makkah' },
  { id: 26, name_arabic: 'الشعراء', name_simple: "Ash-Shu'ara", translated_name: { name: 'The Poets', language_name: 'english' }, verses_count: 227, revelation_place: 'makkah' },
  { id: 27, name_arabic: 'النمل', name_simple: 'An-Naml', translated_name: { name: 'The Ant', language_name: 'english' }, verses_count: 93, revelation_place: 'makkah' },
  { id: 28, name_arabic: 'القصص', name_simple: 'Al-Qasas', translated_name: { name: 'The Stories', language_name: 'english' }, verses_count: 88, revelation_place: 'makkah' },
  { id: 29, name_arabic: 'العنكبوت', name_simple: 'Al-Ankabut', translated_name: { name: 'The Spider', language_name: 'english' }, verses_count: 69, revelation_place: 'makkah' },
  { id: 30, name_arabic: 'الروم', name_simple: 'Ar-Rum', translated_name: { name: 'The Romans', language_name: 'english' }, verses_count: 60, revelation_place: 'makkah' },
  { id: 31, name_arabic: 'لقمان', name_simple: 'Luqman', translated_name: { name: 'Luqman', language_name: 'english' }, verses_count: 34, revelation_place: 'makkah' },
  { id: 32, name_arabic: 'السجدة', name_simple: 'As-Sajdah', translated_name: { name: 'The Prostration', language_name: 'english' }, verses_count: 30, revelation_place: 'makkah' },
  { id: 33, name_arabic: 'الأحزاب', name_simple: 'Al-Ahzab', translated_name: { name: 'The Combined Forces', language_name: 'english' }, verses_count: 73, revelation_place: 'madinah' },
  { id: 34, name_arabic: 'سبأ', name_simple: "Saba", translated_name: { name: 'Sheba', language_name: 'english' }, verses_count: 54, revelation_place: 'makkah' },
  { id: 35, name_arabic: 'فاطر', name_simple: 'Fatir', translated_name: { name: 'Originator', language_name: 'english' }, verses_count: 45, revelation_place: 'makkah' },
  { id: 36, name_arabic: 'يس', name_simple: 'Ya-Sin', translated_name: { name: 'Ya Sin', language_name: 'english' }, verses_count: 83, revelation_place: 'makkah' },
  { id: 37, name_arabic: 'الصافات', name_simple: 'As-Saffat', translated_name: { name: 'Those who set the Ranks', language_name: 'english' }, verses_count: 182, revelation_place: 'makkah' },
  { id: 38, name_arabic: 'ص', name_simple: 'Sad', translated_name: { name: 'The Letter Sad', language_name: 'english' }, verses_count: 88, revelation_place: 'makkah' },
  { id: 39, name_arabic: 'الزمر', name_simple: 'Az-Zumar', translated_name: { name: 'The Troops', language_name: 'english' }, verses_count: 75, revelation_place: 'makkah' },
  { id: 40, name_arabic: 'غافر', name_simple: 'Ghafir', translated_name: { name: 'The Forgiver', language_name: 'english' }, verses_count: 85, revelation_place: 'makkah' },
  { id: 41, name_arabic: 'فصلت', name_simple: 'Fussilat', translated_name: { name: 'Explained in Detail', language_name: 'english' }, verses_count: 54, revelation_place: 'makkah' },
  { id: 42, name_arabic: 'الشورى', name_simple: 'Ash-Shuraa', translated_name: { name: 'The Consultation', language_name: 'english' }, verses_count: 53, revelation_place: 'makkah' },
  { id: 43, name_arabic: 'الزخرف', name_simple: 'Az-Zukhruf', translated_name: { name: 'The Ornaments of Gold', language_name: 'english' }, verses_count: 89, revelation_place: 'makkah' },
  { id: 44, name_arabic: 'الدخان', name_simple: 'Ad-Dukhan', translated_name: { name: 'The Smoke', language_name: 'english' }, verses_count: 59, revelation_place: 'makkah' },
  { id: 45, name_arabic: 'الجاثية', name_simple: 'Al-Jathiyah', translated_name: { name: 'The Crouching', language_name: 'english' }, verses_count: 37, revelation_place: 'makkah' },
  { id: 46, name_arabic: 'الأحقاف', name_simple: 'Al-Ahqaf', translated_name: { name: 'The Wind-Curved Sandhills', language_name: 'english' }, verses_count: 35, revelation_place: 'makkah' },
  { id: 47, name_arabic: 'محمد', name_simple: 'Muhammad', translated_name: { name: 'Muhammad', language_name: 'english' }, verses_count: 38, revelation_place: 'madinah' },
  { id: 48, name_arabic: 'الفتح', name_simple: 'Al-Fath', translated_name: { name: 'The Victory', language_name: 'english' }, verses_count: 29, revelation_place: 'madinah' },
  { id: 49, name_arabic: 'الحجرات', name_simple: 'Al-Hujurat', translated_name: { name: 'The Rooms', language_name: 'english' }, verses_count: 18, revelation_place: 'madinah' },
  { id: 50, name_arabic: 'ق', name_simple: 'Qaf', translated_name: { name: 'The Letter Qaf', language_name: 'english' }, verses_count: 45, revelation_place: 'makkah' },
  { id: 51, name_arabic: 'الذاريات', name_simple: 'Adh-Dhariyat', translated_name: { name: 'The Winnowing Winds', language_name: 'english' }, verses_count: 60, revelation_place: 'makkah' },
  { id: 52, name_arabic: 'الطور', name_simple: 'At-Tur', translated_name: { name: 'The Mount', language_name: 'english' }, verses_count: 49, revelation_place: 'makkah' },
  { id: 53, name_arabic: 'النجم', name_simple: 'An-Najm', translated_name: { name: 'The Star', language_name: 'english' }, verses_count: 62, revelation_place: 'makkah' },
  { id: 54, name_arabic: 'القمر', name_simple: 'Al-Qamar', translated_name: { name: 'The Moon', language_name: 'english' }, verses_count: 55, revelation_place: 'makkah' },
  { id: 55, name_arabic: 'الرحمن', name_simple: 'Ar-Rahman', translated_name: { name: 'The Beneficent', language_name: 'english' }, verses_count: 78, revelation_place: 'madinah' },
  { id: 56, name_arabic: 'الواقعة', name_simple: "Al-Waqi'ah", translated_name: { name: 'The Inevitable', language_name: 'english' }, verses_count: 96, revelation_place: 'makkah' },
  { id: 57, name_arabic: 'الحديد', name_simple: 'Al-Hadid', translated_name: { name: 'The Iron', language_name: 'english' }, verses_count: 29, revelation_place: 'madinah' },
  { id: 58, name_arabic: 'المجادلة', name_simple: 'Al-Mujadila', translated_name: { name: 'The Pleading Woman', language_name: 'english' }, verses_count: 22, revelation_place: 'madinah' },
  { id: 59, name_arabic: 'الحشر', name_simple: 'Al-Hashr', translated_name: { name: 'The Exile', language_name: 'english' }, verses_count: 24, revelation_place: 'madinah' },
  { id: 60, name_arabic: 'الممتحنة', name_simple: 'Al-Mumtahanah', translated_name: { name: 'She that is to be examined', language_name: 'english' }, verses_count: 13, revelation_place: 'madinah' },
  { id: 61, name_arabic: 'الصف', name_simple: 'As-Saf', translated_name: { name: 'The Ranks', language_name: 'english' }, verses_count: 14, revelation_place: 'madinah' },
  { id: 62, name_arabic: 'الجمعة', name_simple: "Al-Jumu'ah", translated_name: { name: 'The Congregation, Friday', language_name: 'english' }, verses_count: 11, revelation_place: 'madinah' },
  { id: 63, name_arabic: 'المنافقون', name_simple: 'Al-Munafiqun', translated_name: { name: 'The Hypocrites', language_name: 'english' }, verses_count: 11, revelation_place: 'madinah' },
  { id: 64, name_arabic: 'التغابن', name_simple: 'At-Taghabun', translated_name: { name: 'The Mutual Disillusion', language_name: 'english' }, verses_count: 18, revelation_place: 'madinah' },
  { id: 65, name_arabic: 'الطلاق', name_simple: 'At-Talaq', translated_name: { name: 'The Divorce', language_name: 'english' }, verses_count: 12, revelation_place: 'madinah' },
  { id: 66, name_arabic: 'التحريم', name_simple: 'At-Tahrim', translated_name: { name: 'The Prohibition', language_name: 'english' }, verses_count: 12, revelation_place: 'madinah' },
  { id: 67, name_arabic: 'الملك', name_simple: 'Al-Mulk', translated_name: { name: 'The Sovereignty', language_name: 'english' }, verses_count: 30, revelation_place: 'makkah' },
  { id: 68, name_arabic: 'القلم', name_simple: 'Al-Qalam', translated_name: { name: 'The Pen', language_name: 'english' }, verses_count: 52, revelation_place: 'makkah' },
  { id: 69, name_arabic: 'الحاقة', name_simple: 'Al-Haqqah', translated_name: { name: 'The Reality', language_name: 'english' }, verses_count: 52, revelation_place: 'makkah' },
  { id: 70, name_arabic: 'المعارج', name_simple: "Al-Ma'arij", translated_name: { name: 'The Ascending Stairways', language_name: 'english' }, verses_count: 44, revelation_place: 'makkah' },
  { id: 71, name_arabic: 'نوح', name_simple: 'Nuh', translated_name: { name: 'Noah', language_name: 'english' }, verses_count: 28, revelation_place: 'makkah' },
  { id: 72, name_arabic: 'الجن', name_simple: 'Al-Jinn', translated_name: { name: 'The Jinn', language_name: 'english' }, verses_count: 28, revelation_place: 'makkah' },
  { id: 73, name_arabic: 'المزمل', name_simple: 'Al-Muzzammil', translated_name: { name: 'The Enshrouded One', language_name: 'english' }, verses_count: 20, revelation_place: 'makkah' },
  { id: 74, name_arabic: 'المدثر', name_simple: 'Al-Muddaththir', translated_name: { name: 'The Cloaked One', language_name: 'english' }, verses_count: 56, revelation_place: 'makkah' },
  { id: 75, name_arabic: 'القيامة', name_simple: 'Al-Qiyamah', translated_name: { name: 'The Resurrection', language_name: 'english' }, verses_count: 40, revelation_place: 'makkah' },
  { id: 76, name_arabic: 'الإنسان', name_simple: 'Al-Insan', translated_name: { name: 'The Man', language_name: 'english' }, verses_count: 31, revelation_place: 'madinah' },
  { id: 77, name_arabic: 'المرسلات', name_simple: 'Al-Mursalat', translated_name: { name: 'The Emissaries', language_name: 'english' }, verses_count: 50, revelation_place: 'makkah' },
  { id: 78, name_arabic: 'النبأ', name_simple: "An-Naba", translated_name: { name: 'The Tidings', language_name: 'english' }, verses_count: 40, revelation_place: 'makkah' },
  { id: 79, name_arabic: 'النازعات', name_simple: "An-Nazi'at", translated_name: { name: 'Those who drag forth', language_name: 'english' }, verses_count: 46, revelation_place: 'makkah' },
  { id: 80, name_arabic: 'عبس', name_simple: 'Abasa', translated_name: { name: 'He Frowned', language_name: 'english' }, verses_count: 42, revelation_place: 'makkah' },
  { id: 81, name_arabic: 'التكوير', name_simple: 'At-Takwir', translated_name: { name: 'The Overthrowing', language_name: 'english' }, verses_count: 29, revelation_place: 'makkah' },
  { id: 82, name_arabic: 'الانفطار', name_simple: 'Al-Infitar', translated_name: { name: 'The Cleaving', language_name: 'english' }, verses_count: 19, revelation_place: 'makkah' },
  { id: 83, name_arabic: 'المطففين', name_simple: 'Al-Mutaffifin', translated_name: { name: 'The Defrauding', language_name: 'english' }, verses_count: 36, revelation_place: 'makkah' },
  { id: 84, name_arabic: 'الانشقاق', name_simple: 'Al-Inshiqaq', translated_name: { name: 'The Sundering', language_name: 'english' }, verses_count: 25, revelation_place: 'makkah' },
  { id: 85, name_arabic: 'البروج', name_simple: 'Al-Buruj', translated_name: { name: 'The Mansions of the Stars', language_name: 'english' }, verses_count: 22, revelation_place: 'makkah' },
  { id: 86, name_arabic: 'الطارق', name_simple: 'At-Tariq', translated_name: { name: 'The Nightcommer', language_name: 'english' }, verses_count: 17, revelation_place: 'makkah' },
  { id: 87, name_arabic: 'الأعلى', name_simple: "Al-A'la", translated_name: { name: 'The Most High', language_name: 'english' }, verses_count: 19, revelation_place: 'makkah' },
  { id: 88, name_arabic: 'الغاشية', name_simple: 'Al-Ghashiyah', translated_name: { name: 'The Overwhelming', language_name: 'english' }, verses_count: 26, revelation_place: 'makkah' },
  { id: 89, name_arabic: 'الفجر', name_simple: 'Al-Fajr', translated_name: { name: 'The Dawn', language_name: 'english' }, verses_count: 30, revelation_place: 'makkah' },
  { id: 90, name_arabic: 'البلد', name_simple: 'Al-Balad', translated_name: { name: 'The City', language_name: 'english' }, verses_count: 20, revelation_place: 'makkah' },
  { id: 91, name_arabic: 'الشمس', name_simple: 'Ash-Shams', translated_name: { name: 'The Sun', language_name: 'english' }, verses_count: 15, revelation_place: 'makkah' },
  { id: 92, name_arabic: 'الليل', name_simple: 'Al-Layl', translated_name: { name: 'The Night', language_name: 'english' }, verses_count: 21, revelation_place: 'makkah' },
  { id: 93, name_arabic: 'الضحى', name_simple: 'Ad-Duhaa', translated_name: { name: 'The Morning Hours', language_name: 'english' }, verses_count: 11, revelation_place: 'makkah' },
  { id: 94, name_arabic: 'الشرح', name_simple: 'Ash-Sharh', translated_name: { name: 'The Relief', language_name: 'english' }, verses_count: 8, revelation_place: 'makkah' },
  { id: 95, name_arabic: 'التين', name_simple: 'At-Tin', translated_name: { name: 'The Fig', language_name: 'english' }, verses_count: 8, revelation_place: 'makkah' },
  { id: 96, name_arabic: 'العلق', name_simple: "Al-'Alaq", translated_name: { name: 'The Clot', language_name: 'english' }, verses_count: 19, revelation_place: 'makkah' },
  { id: 97, name_arabic: 'القدر', name_simple: 'Al-Qadr', translated_name: { name: 'The Power', language_name: 'english' }, verses_count: 5, revelation_place: 'makkah' },
  { id: 98, name_arabic: 'البينة', name_simple: 'Al-Bayyinah', translated_name: { name: 'The Clear Proof', language_name: 'english' }, verses_count: 8, revelation_place: 'madinah' },
  { id: 99, name_arabic: 'الزلزلة', name_simple: 'Az-Zalzalah', translated_name: { name: 'The Earthquake', language_name: 'english' }, verses_count: 8, revelation_place: 'madinah' },
  { id: 100, name_arabic: 'العاديات', name_simple: "Al-'Adiyat", translated_name: { name: 'The Courser', language_name: 'english' }, verses_count: 11, revelation_place: 'makkah' },
  { id: 101, name_arabic: 'القارعة', name_simple: "Al-Qari'ah", translated_name: { name: 'The Calamity', language_name: 'english' }, verses_count: 11, revelation_place: 'makkah' },
  { id: 102, name_arabic: 'التكاثر', name_simple: 'At-Takathur', translated_name: { name: 'The Rivalry in World Increase', language_name: 'english' }, verses_count: 8, revelation_place: 'makkah' },
  { id: 103, name_arabic: 'العصر', name_simple: "Al-'Asr", translated_name: { name: 'The Declining Day', language_name: 'english' }, verses_count: 3, revelation_place: 'makkah' },
  { id: 104, name_arabic: 'الهمزة', name_simple: 'Al-Humazah', translated_name: { name: 'The Traducer', language_name: 'english' }, verses_count: 9, revelation_place: 'makkah' },
  { id: 105, name_arabic: 'الفيل', name_simple: 'Al-Fil', translated_name: { name: 'The Elephant', language_name: 'english' }, verses_count: 5, revelation_place: 'makkah' },
  { id: 106, name_arabic: 'قريش', name_simple: 'Quraysh', translated_name: { name: 'Quraysh', language_name: 'english' }, verses_count: 4, revelation_place: 'makkah' },
  { id: 107, name_arabic: 'الماعون', name_simple: "Al-Ma'un", translated_name: { name: 'The Small Kindnesses', language_name: 'english' }, verses_count: 7, revelation_place: 'makkah' },
  { id: 108, name_arabic: 'الكوثر', name_simple: 'Al-Kawthar', translated_name: { name: 'The Abundance', language_name: 'english' }, verses_count: 3, revelation_place: 'makkah' },
  { id: 109, name_arabic: 'الكافرون', name_simple: 'Al-Kafirun', translated_name: { name: 'The Disbelievers', language_name: 'english' }, verses_count: 6, revelation_place: 'makkah' },
  { id: 110, name_arabic: 'النصر', name_simple: 'An-Nasr', translated_name: { name: 'The Divine Support', language_name: 'english' }, verses_count: 3, revelation_place: 'madinah' },
  { id: 111, name_arabic: 'المسد', name_simple: 'Al-Masad', translated_name: { name: 'The Palm Fibre', language_name: 'english' }, verses_count: 5, revelation_place: 'makkah' },
  { id: 112, name_arabic: 'الإخلاص', name_simple: 'Al-Ikhlas', translated_name: { name: 'The Sincerity', language_name: 'english' }, verses_count: 4, revelation_place: 'makkah' },
  { id: 113, name_arabic: 'الفلق', name_simple: 'Al-Falaq', translated_name: { name: 'The Daybreak', language_name: 'english' }, verses_count: 5, revelation_place: 'makkah' },
  { id: 114, name_arabic: 'الناس', name_simple: 'An-Nas', translated_name: { name: 'The Mankind', language_name: 'english' }, verses_count: 6, revelation_place: 'makkah' },
];

// ---------------------------------------------------------------------------
// MSW request handlers
// ---------------------------------------------------------------------------

export const handlers = [
  // GET /chapters — return all 114 surahs metadata
  http.get('https://api.quran.com/api/v4/chapters', () => {
    return HttpResponse.json({ chapters: ALL_CHAPTERS });
  }),

  // GET /chapters/1 — return Al-Fatihah chapter metadata
  http.get('https://api.quran.com/api/v4/chapters/1', () => {
    return HttpResponse.json({ chapter: surah1Fixture.chapter });
  }),

  // GET /verses/by_chapter/1* — return Al-Fatihah verses with words
  http.get('https://api.quran.com/api/v4/verses/by_chapter/1', () => {
    return HttpResponse.json({
      verses: surah1Fixture.verses,
      pagination: surah1Fixture.pagination,
    });
  }),

  // GET /quran/translations/* — return surah-1 translations
  http.get('https://api.quran.com/api/v4/quran/translations/:id', () => {
    return HttpResponse.json(surah1TranslationsFixture);
  }),
];
