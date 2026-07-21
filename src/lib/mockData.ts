export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  hasAttachment?: boolean;
  requiresAttachment?: boolean;
}

export interface Worker {
  id: string;
  name: string;
  avatar: string;
  role: string;
  currentTask: string;
  location?: string;
  status: 'v_teku' | 'zakasnitev' | 'koncano';
  tasks: TaskItem[];
  phone: string;
  email: string;
  unreadCount?: number;
}

export interface Order {
  id: string;
  title: string;
  description: string;
  time: string;
  createdAt: string;
  priority: 'normalna' | 'danes' | 'visoka' | 'nujno';
  status: 'caka_potrditev' | 'potrjeno' | 'zavrnjeno';
  workerId: string;
  workerName: string;
}

export interface Message {
  id: string;
  workerId: string;
  workerName: string;
  text: string;
  time: string;
  type: 'glasovno' | 'tekst';
  targetTask?: string;
}

export const initialWorkers: Worker[] = [
  {
    id: "w1",
    name: "Anthony H",
    avatar: "AH",
    role: "Novak d.o.o.",
    currentTask: "Kopalnica prenova",
    status: "v_teku",
    phone: "+386 40 123 456",
    email: "anthony.hopkins@dnevnik.app",
    unreadCount: 1,
    location: "Ljubljana",
    tasks: [
      { id: "t1_1", text: "Odvoz materiala - Stane", completed: true, completedAt: "10:34", hasAttachment: true },
      { id: "t1_2", text: "Začetek del", completed: true, completedAt: "08:20" },
      { id: "t1_3", text: "Odstranjevanje elementov", completed: true, completedAt: "09:10" },
      { id: "t1_4", text: "Odvoz odpadkov", completed: true, completedAt: "09:55" },
      { id: "t1_5", text: "Dostava ploščic - Adam", completed: false, requiresAttachment: true },
      { id: "t1_6", text: "Polaganje ploščic", completed: false },
      { id: "t1_7", text: "Menjava umivalnika, kadi", completed: false },
      { id: "t1_8", text: "Dnevno poročilo", completed: false, requiresAttachment: true }
    ]
  },
  {
    id: "w2",
    name: "ANA NOVAK",
    avatar: "AN",
    role: "JGD d.o.o.",
    currentTask: "Čiščenje prostorov",
    status: "zakasnitev",
    phone: "+386 31 987 654",
    email: "alec.navarro@dnevnik.app",
    unreadCount: 0,
    location: "Ljubljana",
    tasks: [
      { id: "t2_1", text: "Čiščenje tal", completed: true, completedAt: "10:51", hasAttachment: true },
      { id: "t2_2", text: "Čiščenje oken", completed: true, completedAt: "09:00" },
      { id: "t2_3", text: "Čiščenje kopalnic", completed: true, completedAt: "09:45" },
      { id: "t2_4", text: "Čiščenje kuhinje", completed: true, completedAt: "10:20" },
      { id: "t2_5", text: "Dnevno poročilo", completed: false }
    ]
  },
  {
    id: "w3",
    name: "PAVLE",
    avatar: "BD",
    role: "FxG d.o.o.",
    currentTask: "Dostava cvetja",
    status: "v_teku",
    phone: "+386 41 555 666",
    email: "bo.derek@dnevnik.app",
    unreadCount: 0,
    location: "Celje",
    tasks: [
      { id: "t3_1", text: "Prevzem cvetja", completed: true, completedAt: "08:00" },
      { id: "t3_2", text: "Dostava", completed: false },
      { id: "t3_3", text: "Potrdilo o dostavi", completed: false, hasAttachment: true },
      { id: "t3_4", text: "Dnevno poročilo", completed: false }
    ]
  }
];

export const initialOrders: Order[] = [
  {
    id: "o1",
    title: "Pokliči Maksa za rezervacijo",
    description: "Danes je zadnji dan. ",
    time: "10:30",
    createdAt: "09:02",
    priority: "nujno",
    status: "caka_potrditev",
    workerId: "w1",
    workerName: "LIAM"
  },
  {
    id: "o2",
    title: "Podpiši izvozne dokumente",
    description: "",
    time: "12:00",
    createdAt: "11:34",
    priority: "visoka",
    status: "caka_potrditev",
    workerId: "w2",
    workerName: "SIMON"
  },
  {
    id: "o3",
    title: "Kosilo s Kristino",
    description: "",
    time: "13:30",
    createdAt: "11:38",
    priority: "danes",
    status: "caka_potrditev",
    workerId: "w3",
    workerName: "ADAM"
  }
];


export const initialMessages: Message[] = [
  {
    id: "m1",
    workerId: "w1",
    workerName: "ANA NOVAK",
    text: "Stranke ni bilo na naslovu. Začenjam pol ure kasneje.  ",
    time: "09:18",
    type: "glasovno",
    targetTask: "Čiščenje prostorov"
  },
  {
    id: "m2",
    workerId: "w2",
    workerName: "ANTHONY H",
    text: "Prometna nesreča pri Celju. Zaprta cesta do 13:30.",
    time: "10:53",
    type: "glasovno",
    targetTask: "Kopalnica prenova"
  },
  {
    id: "m3",
    workerId: "w3",
    workerName: "ALEKS",
    text: "Preveri dokumente za Graz. Pokliči Ano.",
    time: "11:02",
    type: "glasovno",
    targetTask: "Popravilo dvigala"
  },
  {
    id: "m4",
    workerId: "w1",
    workerName: "Matej Horvat",
    text: "Fotografija bo narejena ob koncu — baterija pri 20%.",
    time: "10:45",
    type: "tekst",
    targetTask: "BTC · Košnja trave"
  }
];
