"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
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
  rect: { x: number; y: number; w: number; h: number };
  /** Door position on corridor edge + schematic motif */
  doorSide: "bottom" | "top";
  motif?: "amphitheater" | "workstations" | "service" | "moot";
  pathPoints: string;
  destPoint: { x: number; y: number };
}

interface BuildingMeta {
  id: BuildingId;
  code: string;
  name: string;
  nameEn: string;
  shortName: string;
  shortNameEn: string;
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
    shortName: "Главный (A)",
    shortNameEn: "Main (A)",
    subtitle: "Деканат (каб. 214), залы, читальный зал и классические аудитории",
    subtitleEn: "Dean's Office (Rm. 214), moot court, library & lecture halls",
    floors: [1, 2, 3],
    walkTime: "2 мин от КПП",
    walkTimeEn: "2 min from Gate",
  },
  {
    id: "new_wing",
    code: "B",
    name: "Новый корпус",
    nameEn: "New Auditorium Wing",
    shortName: "Новый (B)",
    shortNameEn: "New Wing (B)",
    subtitle: "Потоковые залы-амфитеатры (Зал № 4), форум-атриум и МФЦ",
    subtitleEn: "Streaming amphitheaters (Hall #4), forum atrium & service desk",
    floors: [1, 3],
    walkTime: "4 мин по галерее",
    walkTimeEn: "4 min skybridge",
  },
  {
    id: "tech_hub",
    code: "C",
    name: "Корпус права и ИТ",
    nameEn: "Tech & Law Hub",
    shortName: "Право и ИТ (C)",
    shortNameEn: "Tech & Law (C)",
    subtitle: "Лаборатории анализа данных, семинарские и коворкинг",
    subtitleEn: "Data science labs, seminar rooms & student coworking",
    floors: [1, 3],
    walkTime: "5 мин через сквер",
    walkTimeEn: "5 min courtyard",
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
    routeHint: "Главный холл → левое крыло → 2-я двойная дверь",
    routeHintEn: "Main Lobby → West Wing → 2nd double doors",
    matchTokens: ["зал судеб", "moot"],
    rect: { x: 46, y: 34, w: 185, h: 108 },
    doorSide: "bottom",
    motif: "moot",
    pathPoints: "360,322 360,180 138,180 138,142",
    destPoint: { x: 138, y: 142 },
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
    capacity: "24 места",
    capacityEn: "24 stations",
    equipment: ["Гарнитуры", "Аудиоконсоль", "Интерактивная доска"],
    equipmentEn: ["Audio Headsets", "Booth Console", "Smart Board"],
    routeHint: "Главный холл → левое крыло → конец коридора",
    routeHintEn: "Main Lobby → West Wing → end of corridor",
    matchTokens: ["лингафон", "118"],
    rect: { x: 248, y: 34, w: 185, h: 108 },
    doorSide: "bottom",
    motif: "workstations",
    pathPoints: "360,322 360,180 340,180 340,142",
    destPoint: { x: 340, y: 142 },
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
    doorSide: "bottom",
    pathPoints: "360,322 360,180 562,180 562,142",
    destPoint: { x: 562, y: 142 },
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
    doorSide: "top",
    motif: "service",
    pathPoints: "360,322 360,180 160,180 160,218",
    destPoint: { x: 160, y: 218 },
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
    doorSide: "top",
    motif: "service",
    pathPoints: "360,322 360,268 444,268",
    destPoint: { x: 444, y: 268 },
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
    doorSide: "bottom",
    motif: "service",
    pathPoints: "360,322 360,180 562,180 562,142",
    destPoint: { x: 562, y: 142 },
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
    doorSide: "bottom",
    pathPoints: "360,322 360,180 340,180 340,142",
    destPoint: { x: 340, y: 142 },
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
    doorSide: "bottom",
    pathPoints: "360,322 360,180 138,180 138,142",
    destPoint: { x: 138, y: 142 },
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
    doorSide: "top",
    motif: "amphitheater",
    pathPoints: "360,322 360,180 160,180 160,218",
    destPoint: { x: 160, y: 218 },
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
    doorSide: "top",
    motif: "workstations",
    pathPoints: "360,322 360,180 560,180 560,218",
    destPoint: { x: 560, y: 218 },
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
    doorSide: "bottom",
    pathPoints: "360,322 360,180 194,180 194,146",
    destPoint: { x: 194, y: 146 },
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
    doorSide: "bottom",
    motif: "workstations",
    pathPoints: "360,322 360,180 520,180 520,146",
    destPoint: { x: 520, y: 146 },
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
    doorSide: "top",
    motif: "service",
    pathPoints: "360,322 360,180 560,180 560,218",
    destPoint: { x: 560, y: 218 },
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
    doorSide: "bottom",
    motif: "amphitheater",
    pathPoints: "360,322 360,184 236,184 236,154",
    destPoint: { x: 236, y: 154 },
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
    doorSide: "bottom",
    motif: "service",
    pathPoints: "360,322 360,184 562,184 562,154",
    destPoint: { x: 562, y: 154 },
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
    doorSide: "top",
    motif: "amphitheater",
    pathPoints: "360,322 360,184 160,184 160,218",
    destPoint: { x: 160, y: 218 },
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
    doorSide: "bottom",
    motif: "amphitheater",
    pathPoints: "360,322 360,180 144,180 144,146",
    destPoint: { x: 144, y: 146 },
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
    doorSide: "bottom",
    pathPoints: "360,322 360,180 360,146",
    destPoint: { x: 360, y: 146 },
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
    doorSide: "bottom",
    pathPoints: "360,322 360,180 576,180 576,146",
    destPoint: { x: 576, y: 146 },
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
    doorSide: "bottom",
    pathPoints: "360,322 360,180 144,180 144,146",
    destPoint: { x: 144, y: 146 },
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
    doorSide: "bottom",
    pathPoints: "360,322 360,180 360,146",
    destPoint: { x: 360, y: 146 },
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
    doorSide: "bottom",
    pathPoints: "360,322 360,180 576,180 576,146",
    destPoint: { x: 576, y: 146 },
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
    doorSide: "top",
    motif: "moot",
    pathPoints: "360,322 360,180 160,180 160,218",
    destPoint: { x: 160, y: 218 },
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
    doorSide: "bottom",
    pathPoints: "360,322 360,180 194,180 194,146",
    destPoint: { x: 194, y: 146 },
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
    capacity: "26 станций",
    capacityEn: "26 stations",
    equipment: ["Двойные мониторы", "Python / R / SQL", "Гигабитная сеть"],
    equipmentEn: ["Dual Monitors", "Python / R / SQL", "1Gbps Ethernet"],
    routeHint: "Лифт Корпуса C → 5 этаж → правое крыло",
    routeHintEn: "Tech Hub Lift → 5F → East Wing",
    matchTokens: ["501", "лаб"],
    rect: { x: 365, y: 34, w: 309, h: 112 },
    doorSide: "bottom",
    motif: "workstations",
    pathPoints: "360,322 360,180 520,180 520,146",
    destPoint: { x: 520, y: 146 },
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

  const floorStageRef = useRef<HTMLDivElement | null>(null);
  const routePathRef = useRef<SVGPolylineElement | null>(null);
  const routeBeaconRef = useRef<SVGCircleElement | null>(null);
  const inspectorRef = useRef<HTMLDivElement | null>(null);

  const roomMatchesSchedule = (room: FloorRoom, item: ScheduleItem) => {
    const hay = `${item.room} ${item.originalRoom ?? ""}`.toLowerCase();
    return room.matchTokens.some((token) => hay.includes(token.toLowerCase()));
  };

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

  // Animate floor blueprint transitions smoothly when building, floor, or category filter changes
  useEffect(() => {
    const el = floorStageRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0.35, y: 10, scale: 0.985 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.36,
          ease: "power3.out",
          clearProps: "transform",
        }
      );

      const roomNodes = el.querySelectorAll(".map-room-node");
      if (roomNodes.length > 0) {
        gsap.fromTo(
          roomNodes,
          { scale: 0.94, transformOrigin: "center center" },
          {
            scale: 1,
            duration: 0.32,
            stagger: 0.04,
            ease: "power2.out",
            clearProps: "transform",
          }
        );
      }
    }, floorStageRef);

    return () => ctx.revert();
  }, [buildingId, floor]);

  // Animate route trace + inspector panel whenever selected room or route visibility changes
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const poly = routePathRef.current;
      const beacon = routeBeaconRef.current;
      if (poly && showRoute) {
        const len = poly.getTotalLength ? poly.getTotalLength() : 520;
        gsap.fromTo(
          poly,
          { strokeDasharray: `${len}`, strokeDashoffset: len },
          {
            strokeDashoffset: 0,
            duration: 0.55,
            ease: "power2.out",
            onComplete: () => {
              poly.style.strokeDasharray = "8 6";
            },
          }
        );
      }
      if (beacon && showRoute) {
        gsap.fromTo(
          beacon,
          { scale: 0.4, opacity: 0, transformOrigin: "center center" },
          { scale: 1, opacity: 1, duration: 0.45, delay: 0.25, ease: "back.out(2)" }
        );
      }
      if (inspectorRef.current) {
        gsap.fromTo(
          inspectorRef.current,
          { opacity: 0.4, y: 8 },
          { opacity: 1, y: 0, duration: 0.26, ease: "power2.out", clearProps: "transform" }
        );
      }
    });

    return () => ctx.revert();
  }, [selectedRoomId, showRoute, buildingId, floor]);

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

  const allFloorRooms = useMemo(
    () => ROOMS.filter((r) => r.buildingId === buildingId && r.floor === floor),
    [buildingId, floor]
  );

  const roomMatchesFilter = (r: FloorRoom) => {
    if (categoryFilter === "my_classes") {
      return schedule.some((s) => roomMatchesSchedule(r, s));
    }
    if (categoryFilter !== "all") {
      return r.category === categoryFilter;
    }
    return true;
  };

  const floorRooms = useMemo(
    () => allFloorRooms.filter(roomMatchesFilter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allFloorRooms, categoryFilter, schedule]
  );

  const selectedRoom = useMemo(
    () => ROOMS.find((r) => r.id === selectedRoomId) ?? floorRooms[0] ?? allFloorRooms[0] ?? ROOMS[0],
    [selectedRoomId, floorRooms, allFloorRooms]
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
          ? "Лаб."
          : cat === "service"
            ? "Сервис"
            : "Ауд.";
    }
    return cat === "hall"
      ? "Hall"
      : cat === "lab"
        ? "Lab"
        : cat === "service"
          ? "Service"
          : "Room";
  };

  const floorLabel = (b: BuildingMeta, fl: number) => {
    if (b.id === "main") {
      return lang === "ru" ? `${fl} этаж` : `${fl}F`;
    }
    if (fl === 1) {
      return b.id === "tech_hub"
        ? lang === "ru"
          ? "1–2 эт."
          : "1–2F"
        : lang === "ru"
          ? "1 этаж"
          : "1F";
    }
    return lang === "ru" ? "3–5 эт." : "3–5F";
  };

  const renderRoomMotif = (room: FloorRoom, isSelected: boolean) => {
    const stroke = isSelected ? "rgba(255,255,255,0.22)" : "rgba(27,75,138,0.16)";
    const cx = room.rect.x + room.rect.w - 42;
    const cy = room.rect.y + 42;

    if (room.motif === "amphitheater") {
      return (
        <g pointerEvents="none" opacity="0.9">
          <path d={`M ${cx - 24} ${cy - 8} A 24 18 0 0 0 ${cx + 24} ${cy - 8}`} fill="none" stroke={stroke} strokeWidth="1.6" />
          <path d={`M ${cx - 17} ${cy - 1} A 17 12 0 0 0 ${cx + 17} ${cy - 1}`} fill="none" stroke={stroke} strokeWidth="1.6" />
          <path d={`M ${cx - 10} ${cy + 6} A 10 7 0 0 0 ${cx + 10} ${cy + 6}`} fill="none" stroke={stroke} strokeWidth="1.6" />
        </g>
      );
    }
    if (room.motif === "workstations") {
      return (
        <g pointerEvents="none" opacity="0.9">
          {[0, 1].map((r) =>
            [0, 1, 2].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={cx - 24 + c * 16}
                y={cy - 12 + r * 14}
                width="10"
                height="7"
                rx="2"
                fill="none"
                stroke={stroke}
                strokeWidth="1.3"
              />
            ))
          )}
        </g>
      );
    }
    if (room.motif === "moot") {
      return (
        <g pointerEvents="none" opacity="0.9">
          <rect x={cx - 18} y={cy - 14} width="36" height="8" rx="3" fill="none" stroke={stroke} strokeWidth="1.5" />
          <rect x={cx - 18} y={cy} width="14" height="12" rx="2" fill="none" stroke={stroke} strokeWidth="1.3" />
          <rect x={cx + 4} y={cy} width="14" height="12" rx="2" fill="none" stroke={stroke} strokeWidth="1.3" />
        </g>
      );
    }
    if (room.motif === "service") {
      return (
        <g pointerEvents="none" opacity="0.9">
          <circle cx={cx} cy={cy - 2} r="13" fill="none" stroke={stroke} strokeWidth="1.4" strokeDasharray="3 3" />
          <circle cx={cx} cy={cy - 2} r="4" fill={isSelected ? "#DFB863" : "#C49A45"} fillOpacity="0.65" />
        </g>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--accent)] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 shrink-0" />
            {lang === "ru" ? "Архитектурный навигатор" : "Architectural Campus Navigator"}
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold mt-1 leading-tight">
            {lang === "ru"
              ? "Карта кампуса и аудиторий"
              : "Campus & Floor Blueprint"}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {lang === "ru"
              ? "Живая привязка к парам и переносам · анимированные маршруты от входа"
              : "Synced with live classes & room transfers · animated indoor wayfinding"}
          </p>
        </div>

        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              lang === "ru"
                ? "Найти: 214, Зал № 4, 308, 501..."
                : "Find: 214, Hall #4, 308, Lab 501..."
            }
            className="w-full rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-sm"
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
                      {lang === "ru" ? b?.shortName : b?.shortNameEn}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: PREMIUM CAMPUS MASTER PLAN */}
      <div className="stagger-item rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-3.5 sm:p-5 shadow-sm space-y-3.5 min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-[#0D1B2A] dark:bg-[#1B4B8A] text-[#DFB863] shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">
                {lang === "ru" ? "1. Схема кампуса" : "1. Campus Master Plan"}
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                {lang === "ru"
                  ? "Нажмите на любой корпус на схеме или ниже"
                  : "Tap a building on the blueprint or selector"}
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] px-2.5 py-1 rounded-full bg-[var(--bg-page)] border border-[var(--border-color)]">
            <Sparkles className="w-3 h-3 text-[#C49A45]" />
            {lang === "ru" ? "Демо-схема 3 корпусов" : "3-Wing Blueprint"}
          </span>
        </div>

        {/* Mobile-Friendly Quick Building Switcher Strip */}
        <div className="grid grid-cols-3 gap-1.5 lg:hidden">
          {BUILDINGS.map((b) => {
            const active = b.id === buildingId;
            const stats = getBuildingClassStats(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => selectBuilding(b.id)}
                className={`min-w-0 rounded-2xl px-2.5 py-2 text-left border transition-all ${
                  active
                    ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white border-[#C49A45]/70 shadow-sm"
                    : "bg-[var(--bg-page)] border-[var(--border-color)]"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`w-5 h-5 rounded-md font-mono text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      active
                        ? "bg-[#C49A45] text-[#0D1B2A]"
                        : "bg-[var(--bg-subtle)] text-[var(--accent)]"
                    }`}
                  >
                    {b.code}
                  </span>
                  {stats.changes > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  )}
                </div>
                <p className="text-[11px] font-semibold mt-1 truncate">
                  {lang === "ru"
                    ? b.id === "main"
                      ? "Главный"
                      : b.id === "new_wing"
                        ? "Новый"
                        : "Право и ИТ"
                    : b.id === "main"
                      ? "Main"
                      : b.id === "new_wing"
                        ? "New Wing"
                        : "Tech & Law"}
                </p>
                <p
                  className={`text-[9.5px] font-mono truncate ${
                    active ? "text-white/75" : "text-[var(--text-secondary)]"
                  }`}
                >
                  {lang === "ru" ? `${stats.total} пар` : `${stats.total} cls`}
                </p>
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-12 gap-4 items-center">
          {/* Interactive Architectural Site Blueprint */}
          <div className="lg:col-span-7 rounded-2xl bg-gradient-to-br from-[#091423] via-[#0D1B2A] to-[#122640] text-white p-2.5 sm:p-4 border border-[#C49A45]/30 relative overflow-hidden shadow-inner">
            <svg
              viewBox="0 0 640 245"
              className="w-full h-auto block select-none"
              role="img"
              aria-label={lang === "ru" ? "Архитектурная схема кампуса" : "Architectural campus blueprint"}
            >
              <defs>
                <pattern id="siteGridMinor" width="16" height="16" patternUnits="userSpaceOnUse">
                  <path
                    d="M 16 0 L 0 0 0 16"
                    fill="none"
                    stroke="rgba(148,163,184,0.06)"
                    strokeWidth="0.8"
                  />
                </pattern>
                <pattern id="siteGridMajor" width="64" height="64" patternUnits="userSpaceOnUse">
                  <rect width="64" height="64" fill="url(#siteGridMinor)" />
                  <path
                    d="M 64 0 L 0 0 0 64"
                    fill="none"
                    stroke="rgba(196,154,69,0.12)"
                    strokeWidth="1"
                  />
                </pattern>
                <radialGradient id="activeGlow" cx="50%" cy="50%" r="55%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="wingActiveGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1E5296" />
                  <stop offset="100%" stopColor="#123462" />
                </linearGradient>
                <linearGradient id="wingIdleGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#162A44" />
                  <stop offset="100%" stopColor="#101F34" />
                </linearGradient>
              </defs>

              {/* Blueprint background */}
              <rect width="640" height="245" rx="14" fill="url(#siteGridMajor)" />

              {/* Landscape Courtyard / Trees Silhouettes */}
              <ellipse cx="320" cy="176" rx="135" ry="38" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.18)" strokeWidth="1" />
              <circle cx="242" cy="174" r="10" fill="rgba(16,185,129,0.14)" />
              <circle cx="398" cy="172" r="12" fill="rgba(16,185,129,0.14)" />
              <circle cx="424" cy="186" r="8" fill="rgba(16,185,129,0.12)" />

              {/* Pedestrian Walkways */}
              <path
                d="M 96 200 C 165 182, 235 170, 320 170 C 410 170, 485 174, 544 156"
                fill="none"
                stroke="#C49A45"
                strokeOpacity="0.5"
                strokeWidth="2.5"
                strokeDasharray="6 5"
              />
              <path
                d="M 130 132 L 130 185 M 364 128 L 364 170 M 544 148 L 544 170"
                fill="none"
                stroke="rgba(196,154,69,0.4)"
                strokeWidth="2"
              />

              {/* Central Fountain / Plaza */}
              <circle cx="320" cy="170" r="24" fill="#0F233D" stroke="rgba(196,154,69,0.55)" strokeWidth="1.5" />
              <circle cx="320" cy="170" r="16" fill="none" stroke="rgba(96,165,250,0.35)" strokeWidth="1" strokeDasharray="3 3" />
              <text x="320" y="173" textAnchor="middle" fill="#FDE68A" fontSize="8.5" fontWeight="700" fontFamily="monospace">
                {lang === "ru" ? "СКВЕР" : "PLAZA"}
              </text>

              {/* Glazed Skybridge A <-> B */}
              <g>
                <rect
                  x="230"
                  y="68"
                  width="46"
                  height="22"
                  rx="4"
                  fill="rgba(56,189,248,0.22)"
                  stroke="#7DD3FC"
                  strokeWidth="1.4"
                />
                <line x1="236" y1="74" x2="270" y2="74" stroke="rgba(186,230,253,0.45)" strokeWidth="1" />
                <line x1="236" y1="84" x2="270" y2="84" stroke="rgba(186,230,253,0.45)" strokeWidth="1" />
                <text x="253" y="61" textAnchor="middle" fill="#BAE6FD" fontSize="7.5" fontWeight="700" fontFamily="monospace">
                  {lang === "ru" ? "ГАЛЕРЕЯ" : "BRIDGE"}
                </text>
              </g>

              {/* BUILDING A — MAIN */}
              <g onClick={() => selectBuilding("main")} className="cursor-pointer">
                {buildingId === "main" && <ellipse cx="130" cy="84" rx="125" ry="70" fill="url(#activeGlow)" />}
                {/* 2.5D Extruded Base Shadow */}
                <rect x="30" y="38" width="204" height="98" rx="14" fill="#050B14" opacity="0.65" />
                {/* Building Roof / Volume */}
                <rect
                  x="24"
                  y="30"
                  width="206"
                  height="98"
                  rx="14"
                  fill={buildingId === "main" ? "url(#wingActiveGrad)" : "url(#wingIdleGrad)"}
                  stroke={buildingId === "main" ? "#DFB863" : "rgba(255,255,255,0.28)"}
                  strokeWidth={buildingId === "main" ? "2.6" : "1.2"}
                />
                {/* Architectural Wing Detail */}
                <rect x="36" y="42" width="182" height="74" rx="9" fill="none" stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
                <rect x="36" y="40" width="66" height="17" rx="5" fill="#C49A45" />
                <text x="69" y="52" textAnchor="middle" fill="#0D1B2A" fontSize="9" fontWeight="800" fontFamily="monospace">
                  {lang === "ru" ? "КОРПУС A" : "WING A"}
                </text>
                <text x="38" y="75" fill="#FFFFFF" fontSize="14" fontWeight="700">
                  {lang === "ru" ? "Главный корпус" : "Main Wing"}
                </text>
                <text x="38" y="92" fill="rgba(226,232,240,0.82)" fontSize="9.5">
                  {lang === "ru" ? "Деканат 214 · Залы · Библиотека" : "Dean 214 · Moot · Library"}
                </text>
                <text x="38" y="110" fill="#93C5FD" fontSize="9" fontFamily="monospace">
                  {lang === "ru"
                    ? `● Пар по расп.: ${getBuildingClassStats("main").total}`
                    : `● Active classes: ${getBuildingClassStats("main").total}`}
                </text>
              </g>

              {/* BUILDING B — NEW WING */}
              <g onClick={() => selectBuilding("new_wing")} className="cursor-pointer">
                {buildingId === "new_wing" && <ellipse cx="364" cy="76" rx="115" ry="66" fill="url(#activeGlow)" />}
                <rect x="282" y="32" width="174" height="94" rx="14" fill="#050B14" opacity="0.65" />
                <rect
                  x="276"
                  y="24"
                  width="176"
                  height="94"
                  rx="14"
                  fill={buildingId === "new_wing" ? "url(#wingActiveGrad)" : "url(#wingIdleGrad)"}
                  stroke={buildingId === "new_wing" ? "#DFB863" : "rgba(255,255,255,0.28)"}
                  strokeWidth={buildingId === "new_wing" ? "2.6" : "1.2"}
                />
                {/* Skylight Dome Accent */}
                <circle cx="424" cy="48" r="14" fill="rgba(96,165,250,0.16)" stroke="rgba(147,197,253,0.45)" strokeWidth="1" />
                <rect x="288" y="34" width="66" height="17" rx="5" fill="#C49A45" />
                <text x="321" y="46" textAnchor="middle" fill="#0D1B2A" fontSize="9" fontWeight="800" fontFamily="monospace">
                  {lang === "ru" ? "КОРПУС B" : "WING B"}
                </text>
                <text x="290" y="69" fill="#FFFFFF" fontSize="14" fontWeight="700">
                  {lang === "ru" ? "Новый корпус" : "New Wing"}
                </text>
                <text x="290" y="86" fill="rgba(226,232,240,0.82)" fontSize="9.5">
                  {lang === "ru" ? "Зал № 4 · МФЦ · 3102–520" : "Hall #4 · Hub · 3102–520"}
                </text>
                <text x="290" y="104" fill="#FDE68A" fontSize="9" fontFamily="monospace">
                  {lang === "ru"
                    ? `★ Переносов сюда: ${getBuildingClassStats("new_wing").changes}`
                    : `★ Moved here: ${getBuildingClassStats("new_wing").changes}`}
                </text>
              </g>

              {/* BUILDING C — TECH & LAW */}
              <g onClick={() => selectBuilding("tech_hub")} className="cursor-pointer">
                {buildingId === "tech_hub" && <ellipse cx="546" cy="96" rx="100" ry="66" fill="url(#activeGlow)" />}
                <rect x="478" y="48" width="142" height="102" rx="14" fill="#050B14" opacity="0.65" />
                <rect
                  x="472"
                  y="40"
                  width="144"
                  height="102"
                  rx="14"
                  fill={buildingId === "tech_hub" ? "url(#wingActiveGrad)" : "url(#wingIdleGrad)"}
                  stroke={buildingId === "tech_hub" ? "#DFB863" : "rgba(255,255,255,0.28)"}
                  strokeWidth={buildingId === "tech_hub" ? "2.6" : "1.2"}
                />
                <rect x="484" y="50" width="66" height="17" rx="5" fill="#C49A45" />
                <text x="517" y="62" textAnchor="middle" fill="#0D1B2A" fontSize="9" fontWeight="800" fontFamily="monospace">
                  {lang === "ru" ? "КОРПУС C" : "WING C"}
                </text>
                <text x="486" y="85" fill="#FFFFFF" fontSize="13.5" fontWeight="700">
                  {lang === "ru" ? "Право и ИТ" : "Tech & Law"}
                </text>
                <text x="486" y="102" fill="rgba(226,232,240,0.82)" fontSize="9.5">
                  {lang === "ru" ? "Лаб. 501 · 114 · 301" : "Lab 501 · 114 · 301"}
                </text>
                <text x="486" y="122" fill="#93C5FD" fontSize="9" fontFamily="monospace">
                  {lang === "ru"
                    ? `● Пар: ${getBuildingClassStats("tech_hub").total}`
                    : `● Classes: ${getBuildingClassStats("tech_hub").total}`}
                </text>
              </g>

              {/* Main Gate Marker */}
              <rect x="24" y="192" width="156" height="34" rx="9" fill="rgba(196,154,69,0.18)" stroke="#C49A45" strokeWidth="1.2" />
              <circle cx="40" cy="209" r="4" fill="#34D399" />
              <text x="108" y="213" textAnchor="middle" fill="#FDE68A" fontSize="9.5" fontWeight="700">
                {lang === "ru" ? "КПП · Проспект / Метро" : "MAIN GATE · Metro Walk"}
              </text>

              {/* Compass Rose */}
              <g transform="translate(598, 206)">
                <circle r="18" fill="rgba(255,255,255,0.04)" stroke="rgba(196,154,69,0.4)" strokeWidth="1" />
                <polygon points="0,-13 3.5,-3 0,-5 -3.5,-3" fill="#DFB863" />
                <text y="10" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8" fontFamily="monospace">
                  N
                </text>
              </g>
            </svg>
          </div>

          {/* Desktop 3-Building Cards */}
          <div className="hidden lg:grid lg:col-span-5 gap-2.5">
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
                      ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white border-[#C49A45]/70 shadow-md"
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
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-200 font-semibold">
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

      {/* SECTION 2: ANIMATED FLOOR BLUEPRINT + INSPECTOR */}
      <div className="grid lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        <div className="stagger-item lg:col-span-7 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-3.5 sm:p-5 shadow-sm space-y-3.5 min-w-0">
          {/* Building Floor Header + Floor Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2 truncate">
                <Layers className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span className="truncate">
                  {lang === "ru" ? activeBuilding.name : activeBuilding.nameEn} ·{" "}
                  {floorLabel(activeBuilding, floor)}
                </span>
              </h2>
            </div>

            <div className="inline-flex rounded-xl bg-[var(--bg-page)] border border-[var(--border-color)] p-1 shrink-0">
              {activeBuilding.floors.map((fl) => (
                <button
                  key={fl}
                  type="button"
                  onClick={() => selectFloor(fl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    floor === fl
                      ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {floorLabel(activeBuilding, fl)}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Chips + Route Toggle (Clean wrap, zero clipping) */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", ru: "Все", en: "All" },
                  { id: "auditorium", ru: "Аудитории", en: "Rooms" },
                  { id: "hall", ru: "Залы", en: "Halls" },
                  { id: "service", ru: "Сервисы", en: "Services" },
                  { id: "my_classes", ru: "Мои пары", en: "Classes" },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(cat.id);
                    const nextMatch = allFloorRooms.find((r) => {
                      if (cat.id === "my_classes") {
                        return schedule.some((s) => roomMatchesSchedule(r, s));
                      }
                      if (cat.id !== "all") return r.category === cat.id;
                      return true;
                    });
                    if (nextMatch) setSelectedRoomId(nextMatch.id);
                  }}
                  className={`whitespace-nowrap px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-colors ${
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors shrink-0 ${
                showRoute
                  ? "bg-amber-500/15 border-amber-500/45 text-amber-800 dark:text-amber-200"
                  : "bg-[var(--bg-page)] border-[var(--border-color)] text-[var(--text-secondary)]"
              }`}
            >
              <Navigation className="w-3 h-3 text-[#C49A45]" />
              {lang === "ru" ? "Маршрут" : "Route"}
            </button>
          </div>

          {/* Animated SVG Architectural Floor Blueprint */}
          <div
            ref={floorStageRef}
            className="rounded-2xl bg-[var(--bg-page)] border border-[var(--border-color)] p-2 sm:p-3 overflow-hidden"
          >
            <svg
              viewBox="0 0 720 360"
              className="w-full h-auto block select-none"
              role="img"
              aria-label={lang === "ru" ? "Поэтажный архитектурный чертёж" : "Architectural floor blueprint"}
            >
              <defs>
                <pattern id="floorBlueprintGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.045"
                    strokeWidth="0.8"
                  />
                </pattern>
                <pattern id="stairHatch" width="6" height="6" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="3" x2="6" y2="3" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" />
                </pattern>
              </defs>

              <rect x="18" y="14" width="684" height="332" rx="18" fill="url(#floorBlueprintGrid)" />

              {/* Outer Thick Masonry Walls */}
              <rect
                x="18"
                y="14"
                width="684"
                height="332"
                rx="18"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.24"
                strokeWidth="3"
              />
              {/* Perimeter Window Mullions */}
              <line x1="80" y1="14" x2="180" y2="14" stroke="#60A5FA" strokeOpacity="0.55" strokeWidth="4" />
              <line x1="290" y1="14" x2="430" y2="14" stroke="#60A5FA" strokeOpacity="0.55" strokeWidth="4" />
              <line x1="520" y1="14" x2="640" y2="14" stroke="#60A5FA" strokeOpacity="0.55" strokeWidth="4" />

              {/* Structural Columns */}
              {[38, 240, 442, 682].map((cx) => (
                <g key={cx}>
                  <rect x={cx - 4} y="152" width="8" height="8" rx="1.5" fill="currentColor" fillOpacity="0.28" />
                  <rect x={cx - 4} y="200" width="8" height="8" rx="1.5" fill="currentColor" fillOpacity="0.28" />
                </g>
              ))}

              {/* Central Corridor */}
              <rect
                x="34"
                y="156"
                width="652"
                height="48"
                rx="10"
                fill="currentColor"
                fillOpacity="0.045"
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
                {lang === "ru" ? "ЦЕНТРАЛЬНАЯ ГАЛЕРЕЯ" : "CENTRAL CORRIDOR"}
              </text>

              {/* Left Stairwell Hatch */}
              <g>
                <rect x="292" y="228" width="44" height="58" rx="8" fill="url(#stairHatch)" stroke="currentColor" strokeOpacity="0.22" />
                <text x="314" y="298" textAnchor="middle" fill="currentColor" fillOpacity="0.45" fontSize="8.5" fontFamily="monospace">
                  {lang === "ru" ? "ЛЕСТН." : "STAIRS"}
                </text>
              </g>

              {/* Right Elevator Shaft */}
              <g>
                <rect x="384" y="228" width="44" height="58" rx="8" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.22" />
                <line x1="390" y1="234" x2="422" y2="280" stroke="currentColor" strokeOpacity="0.18" />
                <line x1="422" y1="234" x2="390" y2="280" stroke="currentColor" strokeOpacity="0.18" />
                <text x="406" y="298" textAnchor="middle" fill="currentColor" fillOpacity="0.45" fontSize="8.5" fontFamily="monospace">
                  {lang === "ru" ? "ЛИФТ" : "LIFT"}
                </text>
              </g>

              {/* Entrance / Lobby Marker */}
              <rect
                x="298"
                y="306"
                width="124"
                height="30"
                rx="8"
                fill="#0D1B2A"
                stroke="#C49A45"
                strokeWidth="1.6"
              />
              <text
                x="360"
                y="325"
                textAnchor="middle"
                fill="#FDE68A"
                fontSize="10"
                fontWeight="700"
                fontFamily="monospace"
              >
                {lang === "ru" ? "ВХОД / ХОЛЛ" : "LOBBY / ENTRY"}
              </text>

              {/* Interactive Rooms (all rooms shown cleanly; filtered-out ones dim softly) */}
              {allFloorRooms.map((room) => {
                const isSelected = selectedRoom?.id === room.id;
                const isMatched = roomMatchesFilter(room);
                const liveClasses = schedule.filter((s) => roomMatchesSchedule(room, s));
                const hasChange = liveClasses.some((s) => s.status !== "normal");
                const doorX = room.destPoint.x;
                const doorY = room.doorSide === "bottom" ? room.rect.y + room.rect.h : room.rect.y;
                const arcSweep = room.doorSide === "bottom" ? 1 : 0;

                return (
                  <g
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    style={{ opacity: isMatched || isSelected ? 1 : 0.28 }}
                    className="map-room-node cursor-pointer transition-opacity duration-200"
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
                              ? "rgba(196, 154, 69, 0.12)"
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

                    {/* Subtle Architectural Interior Motif */}
                    {renderRoomMotif(room, isSelected)}

                    {/* Architectural Door Swing Arc */}
                    <path
                      d={`M ${doorX - 10} ${doorY} A 10 10 0 0 ${arcSweep} ${doorX} ${
                        room.doorSide === "bottom" ? doorY - 10 : doorY + 10
                      }`}
                      fill="none"
                      stroke={isSelected ? "#FDE68A" : "currentColor"}
                      strokeOpacity={isSelected ? "0.8" : "0.28"}
                      strokeWidth="1.4"
                    />

                    <text
                      x={room.rect.x + 14}
                      y={room.rect.y + 28}
                      fill={isSelected ? "#FDE68A" : "var(--accent)"}
                      fontSize="11.5"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {categoryLabel(room.category)}
                    </text>
                    <text
                      x={room.rect.x + 14}
                      y={room.rect.y + 52}
                      fill={isSelected ? "#FFFFFF" : "var(--text-primary)"}
                      fontSize="16"
                      fontWeight="700"
                    >
                      {lang === "ru" ? room.code : room.codeEn}
                    </text>
                    <text
                      x={room.rect.x + 14}
                      y={room.rect.y + 73}
                      fill={isSelected ? "rgba(255,255,255,0.82)" : "var(--text-secondary)"}
                      fontSize="11"
                    >
                      {lang === "ru" ? room.capacity : room.capacityEn}
                    </text>

                    {liveClasses.length > 0 && (
                      <g>
                        <rect
                          x={room.rect.x + 14}
                          y={room.rect.y + 83}
                          width={120}
                          height="18"
                          rx="6"
                          fill={hasChange ? "#D97706" : "#0D1B2A"}
                        />
                        <text
                          x={room.rect.x + 22}
                          y={room.rect.y + 95}
                          fill="#FFFFFF"
                          fontSize="9.5"
                          fontWeight="700"
                        >
                          {hasChange
                            ? lang === "ru"
                              ? `Перенос · ${liveClasses.length}`
                              : `Moved · ${liveClasses.length}`
                            : lang === "ru"
                              ? `По расп.: ${liveClasses.length}`
                              : `Classes: ${liveClasses.length}`}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Animated SVG Wayfinding Route */}
              {showRoute &&
                selectedRoom &&
                selectedRoom.buildingId === buildingId &&
                selectedRoom.floor === floor && (
                  <g>
                    <polyline
                      ref={routePathRef}
                      points={selectedRoom.pathPoints}
                      fill="none"
                      stroke="#C49A45"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="8 6"
                    />
                    <circle
                      ref={routeBeaconRef}
                      cx={selectedRoom.destPoint.x}
                      cy={selectedRoom.destPoint.y}
                      r="6"
                      fill="#C49A45"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  </g>
                )}
            </svg>
          </div>

          {/* Quick Touch Directory Chips */}
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
                    className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      active
                        ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white border-transparent shadow-sm"
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

        {/* Selected Space Inspector */}
        <div
          ref={inspectorRef}
          className="stagger-item lg:col-span-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-5 shadow-sm space-y-4 min-w-0"
        >
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

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-2xl bg-[var(--bg-page)] border border-[var(--border-color)] p-3">
              <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                {lang === "ru" ? "Вместимость" : "Capacity"}
              </p>
              <p className="font-semibold mt-1 truncate">
                {lang === "ru" ? selectedRoom.capacity : selectedRoom.capacityEn}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--bg-page)] border border-[var(--border-color)] p-3">
              <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                <Accessibility className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {lang === "ru" ? "Доступ" : "Access"}
              </p>
              <p className="font-semibold mt-1 truncate">
                {lang === "ru" ? "Лифт и пандус" : "Step-free & Lift"}
              </p>
            </div>
          </div>

          {/* Walking Route Hint */}
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3.5 text-xs space-y-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#C49A45] shrink-0" />
              {lang === "ru" ? "Как пройти от входа" : "Walking Directions"}
            </p>
            <p className="text-amber-950/85 dark:text-amber-100/90 leading-relaxed">
              {lang === "ru" ? selectedRoom.routeHint : selectedRoom.routeHintEn}
            </p>
          </div>

          {/* Equipment */}
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-[var(--accent)]" />
              {lang === "ru" ? "Оснащение" : "Equipment"}
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
                ? "Занятия в этой аудитории"
                : "Classes in This Space"}
            </p>

            {selectedRoomClasses.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">
                {selectedRoom.id === "main-214"
                  ? lang === "ru"
                    ? "Кабинет 214 — выдача бумажных справок и консультации деканата."
                    : "Room 214 handles paper certificate pickups and Dean advising."
                  : lang === "ru"
                    ? "В вашем текущем расписании здесь нет закреплённых пар."
                    : "No scheduled classes for your active timetable in this space."}
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
