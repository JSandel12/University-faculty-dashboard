"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  Building2,
  Calendar,
  Compass,
  DoorOpen,
  FileText,
  Layers,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  Users,
  Wifi,
} from "lucide-react";
import type { Lang } from "@/lib/i18n";
import type { ScheduleItem } from "@/lib/types";

type RoomCategory = "auditorium" | "hall" | "lab" | "service";
type BuildingId = "main" | "new_wing" | "tech_hub";

interface FloorRoom {
  id: string;
  buildingId: BuildingId;
  floor: number;
  code: string;
  codeEn: string;
  name: string;
  nameEn: string;
  category: RoomCategory;
  capacity: string;
  capacityEn: string;
  equipment: string[];
  equipmentEn: string[];
  routeHint: string;
  routeHintEn: string;
  matchTokens: string[];
  /** SVG coordinates inside viewBox 0 0 720 360 */
  rect: { x: number; y: number; w: number; h: number };
  /** Waypoints from floor entrance (360, 180) to the room door */
  pathPoints: string;
}

interface BuildingMeta {
  id: BuildingId;
  code: string;
  name: string;
  nameEn: string;
  subtitle: string;
  subtitleEn: string;
  floors: number[];
  walkTime: string;
  walkTimeEn: string;
}

const BUILDINGS: BuildingMeta[] = [
  {
    id: "main",
    code: "A",
    name: "Главный корпус",
    nameEn: "Main Diplomatic Wing",
    subtitle: "Деканат (каб. 214), залы, читальный зал и классические аудитории",
    subtitleEn: "Dean's Office (Rm. 214), moot court, library & lecture halls",
    floors: [1, 2, 3],
    walkTime: "2 мин от КПП",
    walkTimeEn: "2 min from Main Gate",
  },
  {
    id: "new_wing",
    code: "B",
    name: "Новый корпус",
    nameEn: "New Auditorium Wing",
    subtitle: "Потоковые залы-амфитеатры (Зал № 4), форум-атриум и МФЦ",
    subtitleEn: "Streaming amphitheaters (Hall #4), forum atrium & service desk",
    floors: [1, 3],
    walkTime: "4 мин через галерею",
    walkTimeEn: "4 min via skybridge",
  },
  {
    id: "tech_hub",
    code: "C",
    name: "Корпус права и ИТ",
    nameEn: "Tech & Law Hub",
    subtitle: "Лаборатории анализа данных, семинарские и коворкинг",
    subtitleEn: "Data science labs, seminar rooms & student coworking",
    floors: [1, 3],
    walkTime: "5 мин через сквер",
    walkTimeEn: "5 min across courtyard",
  },
];

