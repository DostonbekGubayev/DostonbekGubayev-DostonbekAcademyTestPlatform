
export interface SubjectStructure {
  sections: {
    name: string;
    topics: string[];
  }[];
}

export const SUBJECTS_DATA: Record<string, SubjectStructure> = {
  "Ingliz tili": {
    sections: [
      {
        name: "Grammatika",
        topics: ["Verb Tenses", "Articles & Nouns", "Conditionals", "Passive Voice", "Relative Clauses"]
      },
      {
        name: "Vocabulary",
        topics: ["IELTS Essential Words", "Phrasal Verbs", "Idioms", "Business English", "Daily Words", "Collocations"]
      },
      {
        name: "Zamonlar",
        topics: ["Present Simple", "Present Continuous","Present Perfect", "Past Simple","Past Continuous","Past Perfect", "Future Simple","Future Continuous","Future Perfect"]
      }
    ]
  },
  "Biologiya": {
    sections: [
      {
        name: "Botanika",
        topics: ["O'simliklar hujayrasi", "Gulli o'simliklar", "Fotosintez jarayoni", "O'simliklar sistematikasi"]
      },
      {
        name: "Zoologiya",
        topics: ["Umurtqasiz hayvonlar", "Sutemizuvchilar", "Hasharotlar dunyosi", "Hayvonlar ekologiyasi", "Bo'g'im oyoqlilar", "Sudralib yuruvchilar"]
      },
      {
        name: "Odam Anatomiyasi",
        topics: ["Skelet va mushak tizimi", "Qon aylanishi", "Asab tizimi", "Ovqat hazm qilish", "Odamning umumiy tuzilishi"]
      }
    ]
  },
  "Matematika": {
    sections: [
      {
        name: "Algebra",
        topics: ["Chiziqli Tenglamalar", "Kvadrat Tenglamalar", "Tengsizliklar", "Ildizlar", "Funksiyalar", "Logarifm", "Soni ketma-ketliklar", "Triganometrik tenglamalar"]
      },
      {
        name: "Geometriya",
        topics: ["Planimetriya", "Stereometriya", "Vektorlar", "Trigonometriya", "Aylana va doira"]
      }
    ]
  },
  "Kimyo": {
    sections: [
      {
        name: "Organik Kimyo",
        topics: ["Alkanlar", "Alkenlar va Alkinlar", "Spirtlar", "Karbon kislotalar", "Uglevodlar"]
      },
      {
        name: "Anorganik Kimyo",
        topics: ["Metallar va nometallar", "Oksidlar", "Kislota va tuzlar", "Davriy jadval xossalari"]
      },
      {
        name: "Umumiy Kimyo",
        topics: ["Atom tuzilishi", "Kimyoviy bog'lanish", "Reaksiya tezligi", "Eritmalar"]
      }
    ]
  },
  "Fizika": {
    sections: [
      {
        name: "Mexanika",
        topics: ["Kinematika", "Dinamika", "Statika", "Ish va Energiya", "Suyuqliklar mexanikasi"]
      },
      {
        name: "Termodinamika",
        topics: ["Molekulyar-kinetik nazariya", "Issiqlik miqdori", "Termodinamika qonunlari"]
      },
      {
        name: "Elektr",
        topics: ["Elektrostatika", "O'zgarmas tok qonunlari", "Magnetizm", "Elektromagnit induksiya"]
      }
    ]
  },
  "Tarix": {
    sections: [
      {
        name: "O'zbekiston tarixi",
        topics: ["Qadimgi davlatlar", "Amir Temur va Temuriylar", "Xonliklar davri", "Mustabid tuzum davri", "Mustaqillik yillari"]
      },
      {
        name: "Jahon tarixi",
        topics: ["Qadimgi dunyo", "O'rta asrlar tarixi", "Yangi davr tarixi", "Eng yangi tarix (XX-XXI asr)"]
      }
    ]
  },
  "Ona tili va Adabiyot": {
    sections: [
      {
        name: "Ona tili",
        topics: ["Fonetika va Leksikologiya", "Morfologiya (So'z turkumlari)", "Sintaksis (Gap bo'laklari)", "Punktuatsiya va Orfografiya"]
      },
      {
        name: "Adabiyot",
        topics: ["Mumtoz adabiyot (Navoiy, Bobur)", "XIX-XX asr o'zbek adabiyoti", "Mustaqillik davri adabiyoti", "Jahon adabiyoti namoyandalari"]
      }
    ]
  },
  "Rus tili": {
    sections: [
      {
        name: "Грамматика",
        topics: ["Падежи (Келишиklar)", "Глаголы и времена", "Имя прилагательное", "Местоимения"]
      },
      {
        name: "Лексика",
        topics: ["Разговорные фразы", "Деловой русский язык", "Литература и культура"]
      }
    ]
  },
  "Koreys tili": {
    sections: [
      {
        name: "TOPIK I (Boshlang'ich)",
        topics: ["Koreys alifbosi (Hangul)", "Boshlang'ich grammatika", "Kundalik so'zlashuv", "Soni va vaqt"]
      },
      {
        name: "TOPIK II (O'rta)",
        topics: ["Murakkab grammatik shakllar", "Rasmiy va norasmiy uslub", "Koreys madaniyati va odoblari"]
      }
    ]
  },
  "Nemis tili": {
    sections: [
      {
        name: "Grammatik",
        topics: ["Artikel und Nomen", "Verben und Konjugation", "Die vier Kasus (Dativ/Akkusativ)", "Satzbau"]
      },
      {
        name: "Wortschatz",
        topics: ["Alltagsdeutsch", "Beruf und Arbeit", "Reisen und Kultur"]
      }
    ]
  }
};