const ROOMS: FloorRoom[] = [
  // MAIN BUILDING — FLOOR 1
  {
    id: "main-moot-1",
    buildingId: "main",
    floor: 1,
    code: "Зал судеб. 1",
    codeEn: "Moot Court 1",
    name: "Зал учебных судебных заседаний № 1",
    nameEn: "Moot Court Hearing Hall #1",
    category: "hall",
    capacity: "90 мест",
    capacityEn: "90 seats",
    equipment: ["Трибуна", "Запись эфира", "Синхрон-кабины"],
    equipmentEn: ["Podium", "Broadcast Capture", "Interpretation Booths"],
    routeHint: "Главный холл → левое крыло → 2-я дверь",
    routeHintEn: "Main Lobby → West Wing → 2nd double doors",
    matchTokens: ["зал судеб", "moot"],
    rect: { x: 46, y: 34, w: 185, h: 108 },
    pathPoints: "360,326 360,180 138,180 138,142",
  },
  {
    id: "main-118",
    buildingId: "main",
    floor: 1,
    code: "Лингафон. 118",
    codeEn: "Lang Lab 118",
    name: "Лингафонный класс дипломатических языков",
    nameEn: "Diplomatic Language & Phonetics Lab",
    category: "lab",
    capacity: "24 рабочих места",
    capacityEn: "24 stations",
    equipment: ["Гарнитуры", "Аудиоконсоль", "Интерактивная доска"],
    equipmentEn: ["Audio Headsets", "Booth Console", "Smart Board"],
    routeHint: "Главный холл → левое крыло → конец коридора",
    routeHintEn: "Main Lobby → West Wing → end of corridor",
    matchTokens: ["лингафон", "118"],
    rect: { x: 248, y: 34, w: 185, h: 108 },
    pathPoints: "360,326 360,180 340,180 340,142",
  },
  {
    id: "main-101",
    buildingId: "main",
    floor: 1,
    code: "Ауд. 101",
    codeEn: "Rm. 101",
    name: "Аудитория истории права и государства",
    nameEn: "Seminar Room 101",
    category: "auditorium",
    capacity: "38 мест",
    capacityEn: "38 seats",
    equipment: ["Проектор", "Маркерная доска", "Wi-Fi 6"],
    equipmentEn: ["Projector", "Whiteboard", "Wi-Fi 6"],
    routeHint: "Главный холл → правое крыло → первая дверь",
    routeHintEn: "Main Lobby → East Wing → first door",
    matchTokens: ["101"],
    rect: { x: 450, y: 34, w: 224, h: 108 },
    pathPoints: "360,326 360,180 562,180 562,142",
  },
  {
    id: "main-cafe",
    buildingId: "main",
    floor: 1,
    code: "Кафе «Дипломат»",
    codeEn: "Diplomat Cafe",
    name: "Кафе и зона горячего питания",
    nameEn: "Campus Coffee & Dining Lounge",
    category: "service",
    capacity: "75 мест",
    capacityEn: "75 seats",
    equipment: ["Кофепоинт", "Безналичная оплата", "Розетки USB-C"],
    equipmentEn: ["Specialty Coffee", "NFC Pay", "USB-C Tables"],
    routeHint: "Главный холл → прямо и налево к зимнему саду",
    routeHintEn: "Main Lobby → straight left beside courtyard",
    matchTokens: ["кафе", "cafe"],
    rect: { x: 46, y: 218, w: 230, h: 108 },
    pathPoints: "360,326 360,180 160,180 160,218",
  },
  {
    id: "main-pass-desk",
    buildingId: "main",
    floor: 1,
    code: "Бюро пропусков",
    codeEn: "Pass & Security",
    name: "Пост охраны и NFC-турникеты (Кампус-пасс)",
    nameEn: "Campus-Pass Access & Security Desk",
    category: "service",
    capacity: "6 турникетов",
    capacityEn: "6 smart gates",
    equipment: ["QR-сканер", "Кампус-пасс", "Гостевые карты"],
    equipmentEn: ["QR Scanner", "Campus Pass", "Guest Badges"],
    routeHint: "Центральный вход с проспекта",
    routeHintEn: "Central entrance from main avenue",
    matchTokens: ["пропуск", "охрана", "security"],
    rect: { x: 444, y: 218, w: 230, h: 108 },
    pathPoints: "360,326 360,268 444,268",
  },

  // MAIN BUILDING — FLOOR 2
  {
    id: "main-214",
    buildingId: "main",
    floor: 2,
    code: "Каб. 214 · Деканат",
    codeEn: "Rm. 214 · Dean's",
    name: "Единый офис деканата и выдача бумажных справок",
    nameEn: "Dean's Office & Paper Certificate Pickup",
    category: "service",
    capacity: "4 окна приёма",
    capacityEn: "4 service windows",
    equipment: ["Электронная очередь", "Проверка QR/ЭЦП", "Приём заявлений"],
    equipmentEn: ["Digital Queue", "QR/EDS Desk", "Document Pickup"],
    routeHint: "Лифт на 2 этаж → правое крыло → стеклянный вход",
    routeHintEn: "Elevator to 2F → East Wing → glass reception",
    matchTokens: ["214", "деканат", "dean"],
    rect: { x: 450, y: 34, w: 224, h: 108 },
    pathPoints: "360,326 360,180 562,180 562,142",
  },
  {
    id: "main-215",
    buildingId: "main",
    floor: 2,
    code: "Ауд. 215",
    codeEn: "Rm. 215",
    name: "Малый лекционный зал (старая привязка пар)",
    nameEn: "Lecture Room 215 (Transferred Lectures)",
    category: "auditorium",
    capacity: "42 места",
    capacityEn: "42 seats",
    equipment: ["Проектор", "Микрофон", "Кондиционер"],
    equipmentEn: ["Projector", "Mic Array", "Climate Control"],
    routeHint: "Лифт на 2 этаж → центр коридора",
    routeHintEn: "Elevator to 2F → central corridor",
    matchTokens: ["215"],
    rect: { x: 248, y: 34, w: 185, h: 108 },
    pathPoints: "360,326 360,180 340,180 340,142",
  },
  {
    id: "main-204",
    buildingId: "main",
    floor: 2,
    code: "Ауд. 204",
    codeEn: "Rm. 204",
    name: "Аудитория мировой экономики",
    nameEn: "World Economy Seminar Room",
    category: "auditorium",
    capacity: "34 места",
    capacityEn: "34 seats",
    equipment: ["4K-дисплей", "Wi-Fi 6", "Розетки у каждого ряда"],
    equipmentEn: ["4K Display", "Wi-Fi 6", "Row Power Outlets"],
    routeHint: "Лифт на 2 этаж → левое крыло",
    routeHintEn: "Elevator to 2F → West Wing",
    matchTokens: ["204"],
    rect: { x: 46, y: 34, w: 185, h: 108 },
    pathPoints: "360,326 360,180 138,180 138,142",
  },
  {
    id: "main-conf-2",
    buildingId: "main",
    floor: 2,
    code: "Конф.-зал 2",
    codeEn: "Conf. Hall 2",
    name: "Дипломатический конференц-зал № 2",
    nameEn: "Diplomatic Conference Hall #2",
    category: "hall",
    capacity: "120 мест",
    capacityEn: "120 seats",
    equipment: ["Круглый стол", "Синхрон-перевод", "ВКС-система"],
    equipmentEn: ["Roundtable Mic", "Simultaneous Translation", "VC System"],
    routeHint: "Лифт на 2 этаж → повернуть налево за атриумом",
    routeHintEn: "Elevator to 2F → left past atrium",
    matchTokens: ["конф", "conf"],
    rect: { x: 46, y: 218, w: 230, h: 108 },
    pathPoints: "360,326 360,180 160,180 160,218",
  },
  {
    id: "main-coworking",
    buildingId: "main",
    floor: 2,
    code: "Коворкинг «Атриум»",
    codeEn: "Atrium Hub",
    name: "Тихая зона самоподготовки и командной работы",
    nameEn: "Quiet Study & Team Collaboration Zone",
    category: "service",
    capacity: "48 мест",
    capacityEn: "48 seats",
    equipment: ["Кабины для созвонов", "Быстрый Wi-Fi", "МФУ-печать"],
    equipmentEn: ["Call Booths", "Gigabit Wi-Fi", "Cloud Print"],
    routeHint: "Лифт на 2 этаж → правая галерея",
    routeHintEn: "Elevator to 2F → East Gallery",
    matchTokens: ["коворкинг", "атриум", "coworking"],
    rect: { x: 444, y: 218, w: 230, h: 108 },
    pathPoints: "360,326 360,180 560,180 560,218",
  },

  // MAIN BUILDING — FLOOR 3
  {
    id: "main-308",
    buildingId: "main",
    floor: 3,
    code: "Ауд. 308",
    codeEn: "Rm. 308",
    name: "Аудитория дипломатического протокола и этикета",
    nameEn: "Diplomatic Protocol Seminar Room",
    category: "auditorium",
    capacity: "32 места",
    capacityEn: "32 seats",
    equipment: ["Интерактивная панель", "Конференц-связь", "Wi-Fi 6"],
    equipmentEn: ["Smart Panel", "Teleconference", "Wi-Fi 6"],
    routeHint: "Лифт на 3 этаж → налево, вторая аудитория",
    routeHintEn: "Elevator to 3F → left, second door",
    matchTokens: ["308"],
    rect: { x: 46, y: 34, w: 295, h: 112 },
    pathPoints: "360,326 360,180 194,180 194,146",
  },
  {
    id: "main-library",
    buildingId: "main",
    floor: 3,
    code: "Читальный зал",
    codeEn: "Reading Hall",
    name: "Научная библиотека и электронный архив",
    nameEn: "Research Library & Digital Archive",
    category: "service",
    capacity: "140 мест",
    capacityEn: "140 seats",
    equipment: ["Терминалы баз данных", "Сканеры", "Тихие лампы"],
    equipmentEn: ["DB Terminals", "Book Scanners", "Task Lamps"],
    routeHint: "Лифт на 3 этаж → прямо в двусветный зал",
    routeHintEn: "Elevator to 3F → straight into Reading Hall",
    matchTokens: ["читал", "библио", "library"],
    rect: { x: 365, y: 34, w: 309, h: 112 },
    pathPoints: "360,326 360,180 520,180 520,146",
  },
  {
    id: "main-tutors",
    buildingId: "main",
    floor: 3,
    code: "Центр тьюторства",
    codeEn: "Tutoring & Wellness",
    name: "Кабинет кураторов и академической поддержки",
    nameEn: "Academic Advising & Student Support",
    category: "service",
    capacity: "4 кабинета",
    capacityEn: "4 rooms",
    equipment: ["Запись онлайн", "Индивидуальные планы", "Медпункт рядом"],
    equipmentEn: ["Online Booking", "Study Plans", "Health Clinic Adjacent"],
    routeHint: "Лифт на 3 этаж → правый коридор вниз по схеме",
    routeHintEn: "Elevator to 3F → south-east wing",
    matchTokens: ["тьютор", "медпункт", "куратор"],
    rect: { x: 444, y: 218, w: 230, h: 108 },
    pathPoints: "360,326 360,180 560,180 560,218",
  },

  // NEW WING — FLOOR 1
  {
    id: "new-hall-4",
    buildingId: "new_wing",
    floor: 1,
    code: "Зал № 4",
    codeEn: "Hall #4",
    name: "Большой потоковый зал-амфитеатр № 4 (новый корпус)",
    nameEn: "Grand Amphitheater Hall #4 (New Wing)",
    category: "hall",
    capacity: "260 мест",
    capacityEn: "260 seats",
    equipment: ["Два 4K-экрана", "Запись лекций", "Кабины синхрон-перевода"],
    equipmentEn: ["Dual 4K Screens", "Lecture Recording", "Translation Booths"],
    routeHint: "Переход из Главного корпуса → 1 этаж → прямо под стеклянный купол",
    routeHintEn: "Skybridge from Main Wing → 1F → straight under glass dome",
    matchTokens: ["зал № 4", "зал 4", "hall #4", "hall 4"],
    rect: { x: 46, y: 34, w: 380, h: 120 },
    pathPoints: "360,326 360,184 236,184 236,154",
  },
  {
    id: "new-mfc",
    buildingId: "new_wing",
    floor: 1,
    code: "Студенческий МФЦ",
    codeEn: "Student Hub",
    name: "Терминал быстрой печати и кампус-сервисов",
    nameEn: "Self-Service Print & Campus Helpdesk",
    category: "service",
    capacity: "3 терминала",
    capacityEn: "3 kiosks",
    equipment: ["Киоск справок", "Пополнение карты", "Зарядная станция"],
    equipmentEn: ["Doc Kiosks", "Pass Top-Up", "Fast Charging"],
    routeHint: "Фойе Нового корпуса справа от входа",
    routeHintEn: "New Wing lobby, east side",
    matchTokens: ["мфц", "kiosk", "сервис"],
    rect: { x: 450, y: 34, w: 224, h: 120 },
    pathPoints: "360,326 360,184 562,184 562,154",
  },
  {
    id: "new-atrium",
    buildingId: "new_wing",
    floor: 1,
    code: "Форум-атриум",
    codeEn: "Forum Atrium",
    name: "Выставочная площадка хакатонов и карьерных дней",
    nameEn: "Hackathon & Career Expo Plaza",
    category: "hall",
    capacity: "180 чел.",
    capacityEn: "180 guests",
    equipment: ["Медиастена", "Сцена", "Мобильные стенды"],
    equipmentEn: ["LED Media Wall", "Stage", "Modular Booths"],
    routeHint: "Центральный атриум Нового корпуса",
    routeHintEn: "Central Atrium of New Wing",
    matchTokens: ["атриум", "форум", "atrium"],
    rect: { x: 46, y: 218, w: 230, h: 108 },
    pathPoints: "360,326 360,184 160,184 160,218",
  },

  // NEW WING — UPPER FLOORS (3-5)
  {
    id: "new-3102",
    buildingId: "new_wing",
    floor: 3,
    code: "Ауд. 3102",
    codeEn: "Rm. 3102",
    name: "Большая аудитория международного права 3102",
    nameEn: "International Law Lecture Room 3102",
    category: "auditorium",
    capacity: "80 мест",
    capacityEn: "80 seats",
    equipment: ["Проектор", "Аудиосистема", "USB-C в партах"],
    equipmentEn: ["Projector", "PA Audio", "Desk USB-C"],
    routeHint: "Лифт Нового корпуса → 3 этаж → левое крыло",
    routeHintEn: "New Wing Lift → 3F → West Wing",
    matchTokens: ["3102"],
    rect: { x: 46, y: 34, w: 196, h: 112 },
    pathPoints: "360,326 360,180 144,180 144,146",
  },
  {
    id: "new-402",
    buildingId: "new_wing",
    floor: 3,
    code: "Ауд. 402",
    codeEn: "Rm. 402",
    name: "Проектная аудитория 402",
    nameEn: "Project Seminar Room 402",
    category: "auditorium",
    capacity: "40 мест",
    capacityEn: "40 seats",
    equipment: ["Флипчарты", "ТВ-панель", "Быстрый Wi-Fi"],
    equipmentEn: ["Flipcharts", "Smart TV", "Fast Wi-Fi"],
    routeHint: "Лифт Нового корпуса → 4 этаж → центр",
    routeHintEn: "New Wing Lift → 4F → center",
    matchTokens: ["402"],
    rect: { x: 262, y: 34, w: 196, h: 112 },
    pathPoints: "360,326 360,180 360,146",
  },
  {
    id: "new-520",
    buildingId: "new_wing",
    floor: 3,
    code: "Ауд. 520",
    codeEn: "Rm. 520",
    name: "Лекционная аудитория конституционного права 520",
    nameEn: "Constitutional Law Room 520",
    category: "auditorium",
    capacity: "48 мест",
    capacityEn: "48 seats",
    equipment: ["Проектор", "Панорамные окна", "Розетки"],
    equipmentEn: ["Projector", "Panoramic Daylight", "Power"],
    routeHint: "Лифт Нового корпуса → 5 этаж → правое крыло",
    routeHintEn: "New Wing Lift → 5F → East Wing",
    matchTokens: ["520"],
    rect: { x: 478, y: 34, w: 196, h: 112 },
    pathPoints: "360,326 360,180 576,180 576,146",
  },

  // TECH & LAW HUB — FLOORS 1-2
  {
    id: "tech-114",
    buildingId: "tech_hub",
    floor: 1,
    code: "Ауд. 114",
    codeEn: "Rm. 114",
    name: "Аудитория римского и частного права 114",
    nameEn: "Roman & Civil Law Seminar 114",
    category: "auditorium",
    capacity: "36 мест",
    capacityEn: "36 seats",
    equipment: ["Проектор", "Консультант+", "Wi-Fi 6"],
    equipmentEn: ["Projector", "Legal DB Access", "Wi-Fi 6"],
    routeHint: "Вход в Корпус C → прямо налево",
    routeHintEn: "Tech & Law Entrance → straight left",
    matchTokens: ["114", "109"],
    rect: { x: 46, y: 34, w: 196, h: 112 },
    pathPoints: "360,326 360,180 144,180 144,146",
  },
  {
    id: "tech-116",
    buildingId: "tech_hub",
    floor: 1,
    code: "Ауд. 116",
    codeEn: "Rm. 116",
    name: "Практикум по английскому юридическому языку 116",
    nameEn: "Legal English Workshop 116",
    category: "auditorium",
    capacity: "28 мест",
    capacityEn: "28 seats",
    equipment: ["Интерактивная доска", "Аудиосистема", "Модульные столы"],
    equipmentEn: ["Smart Board", "Audio System", "Modular Desks"],
    routeHint: "Вход в Корпус C → центр первого этажа",
    routeHintEn: "Tech & Law Entrance → 1F center",
    matchTokens: ["116"],
    rect: { x: 262, y: 34, w: 196, h: 112 },
    pathPoints: "360,326 360,180 360,146",
  },
  {
    id: "tech-208",
    buildingId: "tech_hub",
    floor: 1,
    code: "Ауд. 208",
    codeEn: "Rm. 208",
    name: "Семинарская гражданского права 208",
    nameEn: "Civil Law Seminar 208",
    category: "auditorium",
    capacity: "34 места",
    capacityEn: "34 seats",
    equipment: ["4K-панель", "Маркерная стена", "Розетки"],
    equipmentEn: ["4K Panel", "Writeable Wall", "Power"],
    routeHint: "Лестница на 2 этаж → направо",
    routeHintEn: "Stairs to 2F → turn right",
    matchTokens: ["208"],
    rect: { x: 478, y: 34, w: 196, h: 112 },
    pathPoints: "360,326 360,180 576,180 576,146",
  },
  {
    id: "tech-219",
    buildingId: "tech_hub",
    floor: 1,
    code: "Ауд. 219",
    codeEn: "Rm. 219",
    name: "Зал дебатов и деловых игр 219",
    nameEn: "Debate & Case Simulation Room 219",
    category: "auditorium",
    capacity: "32 места",
    capacityEn: "32 seats",
    equipment: ["Таймер дебатов", "ВКС", "Звукоизоляция"],
    equipmentEn: ["Debate Clock", "Video Conf", "Acoustic Panels"],
    routeHint: "Лестница на 2 этаж → левое крыло",
    routeHintEn: "Stairs to 2F → West Wing",
    matchTokens: ["219"],
    rect: { x: 46, y: 218, w: 230, h: 108 },
    pathPoints: "360,326 360,180 160,180 160,218",
  },

  // TECH & LAW HUB — FLOORS 3-5
  {
    id: "tech-301",
    buildingId: "tech_hub",
    floor: 3,
    code: "Ауд. 301",
    codeEn: "Rm. 301",
    name: "Аудитория теории государства и права 301",
    nameEn: "Legal Theory Lecture Room 301",
    category: "auditorium",
    capacity: "44 места",
    capacityEn: "44 seats",
    equipment: ["Проектор", "Wi-Fi 6", "Микрофон лектора"],
    equipmentEn: ["Projector", "Wi-Fi 6", "Lecturer Mic"],
    routeHint: "Лифт Корпуса C → 3 этаж → налево",
    routeHintEn: "Tech Hub Lift → 3F → turn left",
    matchTokens: ["301"],
    rect: { x: 46, y: 34, w: 295, h: 112 },
    pathPoints: "360,326 360,180 194,180 194,146",
  },
  {
    id: "tech-501",
    buildingId: "tech_hub",
    floor: 3,
    code: "Лаб. 501 · Data & AI",
    codeEn: "Lab 501 · Data & AI",
    name: "Компьютерная лаборатория анализа данных 501",
    nameEn: "Quantitative Data & AI Lab 501",
    category: "lab",
    capacity: "26 рабочих станций",
    capacityEn: "26 workstations",
    equipment: ["Двойные мониторы", "Python / R / SQL", "Гигабитная сеть"],
    equipmentEn: ["Dual Monitors", "Python / R / SQL", "1Gbps Ethernet"],
    routeHint: "Лифт Корпуса C → 5 этаж → правое крыло",
    routeHintEn: "Tech Hub Lift → 5F → East Wing",
    matchTokens: ["501", "лаб"],
    rect: { x: 365, y: 34, w: 309, h: 112 },
    pathPoints: "360,326 360,180 520,180 520,146",
  },
];

interface CampusMapSectionProps {
  lang: Lang;
  schedule: ScheduleItem[];
  isStaff: boolean;
  focusRoomQuery?: string | null;
  onNavigateTab: (tab: string) => void;
}

export function CampusMapSection({
  lang,
  schedule,
  isStaff,
  focusRoomQuery,
  onNavigateTab,
}: CampusMapSectionProps) {
  const [buildingId, setBuildingId] = useState<BuildingId>("main");
  const [floor, setFloor] = useState<number>(2);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("main-214");
  const [categoryFilter, setCategoryFilter] = useState<"all" | RoomCategory | "my_classes">("all");
  const [query, setQuery] = useState("");
  const [showRoute, setShowRoute] = useState(true);

  const roomMatchesSchedule = (room: FloorRoom, item: ScheduleItem) => {
    const hay = `${item.room} ${item.originalRoom ?? ""}`.toLowerCase();
    return room.matchTokens.some((token) => hay.includes(token.toLowerCase()));
  };

  // Focus a specific room if navigated from Next Class or Schedule
  useEffect(() => {
    if (!focusRoomQuery) return;
    const normalized = focusRoomQuery.toLowerCase();
    const matched = ROOMS.find(
      (r) =>
        normalized.includes(r.code.toLowerCase()) ||
        r.matchTokens.some((t) => normalized.includes(t.toLowerCase()))
    );
    if (matched) {
      setBuildingId(matched.buildingId);
      setFloor(matched.floor);
      setSelectedRoomId(matched.id);
      setShowRoute(true);
    }
  }, [focusRoomQuery]);

  // Search jump across all buildings/floors
  const searchMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ROOMS.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.codeEn.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.nameEn.toLowerCase().includes(q) ||
        r.matchTokens.some((t) => t.includes(q))
    );
  }, [query]);

  const activeBuilding = useMemo(
    () => BUILDINGS.find((b) => b.id === buildingId) ?? BUILDINGS[0],
    [buildingId]
  );

  const floorRooms = useMemo(() => {
    return ROOMS.filter((r) => {
      if (r.buildingId !== buildingId || r.floor !== floor) return false;
      if (categoryFilter === "my_classes") {
        return schedule.some((s) => roomMatchesSchedule(r, s));
      }
      if (categoryFilter !== "all") {
        return r.category === categoryFilter;
      }
      return true;
    });
  }, [buildingId, floor, categoryFilter, schedule]);

  const selectedRoom = useMemo(
    () => ROOMS.find((r) => r.id === selectedRoomId) ?? floorRooms[0] ?? ROOMS[0],
    [selectedRoomId, floorRooms]
  );

  const selectedRoomClasses = useMemo(
    () => schedule.filter((s) => roomMatchesSchedule(selectedRoom, s)),
    [schedule, selectedRoom]
  );

  const selectBuilding = (nextId: BuildingId) => {
    setBuildingId(nextId);
    const bMeta = BUILDINGS.find((b) => b.id === nextId) ?? BUILDINGS[0];
    const nextFloor = bMeta.floors[0];
    setFloor(nextFloor);
    const firstRoom = ROOMS.find((r) => r.buildingId === nextId && r.floor === nextFloor);
    if (firstRoom) setSelectedRoomId(firstRoom.id);
  };

  const selectFloor = (nextFloor: number) => {
    setFloor(nextFloor);
    const firstRoom = ROOMS.find((r) => r.buildingId === buildingId && r.floor === nextFloor);
    if (firstRoom) setSelectedRoomId(firstRoom.id);
  };

  const getBuildingClassStats = (bId: BuildingId) => {
    const roomsInBuilding = ROOMS.filter((r) => r.buildingId === bId);
    const matching = schedule.filter((s) =>
      roomsInBuilding.some((r) => roomMatchesSchedule(r, s))
    );
    const changes = matching.filter((s) => s.status !== "normal");
    return { total: matching.length, changes: changes.length };
  };

  const categoryLabel = (cat: RoomCategory) => {
    if (lang === "ru") {
      return cat === "hall"
        ? "Зал"
        : cat === "lab"
          ? "Лаборатория"
          : cat === "service"
            ? "Деканат / Сервис"
            : "Аудитория";
    }
    return cat === "hall"
      ? "Auditorium Hall"
      : cat === "lab"
        ? "Lab"
        : cat === "service"
          ? "Service / Dean"
          : "Classroom";
  };

  const floorLabel = (b: BuildingMeta, fl: number) => {
    if (b.id === "main") {
      return lang === "ru" ? `${fl} этаж` : `${fl}F`;
    }
    if (fl === 1) {
      return b.id === "tech_hub"
        ? lang === "ru"
          ? "1–2 этажи"
          : "1–2F"
        : lang === "ru"
          ? "1 этаж"
          : "1F";
    }
    return lang === "ru" ? "3–5 этажи" : "3–5F";
  };

  return (
    <div className="space-y-5">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[var(--accent)] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" />
            {lang === "ru" ? "Интерактивный навигатор" : "Interactive Campus Navigator"}
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold mt-1">
            {lang === "ru"
              ? "Карта кампуса, корпусов и аудиторий"
              : "Campus, Buildings & Room Floor Plans"}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {lang === "ru"
              ? "Кликайте по корпусам и аудиториям: показаны маршруты от входа и ваши текущие пары"
              : "Click any building or room to inspect seating, live scheduled classes, and walking route"}
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              lang === "ru"
                ? "Найти: 214, Зал № 4, 308, Лаб. 501..."
                : "Find room: 214, Hall #4, 308, Lab 501..."
            }
            className="w-full rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] pl-9 pr-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          {searchMatches.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xl p-1.5 max-h-56 overflow-y-auto">
              {searchMatches.map((r) => {
                const b = BUILDINGS.find((bm) => bm.id === r.buildingId);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setBuildingId(r.buildingId);
                      setFloor(r.floor);
                      setSelectedRoomId(r.id);
                      setQuery("");
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--bg-page)] flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-semibold truncate">
                      {lang === "ru" ? r.code : r.codeEn}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] shrink-0">
                      {lang === "ru" ? b?.name : b?.nameEn}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Campus Master Plan Card */}
      <div className="stagger-item rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold">
              {lang === "ru" ? "1. Схема кампуса (выберите корпус)" : "1. Campus Master Plan (select wing)"}
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] px-2.5 py-1 rounded-full bg-[var(--bg-page)] border border-[var(--border-color)]">
            <Sparkles className="w-3 h-3 text-[#C49A45]" />
            {lang === "ru"
              ? "Концептуальная схема · привязана к вашему расписанию"
              : "Architectural blueprint · synced with live schedule"}
          </span>
        </div>

        <div className="grid lg:grid-cols-12 gap-4 items-center">
          {/* Interactive SVG Site Plan */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0D1B2A] text-white p-3 sm:p-4 border border-[#C49A45]/25 relative overflow-hidden">
            <svg
              viewBox="0 0 640 225"
              className="w-full h-auto block select-none"
              role="img"
              aria-label={lang === "ru" ? "Схема корпусов кампуса" : "Campus buildings blueprint"}
            >
              {/* Subtle blueprint grid */}
              <defs>
                <pattern id="campusGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path
                    d="M 24 0 L 0 0 0 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="640" height="225" rx="14" fill="url(#campusGrid)" />

              {/* Courtyard & Pathways */}
              <path
                d="M 85 186 Q 210 155 320 155 T 540 165"
                fill="none"
                stroke="rgba(196,154,69,0.45)"
                strokeWidth="3"
                strokeDasharray="6 5"
              />
              <circle cx="320" cy="155" r="24" fill="rgba(27,75,138,0.28)" stroke="rgba(196,154,69,0.45)" />
              <text x="320" y="159" textAnchor="middle" fill="#DFB863" fontSize="9" fontFamily="monospace">
                {lang === "ru" ? "СКВЕР" : "PLAZA"}
              </text>

              {/* Skybridge between Main & New Wing */}
              <rect
                x="232"
                y="62"
                width="44"
                height="20"
                rx="4"
                fill="rgba(77,141,246,0.28)"
                stroke="#60A5FA"
                strokeWidth="1.2"
              />
              <text x="254" y="75" textAnchor="middle" fill="#BAE6FD" fontSize="7.5" fontFamily="monospace">
                {lang === "ru" ? "ПЕРЕХОД" : "BRIDGE"}
              </text>

              {/* Building A: Main */}
              <g
                onClick={() => selectBuilding("main")}
                className="cursor-pointer transition-opacity hover:opacity-95"
              >
                <rect
                  x="26"
                  y="30"
                  width="206"
                  height="96"
                  rx="14"
                  fill={buildingId === "main" ? "#1B4B8A" : "#152841"}
                  stroke={buildingId === "main" ? "#DFB863" : "rgba(255,255,255,0.28)"}
                  strokeWidth={buildingId === "main" ? "2.5" : "1.2"}
                />
                <text x="42" y="54" fill="#DFB863" fontSize="10" fontWeight="700" fontFamily="monospace">
                  {lang === "ru" ? "КОРПУС A" : "WING A"}
                </text>
                <text x="42" y="74" fill="#FFFFFF" fontSize="13.5" fontWeight="700">
                  {lang === "ru" ? "Главный корпус" : "Main Building"}
                </text>
                <text x="42" y="92" fill="rgba(255,255,255,0.75)" fontSize="9.5">
                  {lang === "ru" ? "Деканат 214 · Зал судеб. 1 · 308" : "Dean Rm. 214 · Moot · 308"}
                </text>
                <text x="42" y="110" fill="#93C5FD" fontSize="9" fontFamily="monospace">
                  {lang === "ru"
                    ? `Пар по расп.: ${getBuildingClassStats("main").total}`
                    : `Classes: ${getBuildingClassStats("main").total}`}
                </text>
              </g>

              {/* Building B: New Wing */}
              <g
                onClick={() => selectBuilding("new_wing")}
                className="cursor-pointer transition-opacity hover:opacity-95"
              >
                <rect
                  x="276"
                  y="24"
                  width="176"
                  height="92"
                  rx="14"
                  fill={buildingId === "new_wing" ? "#1B4B8A" : "#152841"}
                  stroke={buildingId === "new_wing" ? "#DFB863" : "rgba(255,255,255,0.28)"}
                  strokeWidth={buildingId === "new_wing" ? "2.5" : "1.2"}
                />
                <text x="290" y="48" fill="#DFB863" fontSize="10" fontWeight="700" fontFamily="monospace">
                  {lang === "ru" ? "КОРПУС B" : "WING B"}
                </text>
                <text x="290" y="67" fill="#FFFFFF" fontSize="13.5" fontWeight="700">
                  {lang === "ru" ? "Новый корпус" : "New Wing"}
                </text>
                <text x="290" y="84" fill="rgba(255,255,255,0.75)" fontSize="9.5">
                  {lang === "ru" ? "Зал № 4 · МФЦ · 3102" : "Hall #4 · Hub · 3102"}
                </text>
                <text x="290" y="102" fill="#FDE68A" fontSize="9" fontFamily="monospace">
                  {lang === "ru"
                    ? `Переносов: ${getBuildingClassStats("new_wing").changes}`
                    : `Moved here: ${getBuildingClassStats("new_wing").changes}`}
                </text>
              </g>

              {/* Building C: Tech & Law Hub */}
              <g
                onClick={() => selectBuilding("tech_hub")}
                className="cursor-pointer transition-opacity hover:opacity-95"
              >
                <rect
                  x="472"
                  y="40"
                  width="144"
                  height="104"
                  rx="14"
                  fill={buildingId === "tech_hub" ? "#1B4B8A" : "#152841"}
                  stroke={buildingId === "tech_hub" ? "#DFB863" : "rgba(255,255,255,0.28)"}
                  strokeWidth={buildingId === "tech_hub" ? "2.5" : "1.2"}
                />
                <text x="486" y="64" fill="#DFB863" fontSize="10" fontWeight="700" fontFamily="monospace">
                  {lang === "ru" ? "КОРПУС C" : "WING C"}
                </text>
                <text x="486" y="83" fill="#FFFFFF" fontSize="13" fontWeight="700">
                  {lang === "ru" ? "Право и ИТ" : "Tech & Law"}
                </text>
                <text x="486" y="100" fill="rgba(255,255,255,0.75)" fontSize="9.5">
                  {lang === "ru" ? "Лаб. 501 · 114 · 301" : "Lab 501 · 114 · 301"}
                </text>
                <text x="486" y="120" fill="#93C5FD" fontSize="9" fontFamily="monospace">
                  {lang === "ru"
                    ? `Пар: ${getBuildingClassStats("tech_hub").total}`
                    : `Classes: ${getBuildingClassStats("tech_hub").total}`}
                </text>
              </g>

              {/* Main Gate Marker */}
              <rect x="30" y="176" width="142" height="32" rx="8" fill="rgba(196,154,69,0.22)" stroke="#C49A45" />
              <text x="101" y="196" textAnchor="middle" fill="#FDE68A" fontSize="9.5" fontWeight="700">
                {lang === "ru" ? "КПП · Вход с проспекта" : "MAIN GATE · Metro Walk"}
              </text>
            </svg>
          </div>

          {/* 3 Building Selector Cards */}
          <div className="lg:col-span-5 grid gap-2.5">
            {BUILDINGS.map((b) => {
              const active = b.id === buildingId;
              const stats = getBuildingClassStats(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => selectBuilding(b.id)}
                  className={`w-full text-left rounded-2xl p-3.5 border transition-all ${
                    active
                      ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white border-[#C49A45]/60 shadow-sm"
                      : "bg-[var(--bg-page)] border-[var(--border-color)] hover:border-[var(--accent)]/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                          active
                            ? "bg-[#C49A45] text-[#0D1B2A]"
                            : "bg-[var(--bg-subtle)] text-[var(--accent)]"
                        }`}
                      >
                        {b.code}
                      </span>
                      <span className="text-sm font-semibold truncate">
                        {lang === "ru" ? b.name : b.nameEn}
                      </span>
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${
                        active
                          ? "bg-white/15 text-[#FDE68A]"
                          : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]"
                      }`}
                    >
                      {lang === "ru" ? b.walkTime : b.walkTimeEn}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mt-1.5 leading-snug ${
                      active ? "text-white/80" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {lang === "ru" ? b.subtitle : b.subtitleEn}
                  </p>
                  {stats.total > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-mono">
                      <span
                        className={`px-2 py-0.5 rounded-md ${
                          active ? "bg-white/15 text-white" : "bg-[var(--bg-surface)] text-[var(--text-primary)]"
                        }`}
                      >
                        {lang === "ru" ? `Занятий: ${stats.total}` : `Scheduled: ${stats.total}`}
                      </span>
                      {stats.changes > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 dark:text-amber-200 font-semibold">
                          {lang === "ru" ? `Изменений: ${stats.changes}` : `Updates: ${stats.changes}`}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Level 2: Interactive Floor Plan + Room Inspector */}
      <div className="grid lg:grid-cols-12 gap-5 items-start">
        {/* SVG Floorplan */}
        <div className="stagger-item lg:col-span-7 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-5 shadow-sm space-y-4 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--accent)]" />
                <span>
                  {lang === "ru" ? activeBuilding.name : activeBuilding.nameEn} —{" "}
                  {floorLabel(activeBuilding, floor)}
                </span>
              </h2>
            </div>

            {/* Floor tabs */}
            <div className="inline-flex rounded-xl bg-[var(--bg-page)] border border-[var(--border-color)] p-1">
              {activeBuilding.floors.map((fl) => (
                <button
                  key={fl}
                  type="button"
                  onClick={() => selectFloor(fl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    floor === fl
                      ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {floorLabel(activeBuilding, fl)}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Chips + Route Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { id: "all", ru: "Все", en: "All" },
                  { id: "auditorium", ru: "Аудитории", en: "Rooms" },
                  { id: "hall", ru: "Залы", en: "Halls" },
                  { id: "service", ru: "Деканат и сервисы", en: "Services" },
                  { id: "my_classes", ru: "Мои пары", en: "My Classes" },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`whitespace-nowrap px-2.5 py-1 rounded-xl text-[11px] font-medium border transition-colors ${
                    categoryFilter === cat.id
                      ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white border-transparent"
                      : "bg-[var(--bg-page)] border-[var(--border-color)] text-[var(--text-secondary)]"
                  }`}
                >
                  {lang === "ru" ? cat.ru : cat.en}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowRoute((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-colors ${
                showRoute
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-200"
                  : "bg-[var(--bg-page)] border-[var(--border-color)] text-[var(--text-secondary)]"
              }`}
            >
              <Navigation className="w-3 h-3 text-[#C49A45]" />
              {lang === "ru" ? "Маршрут" : "Wayfinding"}
            </button>
          </div>

          {/* SVG Floor Blueprint */}
          <div className="rounded-2xl bg-[var(--bg-page)] border border-[var(--border-color)] p-2 sm:p-3">
            <svg
              viewBox="0 0 720 360"
              className="w-full h-auto block select-none"
              role="img"
              aria-label={lang === "ru" ? "Поэтажный план корпуса" : "Floor plan"}
            >
              {/* Outer Walls */}
              <rect
                x="18"
                y="14"
                width="684"
                height="332"
                rx="18"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.18"
                strokeWidth="2"
              />

              {/* Central Corridor */}
              <rect
                x="34"
                y="156"
                width="652"
                height="48"
                rx="8"
                fill="currentColor"
                fillOpacity="0.04"
              />
              <text
                x="360"
                y="184"
                textAnchor="middle"
                fill="currentColor"
                fillOpacity="0.32"
                fontSize="11"
                fontFamily="monospace"
                letterSpacing="3"
              >
                {lang === "ru" ? "ЦЕНТРАЛЬНАЯ ГАЛЕРЕЯ · КОРИДОР" : "CENTRAL CORRIDOR"}
              </text>

              {/* Entrance / Lift Marker */}
              <rect
                x="300"
                y="306"
                width="120"
                height="32"
                rx="8"
                fill="#0D1B2A"
                stroke="#C49A45"
                strokeWidth="1.5"
              />
              <text
                x="360"
                y="326"
                textAnchor="middle"
                fill="#FDE68A"
                fontSize="10.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                {lang === "ru" ? "ЛИФТ / ВХОД" : "LIFT / ENTRY"}
              </text>

              {/* Rooms */}
              {floorRooms.map((room) => {
                const isSelected = selectedRoom?.id === room.id;
                const liveClasses = schedule.filter((s) => roomMatchesSchedule(room, s));
                const hasChange = liveClasses.some((s) => s.status !== "normal");
                return (
                  <g
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={room.rect.x}
                      y={room.rect.y}
                      width={room.rect.w}
                      height={room.rect.h}
                      rx="14"
                      fill={
                        isSelected
                          ? "#1B4B8A"
                          : hasChange
                            ? "rgba(245, 158, 11, 0.14)"
                            : room.category === "service"
                              ? "rgba(196, 154, 69, 0.14)"
                              : "var(--bg-surface)"
                      }
                      stroke={
                        isSelected
                          ? "#C49A45"
                          : hasChange
                            ? "#D97706"
                            : "rgba(27, 75, 138, 0.35)"
                      }
                      strokeWidth={isSelected ? "2.8" : "1.4"}
                    />
                    <text
                      x={room.rect.x + 14}
                      y={room.rect.y + 30}
                      fill={isSelected ? "#FDE68A" : "var(--accent)"}
                      fontSize="11.5"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {categoryLabel(room.category)}
                    </text>
                    <text
                      x={room.rect.x + 14}
                      y={room.rect.y + 54}
                      fill={isSelected ? "#FFFFFF" : "var(--text-primary)"}
                      fontSize="16"
                      fontWeight="700"
                    >
                      {lang === "ru" ? room.code : room.codeEn}
                    </text>
                    <text
                      x={room.rect.x + 14}
                      y={room.rect.y + 76}
                      fill={isSelected ? "rgba(255,255,255,0.8)" : "var(--text-secondary)"}
                      fontSize="11"
                    >
                      {lang === "ru" ? room.capacity : room.capacityEn}
                    </text>

                    {liveClasses.length > 0 && (
                      <g>
                        <rect
                          x={room.rect.x + 14}
                          y={room.rect.y + 84}
                          width={126}
                          height="18"
                          rx="6"
                          fill={hasChange ? "#D97706" : "#0D1B2A"}
                        />
                        <text
                          x={room.rect.x + 22}
                          y={room.rect.y + 96}
                          fill="#FFFFFF"
                          fontSize="9.5"
                          fontWeight="700"
                        >
                          {hasChange
                            ? lang === "ru"
                              ? `Перенос · ${liveClasses.length}`
                              : `Changed · ${liveClasses.length}`
                            : lang === "ru"
                              ? `По расп.: ${liveClasses.length}`
                              : `Classes: ${liveClasses.length}`}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Wayfinding Route Path */}
              {showRoute && selectedRoom && selectedRoom.buildingId === buildingId && selectedRoom.floor === floor && (
                <polyline
                  points={selectedRoom.pathPoints}
                  fill="none"
                  stroke="#C49A45"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="7 6"
                />
              )}
            </svg>
          </div>

          {/* Quick Touch Directory for Floor */}
          {floorRooms.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] py-2">
              {lang === "ru"
                ? "На этом этаже нет помещений по выбранному фильтру."
                : "No rooms match this filter on this floor."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {floorRooms.map((r) => {
                const active = selectedRoom?.id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoomId(r.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      active
                        ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white border-transparent"
                        : "bg-[var(--bg-page)] border-[var(--border-color)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {lang === "ru" ? r.code : r.codeEn}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Room Inspector */}
        <div className="stagger-item lg:col-span-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-5 shadow-sm space-y-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#1B4B8A]/10 text-[var(--accent)] font-semibold">
                <DoorOpen className="w-3 h-3" />
                {categoryLabel(selectedRoom.category)}
              </span>
              <h3 className="text-xl font-semibold mt-2">
                {lang === "ru" ? selectedRoom.code : selectedRoom.codeEn}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {lang === "ru" ? selectedRoom.name : selectedRoom.nameEn}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-2xl bg-[var(--bg-page)] border border-[var(--border-color)] p-3">
              <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
                {lang === "ru" ? "Вместимость" : "Capacity"}
              </p>
              <p className="font-semibold mt-1">
                {lang === "ru" ? selectedRoom.capacity : selectedRoom.capacityEn}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--bg-page)] border border-[var(--border-color)] p-3">
              <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                <Accessibility className="w-3.5 h-3.5 text-emerald-600" />
                {lang === "ru" ? "Доступность" : "Access"}
              </p>
              <p className="font-semibold mt-1">
                {lang === "ru" ? "Лифт и безбарьерно" : "Step-free & Lift"}
              </p>
            </div>
          </div>

          {/* Walking Route Hint */}
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3.5 text-xs space-y-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#C49A45]" />
              {lang === "ru" ? "Как пройти" : "Walking Directions"}
            </p>
            <p className="text-amber-950/85 dark:text-amber-100/90 leading-relaxed">
              {lang === "ru" ? selectedRoom.routeHint : selectedRoom.routeHintEn}
            </p>
          </div>

          {/* Equipment Tags */}
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-[var(--accent)]" />
              {lang === "ru" ? "Оснащение помещения" : "Room Equipment"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(lang === "ru" ? selectedRoom.equipment : selectedRoom.equipmentEn).map((eq) => (
                <span
                  key={eq}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--bg-page)] border border-[var(--border-color)]"
                >
                  {eq}
                </span>
              ))}
            </div>
          </div>

          {/* Live Schedule in This Room */}
          <div className="pt-3 border-t border-[var(--border-color)] space-y-2.5">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
              {lang === "ru"
                ? "Занятия в этой аудитории (из расписания)"
                : "Scheduled Classes in This Space"}
            </p>

            {selectedRoomClasses.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">
                {selectedRoom.id === "main-214"
                  ? lang === "ru"
                    ? "Кабинет 214 — точка выдачи готовых бумажных справок и консультаций деканата."
                    : "Room 214 handles paper certificate pickups and in-person Dean advising."
                  : lang === "ru"
                    ? "В текущем расписании вашей группы здесь нет закреплённых пар."
                    : "No scheduled sessions for your active timetable in this space."}
              </p>
            ) : (
              <div className="space-y-2">
                {selectedRoomClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="rounded-2xl bg-[var(--bg-page)] border border-[var(--border-color)] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-[var(--accent)]">
                        {cls.startTime}–{cls.endTime}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] font-medium">
                        {cls.groupCode}
                      </span>
                    </div>
                    <p className="font-semibold mt-1">
                      {lang === "ru" ? cls.subject : cls.subjectEn}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {cls.lecturer}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {selectedRoom.id === "main-214" && (
              <button
                type="button"
                onClick={() => onNavigateTab(isStaff ? "staff_queue" : "requests")}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white text-xs font-semibold hover:opacity-90"
              >
                <FileText className="w-3.5 h-3.5" />
                {isStaff
                  ? lang === "ru"
                    ? "Перейти к очереди справок"
                    : "Open Requests Queue"
                  : lang === "ru"
                    ? "Заказать справку онлайн без очереди"
                    : "Order Certificate Online"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
